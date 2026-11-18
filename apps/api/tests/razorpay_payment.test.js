import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import prisma from '../src/database/prisma.js';
import authService from '../src/services/auth.service.js';
import subscriptionService from '../src/services/subscription.service.js';
import razorpayProvider from '../src/services/payments/razorpayProvider.js';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env.js';

test('Razorpay Payment Integration Verification Suite', async (t) => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const testUserMobile = '+919977665544';
  const otherUserMobile = '+919977665533';

  // Cleanup existing test records
  const mobiles = [testUserMobile, otherUserMobile];
  await prisma.otpChallenge.deleteMany({ where: { mobile: { in: mobiles } } });
  await prisma.user.deleteMany({ where: { mobile: { in: mobiles } } });

  // Provision test user
  await authService.requestOtp(testUserMobile);
  const auth = await authService.verifyOtpAndLogin(testUserMobile, '12345');
  const userToken = auth.accessToken;
  const userId = auth.user.id;

  // Provision other test user
  await authService.requestOtp(otherUserMobile);
  const otherAuth = await authService.verifyOtpAndLogin(otherUserMobile, '12345');
  const otherUserToken = otherAuth.accessToken;
  const otherUserId = otherAuth.user.id;

  // Ensure TRIAL plan is active for testing price=0 check
  await prisma.subscriptionPlan.update({
    where: { code: 'TRIAL' },
    data: { isActive: true }
  });

  // Retrieve plans
  const basicPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'BASIC' } });
  const trialPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'TRIAL' } });
  assert.ok(basicPlan, 'Basic plan must exist');
  assert.ok(trialPlan, 'Trial plan must exist');

  t.after(async () => {
    // Teardown
    await prisma.paymentTransaction.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
    await prisma.subscriptionHistory.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
    await prisma.userSubscription.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
    await prisma.otpChallenge.deleteMany({ where: { mobile: { in: mobiles } } });
    await prisma.user.deleteMany({ where: { mobile: { in: mobiles } } });
    await new Promise((resolve) => server.close(resolve));
  });

  // 1. Verify Razorpay SDK and configuration
  await t.test('1. Razorpay SDK is installed and provider initializes', async () => {
    assert.ok(razorpayProvider, 'razorpayProvider instance should exist');
    const status = razorpayProvider.getStatus();
    assert.strictEqual(status.provider, 'RAZORPAY');
    assert.ok(status.mode, 'Mode must be present');
  });

  // 2. Reject order creation for Free/Trial plan
  await t.test('2. Order creation for Free Trial (price 0) is rejected', async () => {
    const res = await fetch(`${baseUrl}/subscriptions/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ planId: trialPlan.id })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /Free or trial plans do not require payment/i);
  });

  // 3. Create order for paid plan (Amount derived from PostgreSQL)
  let testOrder = null;
  await t.test('3. Create order calculates amount strictly from DB plan, not client input', async () => {
    const res = await fetch(`${baseUrl}/subscriptions/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      // Client only provides planId; even if client sends rogue amount, server ignores it
      body: JSON.stringify({ planId: basicPlan.id, amount: 100 })
    });

    assert.strictEqual(res.status, 200);
    testOrder = await res.json();
    assert.strictEqual(testOrder.success, true);
    assert.strictEqual(testOrder.amount, basicPlan.priceYearly); // Must match DB price (99900 paise)
    assert.strictEqual(testOrder.currency, 'INR');
    assert.ok(testOrder.orderId);
    assert.strictEqual(testOrder.plan.id, basicPlan.id);

    // Verify secret is NOT exposed
    assert.strictEqual(testOrder.keySecret, undefined);
    assert.strictEqual(testOrder.secret, undefined);

    // Verify transaction record was saved in DB with status PENDING
    const tx = await prisma.paymentTransaction.findUnique({
      where: { orderId: testOrder.orderId }
    });
    assert.ok(tx);
    assert.strictEqual(tx.status, 'PENDING');
    assert.strictEqual(tx.userId, userId);
    assert.strictEqual(tx.amount, basicPlan.priceYearly);
  });

  // 4. Invalid signature verification is rejected and marks transaction FAILED
  await t.test('4. Payment verification fails with invalid signature and does NOT activate subscription', async () => {
    const res = await fetch(`${baseUrl}/subscriptions/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        orderId: testOrder.orderId,
        paymentId: 'pay_invalid_123',
        signature: 'bogus_forged_signature_hex'
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);

    // Confirm transaction is marked FAILED
    const tx = await prisma.paymentTransaction.findUnique({
      where: { orderId: testOrder.orderId }
    });
    assert.strictEqual(tx.status, 'FAILED');

    // Confirm subscription is NOT active on BASIC plan
    const sub = await prisma.userSubscription.findUnique({
      where: { userId }
    });
    assert.ok(!sub || sub.planId !== basicPlan.id || sub.status !== 'ACTIVE');
  });

  // 5. User-initiated cancellation / failure recording
  let cancelOrder = null;
  await t.test('5. Cancelled payment records FAILED status safely without subscription activation', async () => {
    // Create new order to test cancellation
    const oRes = await fetch(`${baseUrl}/subscriptions/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ planId: basicPlan.id })
    });
    cancelOrder = await oRes.json();

    // User dismisses checkout
    const failRes = await fetch(`${baseUrl}/subscriptions/record-failure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        orderId: cancelOrder.orderId,
        reason: 'USER_CANCELLED',
        description: 'User dismissed checkout modal'
      })
    });

    assert.strictEqual(failRes.status, 200);
    const failBody = await failRes.json();
    assert.strictEqual(failBody.success, true);
    assert.strictEqual(failBody.status, 'FAILED');

    // Confirm transaction status is FAILED
    const tx = await prisma.paymentTransaction.findUnique({
      where: { orderId: cancelOrder.orderId }
    });
    assert.strictEqual(tx.status, 'FAILED');
    assert.match(tx.metadata, /User dismissed/i);

    // Confirm user subscription remains unchanged
    const sub = await prisma.userSubscription.findUnique({ where: { userId } });
    assert.ok(!sub || sub.status !== 'ACTIVE' || sub.planId !== basicPlan.id);
  });

  // 6. Valid payment signature activates subscription
  let successOrder = null;
  const paymentId = `pay_test_${Date.now()}`;
  await t.test('6. Valid cryptographic signature activates subscription for 1 year', async () => {
    const oRes = await fetch(`${baseUrl}/subscriptions/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ planId: basicPlan.id })
    });
    successOrder = await oRes.json();

    // Generate valid test signature
    const validSig = razorpayProvider.generateSandboxSignature(successOrder.orderId, paymentId);

    const vRes = await fetch(`${baseUrl}/subscriptions/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        orderId: successOrder.orderId,
        paymentId,
        signature: validSig
      })
    });

    assert.strictEqual(vRes.status, 200);
    const vBody = await vRes.json();
    assert.strictEqual(vBody.success, true);
    assert.strictEqual(vBody.alreadyProcessed, false);
    assert.strictEqual(vBody.subscription.status, 'ACTIVE');
    assert.strictEqual(vBody.subscription.planId, basicPlan.id);

    // Verify subscription expires ~365 days later
    const expiresAt = new Date(vBody.subscription.expiresAt);
    const diffDays = Math.round((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    assert.ok(diffDays >= 364 && diffDays <= 366);

    // Check transaction in DB
    const tx = await prisma.paymentTransaction.findUnique({
      where: { orderId: successOrder.orderId }
    });
    assert.strictEqual(tx.status, 'SUCCESS');
    assert.strictEqual(tx.paymentId, paymentId);

    // Check history record exists
    const history = await prisma.subscriptionHistory.findFirst({
      where: { userId, planId: basicPlan.id },
      orderBy: { createdAt: 'desc' }
    });
    assert.ok(history);
    assert.strictEqual(history.reason, 'RAZORPAY_PAYMENT');
  });

  // 7. Idempotency: Repeating payment verification does not duplicate
  await t.test('7. Repeated payment verification is idempotent and preserves activation', async () => {
    const validSig = razorpayProvider.generateSandboxSignature(successOrder.orderId, paymentId);

    const repeatRes = await fetch(`${baseUrl}/subscriptions/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        orderId: successOrder.orderId,
        paymentId,
        signature: validSig
      })
    });

    assert.strictEqual(repeatRes.status, 200);
    const repeatBody = await repeatRes.json();
    assert.strictEqual(repeatBody.success, true);
    assert.strictEqual(repeatBody.alreadyProcessed, true);

    // Ensure no duplicate subscription rows for user
    const subCount = await prisma.userSubscription.count({ where: { userId } });
    assert.strictEqual(subCount, 1);
  });

  // 8. Other user cannot verify or tamper with another user's order (403)
  await t.test('8. Unauthorized user cannot verify another user transaction', async () => {
    const validSig = razorpayProvider.generateSandboxSignature(successOrder.orderId, paymentId);

    const tamperedRes = await fetch(`${baseUrl}/subscriptions/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherUserToken}`
      },
      body: JSON.stringify({
        orderId: successOrder.orderId,
        paymentId,
        signature: validSig
      })
    });

    assert.strictEqual(tamperedRes.status, 403);
    const body = await tamperedRes.json();
    assert.strictEqual(body.success, false);
  });

  // 9. Webhook: Signature verification, processing and idempotency
  await t.test('9. Webhook order.paid event activates subscription idempotently', async () => {
    // Create new order for other user
    const otherOrderRes = await fetch(`${baseUrl}/subscriptions/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherUserToken}`
      },
      body: JSON.stringify({ planId: basicPlan.id })
    });
    const otherOrder = await otherOrderRes.json();

    const webhookEvent = {
      event_id: `evt_test_${Date.now()}`,
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: otherOrder.orderId,
            amount: basicPlan.priceYearly,
            currency: 'INR'
          }
        },
        payment: {
          entity: {
            id: `pay_wh_${Date.now()}`,
            order_id: otherOrder.orderId,
            amount: basicPlan.priceYearly
          }
        }
      }
    };

    const rawPayload = JSON.stringify(webhookEvent);
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'sandbox_razorpay_secret_test_key';
    const sig = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

    // 1st delivery
    const whRes1 = await fetch(`${baseUrl}/subscriptions/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': sig
      },
      body: rawPayload
    });

    assert.strictEqual(whRes1.status, 200);
    const whBody1 = await whRes1.json();
    assert.strictEqual(whBody1.success, true);

    // Verify other user's subscription was activated
    const otherSub = await prisma.userSubscription.findUnique({
      where: { userId: otherUserId }
    });
    assert.ok(otherSub);
    assert.strictEqual(otherSub.status, 'ACTIVE');
    assert.strictEqual(otherSub.planId, basicPlan.id);

    // 2nd delivery (duplicate webhook)
    const whRes2 = await fetch(`${baseUrl}/subscriptions/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': sig
      },
      body: rawPayload
    });

    assert.strictEqual(whRes2.status, 200);
    const whBody2 = await whRes2.json();
    assert.strictEqual(whBody2.success, true);
    assert.strictEqual(whBody2.alreadyProcessed, true);
  });

  // 10. Webhook: payment.failed event marks transaction FAILED
  await t.test('10. Webhook payment.failed event updates transaction to FAILED', async () => {
    // Create new order for test user
    const failOrderRes = await fetch(`${baseUrl}/subscriptions/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ planId: basicPlan.id })
    });
    const failOrder = await failOrderRes.json();

    const failEvent = {
      event_id: `evt_fail_${Date.now()}`,
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_failed_${Date.now()}`,
            order_id: failOrder.orderId,
            error_description: 'Card declined by issuing bank'
          }
        }
      }
    };

    const rawPayload = JSON.stringify(failEvent);
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'sandbox_razorpay_secret_test_key';
    const sig = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

    const res = await fetch(`${baseUrl}/subscriptions/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': sig
      },
      body: rawPayload
    });

    assert.strictEqual(res.status, 200);

    const tx = await prisma.paymentTransaction.findUnique({
      where: { orderId: failOrder.orderId }
    });
    assert.strictEqual(tx.status, 'FAILED');
    assert.match(tx.metadata, /Card declined/i);
  });

  // 11. Preserving Super Admin manual adjustments
  await t.test('11. Super Admin manual subscription adjustment remains functional', async () => {
    const adminMobile = '+919977665522';
    await authService.requestOtp(adminMobile);
    const adminAuth = await authService.verifyOtpAndLogin(adminMobile, '12345');
    const adminId = adminAuth.user.id;

    // Promote to SUPER_ADMIN
    await prisma.user.update({
      where: { id: adminId },
      data: { role: 'SUPER_ADMIN' }
    });

    const adjustmentResult = await subscriptionService.manualAdjustSubscription({
      adminId,
      userId,
      planId: basicPlan.id,
      status: 'ACTIVE',
      reason: 'Support courtesy upgrade',
      notes: 'Testing manual adjustment integrity'
    });

    assert.ok(adjustmentResult);
    assert.strictEqual(adjustmentResult.planId, basicPlan.id);
    assert.strictEqual(adjustmentResult.status, 'ACTIVE');

    // Cleanup admin
    await prisma.otpChallenge.deleteMany({ where: { mobile: adminMobile } });
    await prisma.user.deleteMany({ where: { mobile: adminMobile } });
  });
});
