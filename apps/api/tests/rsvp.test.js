import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import prisma from '../src/database/prisma.js';
import authService from '../src/services/auth.service.js';
import eventService from '../src/services/event.service.js';
import invitationService from '../src/services/invitation.service.js';

test('RSVP Tracking & Privacy-First Dashboard Integration Test Suite', async (t) => {
  const app = createApp();
  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const mobileA = '+919888111001';
  const mobileB = '+919888111002';

  // Cleanup test users
  await prisma.otpChallenge.deleteMany({ where: { mobile: { in: [mobileA, mobileB] } } });
  await prisma.user.deleteMany({ where: { mobile: { in: [mobileA, mobileB] } } });

  // Prepare authenticated sessions for User A and User B
  await authService.requestOtp(mobileA);
  const authA = await authService.verifyOtpAndLogin(mobileA, '12345');
  const tokenA = authA.accessToken;
  const userAId = authA.user.id;

  await authService.requestOtp(mobileB);
  const authB = await authService.verifyOtpAndLogin(mobileB, '12345');
  const tokenB = authB.accessToken;
  const userBId = authB.user.id;

  // Setup isolated test subscription plan with sufficient quota for test suite
  let testPlan = await prisma.subscriptionPlan.findFirst({
    where: { code: { in: ['PREMIUM', 'STANDARD'] }, isActive: true }
  });
  if (!testPlan) {
    testPlan = await prisma.subscriptionPlan.findFirst({
      where: { maxEvents: { gte: 10 } }
    });
  }
  if (!testPlan) {
    testPlan = await prisma.subscriptionPlan.create({
      data: {
        code: 'TEST_RSVP_UNLIMITED',
        name: 'Test RSVP Plan',
        priceYearly: 0,
        currency: 'INR',
        maxEvents: 100,
        maxGuestsPerEvent: 1000,
        maxPermanentGuests: 1000,
        isActive: true
      }
    });
  }

  await prisma.userSubscription.upsert({
    where: { userId: userAId },
    update: { planId: testPlan.id, status: 'ACTIVE' },
    create: {
      userId: userAId,
      planId: testPlan.id,
      status: 'ACTIVE',
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }
  });

  // Setup Event for User A with future deadline
  const futureEvent = await eventService.createEvent(userAId, {
    name: 'Kapoor Silver Jubilee Anniversary',
    eventType: 'ANNIVERSARY',
    eventDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    eventTime: '18:30',
    venue: 'Royal Orchid Pavilion, Bengaluru',
    rsvpDeadlineType: 'DAYS_BEFORE',
    rsvpDeadlineDaysBefore: 2
  });
  const eventAId = futureEvent.id;

  // Add 3 guests to eventA
  const g1 = await eventService.addNewGuestToEvent(userAId, eventAId, {
    name: 'Ananya Roy',
    whatsappNumber: '+919876540001',
    relation: 'Friend'
  });
  const g2 = await eventService.addNewGuestToEvent(userAId, eventAId, {
    name: 'Kabir Mehta',
    whatsappNumber: '+919876540002',
    relation: 'Colleague'
  });
  const g3 = await eventService.addNewGuestToEvent(userAId, eventAId, {
    name: 'Sunita Sen',
    whatsappNumber: '+919876540003',
    relation: 'Family'
  });

  // Generate invitations for the 3 guests
  await invitationService.generateInvitations(userAId, {
    eventId: eventAId,
    eventGuestIds: [g1.eventGuest.id, g2.eventGuest.id, g3.eventGuest.id]
  });

  const invListRes = await invitationService.listInvitations(userAId, { eventId: eventAId });
  const inv1 = invListRes.invitations.find((i) => i.eventGuestId === g1.eventGuest.id);
  const inv2 = invListRes.invitations.find((i) => i.eventGuestId === g2.eventGuest.id);
  const inv3 = invListRes.invitations.find((i) => i.eventGuestId === g3.eventGuest.id);

  const token1 = inv1.token;
  const token2 = inv2.token;
  const token3 = inv3.token;

  t.after(async () => {
    server.close();
    await prisma.event.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.guest.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.userSubscription.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.otpChallenge.deleteMany({ where: { mobile: { in: [mobileA, mobileB] } } });
    await prisma.user.deleteMany({ where: { mobile: { in: [mobileA, mobileB] } } });
  });

  // 1. Public guest can submit IN
  await t.test('1. Public guest can submit IN without authentication', async () => {
    const res = await fetch(`${baseUrl}/invitations/public/${token1}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN', companionCount: 1 })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, 'IN');
    assert.strictEqual(body.companionCount, 1);
    assert.ok(body.message.includes('confirmed'));
  });

  // 2. Public guest can submit OUT
  await t.test('2. Public guest can submit OUT without authentication', async () => {
    const res = await fetch(`${baseUrl}/invitations/public/${token2}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'OUT' })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, 'OUT');
    assert.strictEqual(body.companionCount, 0);
  });

  // 3. Guest can update IN to OUT
  await t.test('3. Guest can update previous response from IN to OUT', async () => {
    const res = await fetch(`${baseUrl}/invitations/public/${token1}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'OUT' })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, 'OUT');

    // Verify stored in DB
    const dbRecord = await prisma.rsvpResponse.findUnique({
      where: { invitationId: inv1.id }
    });
    assert.strictEqual(dbRecord.status, 'OUT');
  });

  // 4. Guest can update OUT to IN
  await t.test('4. Guest can update previous response from OUT to IN', async () => {
    const res = await fetch(`${baseUrl}/invitations/public/${token1}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN', companionCount: 2 })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, 'IN');

    const dbRecord = await prisma.rsvpResponse.findUnique({
      where: { invitationId: inv1.id }
    });
    assert.strictEqual(dbRecord.status, 'IN');
    assert.strictEqual(dbRecord.companionCount, 2);
  });

  // 5. Invalid token is rejected
  await t.test('5. Non-existent token is rejected with 404', async () => {
    const res = await fetch(`${baseUrl}/invitations/public/nonexistent_dummy_token_9999/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN' })
    });

    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  // 6. Invalid response value is rejected
  await t.test('6. Invalid response value (e.g. MAYBE) is rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/invitations/public/${token1}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'MAYBE' })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  // Setup Event with Expired RSVP Deadline
  const pastDeadlineEvent = await prisma.event.create({
    data: {
      userId: userAId,
      name: 'Past Deadline Dinner',
      eventType: 'OTHER',
      eventDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
      venue: 'Club House',
      rsvpDeadlineType: 'EXACT_DATE',
      rsvpDeadlineDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    }
  });

  const pastEg = await prisma.eventGuest.create({
    data: {
      eventId: pastDeadlineEvent.id,
      name: 'Rohan Verma',
      whatsappNumber: '+919876540099'
    }
  });

  const expiredInv = await prisma.invitation.create({
    data: {
      eventId: pastDeadlineEvent.id,
      eventGuestId: pastEg.id,
      token: 'expired_test_token_abcdef1234567890'
    }
  });

  // 7. Expired RSVP deadline rejects submission
  await t.test('7. Submission after RSVP deadline is rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/invitations/public/${expiredInv.token}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN' })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('closed') || body.error.includes('deadline'));
  });

  // 8. Exact deadline boundary is handled correctly
  await t.test('8. Exact deadline boundary allows submission while now <= deadline', async () => {
    // Event with deadline slightly in the future (30 seconds)
    const boundaryEvent = await prisma.event.create({
      data: {
        userId: userAId,
        name: 'Boundary Test Celebration',
        eventType: 'BIRTHDAY',
        eventDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        venue: 'Garden Suite',
        rsvpDeadlineType: 'EXACT_DATE',
        rsvpDeadlineDate: new Date(Date.now() + 30 * 1000) // 30 seconds ahead
      }
    });

    const boundaryEg = await prisma.eventGuest.create({
      data: {
        eventId: boundaryEvent.id,
        name: 'Boundary Invitee',
        whatsappNumber: '+919876540088'
      }
    });

    const boundaryInv = await prisma.invitation.create({
      data: {
        eventId: boundaryEvent.id,
        eventGuestId: boundaryEg.id,
        token: 'boundary_test_token_123456789012'
      }
    });

    const res = await fetch(`${baseUrl}/invitations/public/${boundaryInv.token}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN' })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, 'IN');
  });

  // 9. Duplicate submissions do not create duplicate records
  await t.test('9. Repeated submissions for same invitation update single record without duplicates', async () => {
    await fetch(`${baseUrl}/invitations/public/${token2}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'OUT' })
    });

    await fetch(`${baseUrl}/invitations/public/${token2}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'OUT' })
    });

    const count = await prisma.rsvpResponse.count({
      where: { invitationId: inv2.id }
    });
    assert.strictEqual(count, 1, 'There must be exactly one RsvpResponse record per invitation');
  });

  // 10. Other invitees cannot access an individual's response
  await t.test('10. Public invitation endpoint never reveals other invitees or responses', async () => {
    const res = await fetch(`${baseUrl}/invitations/public/${token3}`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.guestName, 'Sunita Sen');
    assert.strictEqual(body.rsvpStatus, null, 'Unresponded guest sees null status');
    assert.strictEqual(body.otherGuests, undefined, 'Must not expose other guests list');
    assert.strictEqual(body.responses, undefined, 'Must not expose response list');
  });

  // 11. Host receives aggregate counts only
  await t.test('11. Host receives aggregate counts only on GET /events/:id/rsvp-summary', async () => {
    const res = await fetch(`${baseUrl}/events/${eventAId}/rsvp-summary`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.strictEqual(body.eventId, eventAId);
    assert.strictEqual(typeof body.totalInvited, 'number');
    assert.strictEqual(typeof body.totalIn, 'number');
    assert.strictEqual(typeof body.totalOut, 'number');
    assert.strictEqual(typeof body.totalNotResponded, 'number');

    // Confirm strict privacy: No guest names, IDs, or individual status arrays
    assert.strictEqual(body.guests, undefined);
    assert.strictEqual(body.responses, undefined);
    assert.strictEqual(body.guestList, undefined);
    assert.strictEqual(body.rsvpList, undefined);
  });

  // 12. Host cannot access individual RSVP records
  await t.test('12. Host endpoints (listInvitations, event guests) do not expose individual RSVP data', async () => {
    const invRes = await fetch(`${baseUrl}/invitations?eventId=${eventAId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const invBody = await invRes.json();

    for (const inv of invBody.invitations) {
      assert.strictEqual(
        inv.rsvpResponse,
        undefined,
        'Host invitation list must not include rsvpResponse object'
      );
      assert.strictEqual(
        inv.status,
        undefined,
        'Host invitation item must not contain individual RSVP status'
      );
    }
  });

  // 13. User B cannot access User A's event summary
  await t.test('13. Cross-tenant isolation: User B cannot view User A event rsvp-summary', async () => {
    const res = await fetch(`${baseUrl}/events/${eventAId}/rsvp-summary`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  // 14. Event without responses returns correct counts
  await t.test('14. Event without any responses returns correct zero counts and full totalNotResponded', async () => {
    const freshEvent = await eventService.createEvent(userAId, {
      name: 'Fresh Untouched Party',
      eventType: 'BIRTHDAY',
      eventDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      venue: 'The Palm Lawn'
    });

    // Add 2 guests
    await eventService.addNewGuestToEvent(userAId, freshEvent.id, {
      name: 'Guest Zero 1',
      whatsappNumber: '+919876541111'
    });
    await eventService.addNewGuestToEvent(userAId, freshEvent.id, {
      name: 'Guest Zero 2',
      whatsappNumber: '+919876542222'
    });

    const res = await fetch(`${baseUrl}/events/${freshEvent.id}/rsvp-summary`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.totalInvited, 2);
    assert.strictEqual(body.totalIn, 0);
    assert.strictEqual(body.totalOut, 0);
    assert.strictEqual(body.totalNotResponded, 2);
  });

  // 15. Not Responded calculation is correct
  await t.test('15. Not Responded calculation accurately reflects Total - (IN + OUT)', async () => {
    // On eventA: 3 invited guests.
    // inv1 responded IN
    // inv2 responded OUT
    // inv3 has not responded
    const res = await fetch(`${baseUrl}/events/${eventAId}/rsvp-summary`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.totalInvited, 3);
    assert.strictEqual(body.totalIn, 1, 'One guest confirmed IN');
    assert.strictEqual(body.totalOut, 1, 'One guest declined OUT');
    assert.strictEqual(body.totalNotResponded, 1, '3 - (1 + 1) = 1 awaiting response');
    assert.strictEqual(
      body.totalNotResponded,
      body.totalInvited - (body.totalIn + body.totalOut),
      'Formula totalNotResponded = totalInvited - (totalIn + totalOut) must match exactly'
    );
  });
});
