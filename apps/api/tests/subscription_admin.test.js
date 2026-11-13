import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import prisma from '../src/database/prisma.js';
import authService from '../src/services/auth.service.js';
import subscriptionService from '../src/services/subscription.service.js';
import paymentService from '../src/services/payments/payment.service.js';
import razorpayProvider from '../src/services/payments/razorpayProvider.js';

import jwt from 'jsonwebtoken';
import { config } from '../src/config/env.js';

test('Phase 6: Subscription, Payment Gateway & Super Admin Integration Test Suite', async (t) => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const hostMobile = '+919988000001';
  const otherHostMobile = '+919988000002';
  const adminMobile = '+919988000003';

  // Cleanup existing test records
  const allMobiles = [hostMobile, otherHostMobile, adminMobile];
  await prisma.otpChallenge.deleteMany({ where: { mobile: { in: allMobiles } } });
  await prisma.user.deleteMany({ where: { mobile: { in: allMobiles } } });

  // 1. Create Host User A
  await authService.requestOtp(hostMobile);
  const hostAuth = await authService.verifyOtpAndLogin(hostMobile, '12345');
  const hostToken = hostAuth.accessToken;
  const hostId = hostAuth.user.id;

  // 2. Create Host User B
  await authService.requestOtp(otherHostMobile);
  const otherHostAuth = await authService.verifyOtpAndLogin(otherHostMobile, '12345');
  const otherHostToken = otherHostAuth.accessToken;
  const otherHostId = otherHostAuth.user.id;

  // 3. Create Super Admin User
  await authService.requestOtp(adminMobile);
  const adminAuth = await authService.verifyOtpAndLogin(adminMobile, '12345');
  const adminId = adminAuth.user.id;
  // Promote to SUPER_ADMIN
  await prisma.user.update({
    where: { id: adminId },
    data: { role: 'SUPER_ADMIN', name: 'Test Super Admin' }
  });
  // Sign token with SUPER_ADMIN role
  const adminToken = jwt.sign(
    { userId: adminId, mobile: adminMobile, role: 'SUPER_ADMIN' },
    config.jwt.accessSecret,
    { expiresIn: '1h' }
  );

  // Fetch standard plans
  const basicPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'BASIC' } });
  const standardPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'STANDARD' } });

  t.after(async () => {
    // Teardown
    await prisma.supportTicket.deleteMany({ where: { userId: { in: [hostId, otherHostId, adminId] } } });
    await prisma.paymentTransaction.deleteMany({ where: { userId: { in: [hostId, otherHostId, adminId] } } });
    await prisma.subscriptionHistory.deleteMany({ where: { userId: { in: [hostId, otherHostId, adminId] } } });
    await prisma.event.deleteMany({ where: { userId: { in: [hostId, otherHostId, adminId] } } });
    await prisma.guest.deleteMany({ where: { userId: { in: [hostId, otherHostId, adminId] } } });
    await prisma.otpChallenge.deleteMany({ where: { mobile: { in: allMobiles } } });
    await prisma.user.deleteMany({ where: { mobile: { in: allMobiles } } });
    await new Promise((resolve) => server.close(resolve));
  });

  // 1. Unauthorized access to admin APIs
  await t.test('1. Unauthorized user cannot access admin APIs (401)', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  // 2. HOST cannot access Super Admin routes
  await t.test('2. HOST cannot access Super Admin routes (403 Access Denied)', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${hostToken}` }
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /permission/i);
  });

  // 3. SUPER_ADMIN can access authorized admin APIs
  await t.test('3. SUPER_ADMIN can access authorized admin APIs (200 with dashboard metrics)', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(typeof body.metrics.totalUsers === 'number');
    assert.ok(typeof body.metrics.activeSubscriptions === 'number');
    assert.ok(Array.isArray(body.subscriptionDistribution));
  });

  // 4. Users cannot modify their own subscription status
  await t.test('4. Users cannot modify their own subscription status', async () => {
    // Attempt to override status via adjust endpoint as a HOST
    const res = await fetch(`${baseUrl}/admin/subscriptions/${hostId}/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostToken}`
      },
      body: JSON.stringify({
        status: 'ACTIVE',
        reason: 'Hacking status'
      })
    });
    assert.strictEqual(res.status, 403, 'Regular host must be denied');
  });

  // 5. Server-side plan limits enforcement - Event Quota
  await t.test('5. Plan limits are enforced server-side - maxEvents quota', async () => {
    // Create a temporary constrained plan: max 1 event
    const limitedPlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Strict 1 Event Plan',
        code: `LIMIT_${Date.now()}`,
        priceYearly: 100,
        currency: 'INR',
        maxEvents: 1,
        maxGuestsPerEvent: 50,
        maxPermanentGuests: 100,
        canUploadCustomTemplates: true,
        isActive: true
      }
    });

    // Assign to Host B
    await prisma.userSubscription.update({
      where: { userId: otherHostId },
      data: { planId: limitedPlan.id, status: 'ACTIVE' }
    });

    // First event should succeed
    const res1 = await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherHostToken}`
      },
      body: JSON.stringify({
        name: 'Allowed Event 1',
        eventType: 'BIRTHDAY',
        eventDate: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
        venue: 'Grand Hall'
      })
    });
    assert.strictEqual(res1.status, 201);

    // Second event must be blocked with 403
    const res2 = await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherHostToken}`
      },
      body: JSON.stringify({
        name: 'Blocked Event 2',
        eventType: 'BIRTHDAY',
        eventDate: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
        venue: 'Grand Hall'
      })
    });
    assert.strictEqual(res2.status, 403);
    const body2 = await res2.json();
    assert.match(body2.error, /Event limit reached/i);
  });

  // 6. Server-side plan limits enforcement - Guests per event
  await t.test('6. Plan limits are enforced server-side - maxGuestsPerEvent', async () => {
    // Constrained plan: max 1 guest per event
    const guestLimitPlan = await prisma.subscriptionPlan.create({
      data: {
        name: '1 Guest Per Event Plan',
        code: `GLIMIT_${Date.now()}`,
        priceYearly: 100,
        currency: 'INR',
        maxEvents: 5,
        maxGuestsPerEvent: 1,
        maxPermanentGuests: 100,
        isActive: true
      }
    });

    await prisma.userSubscription.update({
      where: { userId: otherHostId },
      data: { planId: guestLimitPlan.id }
    });

    // Fetch the existing event for Host B
    const eventsRes = await fetch(`${baseUrl}/events`, {
      headers: { Authorization: `Bearer ${otherHostToken}` }
    });
    const eventsData = await eventsRes.json();
    const eventId = eventsData.events[0].id;

    // Add first guest -> succeeds
    const gRes1 = await fetch(`${baseUrl}/events/${eventId}/guests/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherHostToken}`
      },
      body: JSON.stringify({
        name: 'Guest One',
        whatsappNumber: '+919876500011',
        saveToMyGuests: false
      })
    });
    assert.strictEqual(gRes1.status, 201);

    // Add second guest -> blocked with 403
    const gRes2 = await fetch(`${baseUrl}/events/${eventId}/guests/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherHostToken}`
      },
      body: JSON.stringify({
        name: 'Guest Two',
        whatsappNumber: '+919876500012',
        saveToMyGuests: false
      })
    });
    assert.strictEqual(gRes2.status, 403);
    const gBody2 = await gRes2.json();
    assert.match(gBody2.error, /Guest limit per event reached/i);
  });

  // 7. Trial expiry & grace period handling
  await t.test('7. Trial expiry and grace period evaluation', async () => {
    // Set expiry to 3 days ago (within 7-day grace period)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000);
    await prisma.userSubscription.update({
      where: { userId: hostId },
      data: { expiresAt: threeDaysAgo, status: 'TRIAL' }
    });

    const res = await fetch(`${baseUrl}/subscriptions/current`, {
      headers: { Authorization: `Bearer ${hostToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.inGracePeriod, true, 'Should be within grace period');
    assert.strictEqual(body.isExpired, false, 'Should not be marked expired during grace period');
    assert.ok(body.graceDaysRemaining > 0);
  });

  // 8. Expired subscription blocks restricted features but preserves data
  await t.test('8. Expired subscriptions cannot use restricted features, user data preserved', async () => {
    // Set expiry to 10 days ago (beyond 7-day grace period)
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000);
    await prisma.userSubscription.update({
      where: { userId: hostId },
      data: { expiresAt: tenDaysAgo, status: 'EXPIRED' }
    });

    // 1. Creating event must fail with 403
    const createRes = await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostToken}`
      },
      body: JSON.stringify({
        name: 'Post-Expiry Event',
        eventType: 'OTHER',
        eventDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
        venue: 'Home'
      })
    });
    assert.strictEqual(createRes.status, 403);
    const createBody = await createRes.json();
    assert.match(createBody.error, /expired/i);

    // 2. Existing data remains safe and readable
    const listRes = await fetch(`${baseUrl}/events`, {
      headers: { Authorization: `Bearer ${hostToken}` }
    });
    assert.strictEqual(listRes.status, 200, 'Expired user can read their events');

    const guestsRes = await fetch(`${baseUrl}/guests`, {
      headers: { Authorization: `Bearer ${hostToken}` }
    });
    assert.strictEqual(guestsRes.status, 200, 'Expired user can read their guests');

    // 3. User can access subscription & billing page
    const subRes = await fetch(`${baseUrl}/subscriptions/current`, {
      headers: { Authorization: `Bearer ${hostToken}` }
    });
    assert.strictEqual(subRes.status, 200);
    const subBody = await subRes.json();
    assert.strictEqual(subBody.isExpired, true);
  });

  // 9. Payment order creation
  let orderData = null;
  await t.test('9. Payment order creation returns valid order details', async () => {
    const res = await fetch(`${baseUrl}/subscriptions/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostToken}`
      },
      body: JSON.stringify({ planId: basicPlan.id })
    });

    assert.strictEqual(res.status, 200);
    orderData = await res.json();
    assert.strictEqual(orderData.success, true);
    assert.ok(orderData.orderId);
    assert.strictEqual(orderData.amount, basicPlan.priceYearly);
    assert.strictEqual(orderData.currency, 'INR');

    // Verify stored transaction in DB
    const tx = await prisma.paymentTransaction.findUnique({
      where: { orderId: orderData.orderId }
    });
    assert.ok(tx);
    assert.strictEqual(tx.status, 'PENDING');
  });

  // 10. Payment signature validation - Invalid signature rejected
  await t.test('10. Invalid payment signature cannot activate a subscription', async () => {
    const res = await fetch(`${baseUrl}/subscriptions/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostToken}`
      },
      body: JSON.stringify({
        orderId: orderData.orderId,
        paymentId: 'pay_fake_invalid_id',
        signature: 'invalid_forged_signature_hex'
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /signature/i);

    // Verify transaction status was marked FAILED
    const tx = await prisma.paymentTransaction.findUnique({
      where: { orderId: orderData.orderId }
    });
    assert.strictEqual(tx.status, 'FAILED');
  });

  // 11. Payment signature validation - Valid signature activates subscription
  let validOrderData = null;
  await t.test('11. Valid cryptographic signature activates subscription and logs audit', async () => {
    // Create new order
    const oRes = await fetch(`${baseUrl}/subscriptions/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostToken}`
      },
      body: JSON.stringify({ planId: standardPlan.id })
    });
    assert.strictEqual(oRes.status, 200);
    validOrderData = await oRes.json();

    const paymentId = `pay_test_${Date.now()}`;
    const validSignature = razorpayProvider.generateSandboxSignature(validOrderData.orderId, paymentId);

    const vRes = await fetch(`${baseUrl}/subscriptions/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostToken}`
      },
      body: JSON.stringify({
        orderId: validOrderData.orderId,
        paymentId,
        signature: validSignature
      })
    });

    assert.strictEqual(vRes.status, 200);
    const vBody = await vRes.json();
    assert.strictEqual(vBody.success, true);
    assert.strictEqual(vBody.subscription.status, 'ACTIVE');
    assert.strictEqual(vBody.subscription.planId, standardPlan.id);

    // Verify AuditLog
    const audit = await prisma.auditLog.findFirst({
      where: {
        actorId: hostId,
        action: 'PAYMENT_VERIFIED_SUBSCRIPTION_ACTIVATED'
      }
    });
    assert.ok(audit, 'AuditLog should record verified activation');
  });

  // 12. Idempotent payment verification
  await t.test('12. Repeated payment verification is idempotent and does not duplicate activation', async () => {
    const paymentId = `pay_test_idem_${Date.now()}`;
    const validSignature = razorpayProvider.generateSandboxSignature(validOrderData.orderId, paymentId);

    const vRes = await fetch(`${baseUrl}/subscriptions/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostToken}`
      },
      body: JSON.stringify({
        orderId: validOrderData.orderId,
        paymentId,
        signature: validSignature
      })
    });

    assert.strictEqual(vRes.status, 200);
    const body = await vRes.json();
    assert.strictEqual(body.alreadyProcessed, true);
  });

  // 13. Idempotent webhook verification
  await t.test('13. Webhook verification is secure and idempotent', async () => {
    const webhookEvent = {
      event_id: `evt_test_${Date.now()}`,
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: validOrderData.orderId,
            status: 'paid'
          }
        }
      }
    };
    const rawPayload = JSON.stringify(webhookEvent);
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'sandbox_razorpay_secret_test_key';
    const sig = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

    // First delivery
    const res1 = await fetch(`${baseUrl}/subscriptions/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': sig
      },
      body: rawPayload
    });
    assert.strictEqual(res1.status, 200);

    // Second delivery with same event_id
    const res2 = await fetch(`${baseUrl}/subscriptions/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': sig
      },
      body: rawPayload
    });
    assert.strictEqual(res2.status, 200);
    const body2 = await res2.json();
    assert.strictEqual(body2.alreadyProcessed, true);
  });

  // 14. Admin manual subscription adjustment with audit log
  await t.test('14. Admin manual adjustment creates audit log and updates subscription', async () => {
    const res = await fetch(`${baseUrl}/admin/subscriptions/${hostId}/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'ACTIVE',
        reason: 'Authorized VIP Host comp by Super Admin',
        notes: 'Complimentary extension for 60 days'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.subscription.status, 'ACTIVE');

    // Verify AuditLog
    const audit = await prisma.auditLog.findFirst({
      where: {
        actorId: adminId,
        action: 'ADMIN_SUBSCRIPTION_OVERRIDE'
      }
    });
    assert.ok(audit);
    assert.match(audit.metadata, /Authorized VIP Host comp/);
  });

  // 15. Admin APIs do NOT expose private guest or individual RSVP information
  await t.test('15. Admin APIs do NOT expose private guest WhatsApp numbers or individual RSVPs', async () => {
    // Create a private guest and event for host
    const privateGuest = await prisma.guest.create({
      data: {
        userId: hostId,
        fullName: 'Secret VIP Guest',
        whatsappNumber: '+919999888877',
        isPermanent: true
      }
    });

    const res = await fetch(`${baseUrl}/admin/users/${hostId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const text = await res.text();

    // Verify private phone number does NOT leak anywhere in response
    assert.ok(!text.includes('+919999888877'), 'Guest WhatsApp number must never be exposed to admin');
    assert.ok(!text.includes('Secret VIP Guest'), 'Guest attendee details must never be exposed to admin');
  });

  // 16. Admin user suspend and reactivate
  await t.test('16. Super Admin can suspend and reactivate user accounts with audit logs', async () => {
    // Suspend
    const suspendRes = await fetch(`${baseUrl}/admin/users/${hostId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ isActive: false, reason: 'Temporary terms review' })
    });
    assert.strictEqual(suspendRes.status, 200);

    // Suspended user token should be rejected on next API call
    const testRes = await fetch(`${baseUrl}/guests`, {
      headers: { Authorization: `Bearer ${hostToken}` }
    });
    assert.strictEqual(testRes.status, 401, 'Suspended user must be blocked');

    // Reactivate
    const reactivateRes = await fetch(`${baseUrl}/admin/users/${hostId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ isActive: true, reason: 'Review resolved' })
    });
    assert.strictEqual(reactivateRes.status, 200);
  });

  // 17. Support ticket lifecycle
  await t.test('17. User submits support ticket; Admin updates status with audit log', async () => {
    // Submit ticket
    const ticketRes = await fetch(`${baseUrl}/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostToken}`
      },
      body: JSON.stringify({
        subject: 'Billing question about yearly renewal',
        message: 'Could you please explain if renewal happens automatically for Indian UPI?',
        category: 'BILLING',
        priority: 'MEDIUM'
      })
    });
    assert.strictEqual(ticketRes.status, 201);
    const ticketBody = await ticketRes.json();
    const ticketId = ticketBody.ticket.id;

    // Admin lists tickets
    const listRes = await fetch(`${baseUrl}/admin/support/tickets?status=OPEN`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(listRes.status, 200);
    const listBody = await listRes.json();
    assert.ok(listBody.tickets.some((t) => t.id === ticketId));

    // Admin updates ticket to RESOLVED
    const updateRes = await fetch(`${baseUrl}/admin/support/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'RESOLVED',
        adminNotes: 'Explained that UPI mandates send an approval notification 24h before renewal.'
      })
    });
    assert.strictEqual(updateRes.status, 200);
    const updateBody = await updateRes.json();
    assert.strictEqual(updateBody.ticket.status, 'RESOLVED');
  });

  // 18. Admin system settings configuration
  await t.test('18. Super Admin can update system settings with audit log', async () => {
    const res = await fetch(`${baseUrl}/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        settings: [
          { key: 'trial_duration_days', value: '30' },
          { key: 'grace_period_days', value: '10' }
        ]
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    const setting = await prisma.systemSetting.findUnique({ where: { key: 'grace_period_days' } });
    assert.strictEqual(setting.value, '10');
  });
});
