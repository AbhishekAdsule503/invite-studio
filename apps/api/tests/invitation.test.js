import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import prisma from '../src/database/prisma.js';
import authService from '../src/services/auth.service.js';
import eventService from '../src/services/event.service.js';
import guestService from '../src/services/guest.service.js';

test('Invitation & Template Management Integration Test Suite', async (t) => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const mobileA = '+919888000001';
  const mobileB = '+919888000002';

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

  let eventAId = '';
  let guestA1Id = '';
  let guestA2Id = '';
  let templateId = '';
  let invitationToken = '';
  let invitationId = '';

  // Setup User A Event and EventGuests
  const event = await eventService.createEvent(userAId, {
    name: 'Roy & Sharma Grand Gala',
    eventType: 'WEDDING',
    eventDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    eventTime: '19:00',
    venue: 'The Grand Taj Ballroom, Colaba',
    description: 'We welcome you to celebrate with our family.',
    rsvpDeadlineType: 'DAYS_BEFORE',
    rsvpDeadlineDaysBefore: 3
  });
  eventAId = event.id;

  const eg1 = await eventService.addNewGuestToEvent(userAId, eventAId, {
    name: 'Vikram Singhania',
    whatsappNumber: '+919876599001',
    email: 'vikram@example.com',
    relation: 'VIP',
    saveToMyGuests: true
  });
  guestA1Id = eg1.eventGuest.id;

  const eg2 = await eventService.addNewGuestToEvent(userAId, eventAId, {
    name: 'Meera Rajput',
    whatsappNumber: '+919876599002',
    email: 'meera@example.com',
    relation: 'Friend',
    saveToMyGuests: false
  });
  guestA2Id = eg2.eventGuest.id;

  t.after(async () => {
    // Teardown
    await prisma.event.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.guest.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.invitationTemplate.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.otpChallenge.deleteMany({ where: { mobile: { in: [mobileA, mobileB] } } });
    await prisma.user.deleteMany({ where: { mobile: { in: [mobileA, mobileB] } } });
    await new Promise((resolve) => server.close(resolve));
  });

  // 1. Template Listing (Auto-seeding system templates)
  await t.test('1. GET /templates - Auto-seeds and returns built-in occasion templates', async () => {
    const res = await fetch(`${baseUrl}/templates`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.templates.length >= 8, 'Should have built-in occasion templates');

    const weddingTemplate = body.templates.find((t) => t.eventType === 'WEDDING');
    assert.ok(weddingTemplate, 'Wedding template should exist');
    templateId = weddingTemplate.id;
  });

  // 2. Custom template creation
  await t.test('2. POST /templates - Creates a custom template for host', async () => {
    const res = await fetch(`${baseUrl}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        title: 'Singhania Bespoke Royal Motif',
        eventType: 'WEDDING',
        previewImageUrl: 'https://images.unsplash.com/photo-custom.jpg',
        defaultMessage: 'Respected {{guestName}}, join {{eventName}} at {{venue}} on {{eventDate}}. RSVP: {{invitationUrl}}'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.template.title, 'Singhania Bespoke Royal Motif');
    assert.strictEqual(body.template.isSystem, false);
  });

  // 3. Generate invitations for event guests
  await t.test('3. POST /invitations - Generates personalized invitations with secure tokens', async () => {
    const res = await fetch(`${baseUrl}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        eventId: eventAId,
        templateId,
        eventGuestIds: [guestA1Id, guestA2Id],
        customMessage: 'Namaste {{guestName}}, please grace {{eventName}} on {{eventDate}} at {{venue}}. RSVP: {{invitationUrl}}'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.generatedCount, 2);
    assert.strictEqual(body.existingCount, 0);
  });

  // 4. Duplicate prevention
  await t.test('4. POST /invitations - Prevents duplicate invitations unless regenerate=true', async () => {
    const res = await fetch(`${baseUrl}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        eventId: eventAId,
        templateId,
        eventGuestIds: [guestA1Id],
        regenerate: false
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.generatedCount, 0);
    assert.strictEqual(body.existingCount, 1);
  });

  // 5. List invitations and inspect formatted WhatsApp click-to-chat links
  await t.test('5. GET /invitations - Lists invitations with valid WhatsApp URLs and token links', async () => {
    const res = await fetch(`${baseUrl}/invitations?eventId=${eventAId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.invitations.length, 2);

    const first = body.invitations[0];
    invitationId = first.id;
    invitationToken = first.token;

    assert.ok(first.token, 'Token must be present');
    assert.strictEqual(first.token.length, 32, 'Token must be a 32-char hex string');
    assert.strictEqual(first.whatsappStatus, 'PENDING');
    assert.ok(first.invitationUrl.includes(first.token));
    assert.ok(
      first.invitationUrl.startsWith('http://localhost:3000/invite/'),
      `Invitation URL must point to frontend port 3000, got: ${first.invitationUrl}`
    );
    assert.ok(first.whatsAppUrl.startsWith('https://wa.me/'));
    assert.ok(first.formattedMessage.includes(first.eventGuest.name));
    assert.ok(first.formattedMessage.includes('http://localhost:3000/invite/'));
  });

  // 5b. Dynamic Origin Header support
  await t.test('5b. GET /invitations with custom Origin header reflects client domain in URLs', async () => {
    const customOrigin = 'https://invitestudio.app';
    const res = await fetch(`${baseUrl}/invitations?eventId=${eventAId}`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        Origin: customOrigin
      }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    const first = body.invitations[0];
    assert.ok(
      first.invitationUrl.startsWith(`${customOrigin}/invite/`),
      `Invitation URL should reflect request Origin header, got: ${first.invitationUrl}`
    );
    assert.ok(first.formattedMessage.includes(`${customOrigin}/invite/`));
  });

  // 6. Update invitation message
  await t.test('6. PUT /invitations/:id - Updates personalized message', async () => {
    const res = await fetch(`${baseUrl}/invitations/${invitationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        personalizedMessage: 'Updated note for {{guestName}}: We look forward to your presence at {{eventName}}.'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.match(body.invitation.personalizedMessage, /Updated note/);
  });

  // 7. Mark invitation as sent manually by host
  await t.test('7. POST /invitations/:id/mark-sent - Marks invitation sent with timestamp', async () => {
    const res = await fetch(`${baseUrl}/invitations/${invitationId}/mark-sent`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.invitation.whatsappStatus, 'SENT');
    assert.ok(body.invitation.sentAt, 'sentAt timestamp should be set');
  });

  // 8. Public Invitee Endpoint (NO LOGIN REQUIRED)
  await t.test('8. GET /invitations/public/:token - Public access for guest without JWT', async () => {
    const res = await fetch(`${baseUrl}/invitations/public/${invitationToken}`);

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.eventName, 'Roy & Sharma Grand Gala');
    assert.strictEqual(body.venue, 'The Grand Taj Ballroom, Colaba');
    assert.ok(body.guestName);
    assert.ok(body.effectiveDeadline);

    // SECURITY CHECK: Ensure sensitive internal fields are NEVER exposed to the public
    assert.strictEqual(body.userId, undefined, 'Host userId must not be exposed');
    assert.strictEqual(body.mobile, undefined, 'Host phone must not be exposed');
    assert.strictEqual(body.eventGuestId, undefined, 'Internal foreign keys must not be exposed');
  });

  // 9. Public Invitee Endpoint with invalid token
  await t.test('9. GET /invitations/public/:token - Returns 404 on non-existent token', async () => {
    const res = await fetch(`${baseUrl}/invitations/public/invalid_fake_token_12345`);
    assert.strictEqual(res.status, 404);
  });

  // 10. Strict Cross-Tenant Isolation
  await t.test('10. Security & Tenant Isolation - User B cannot view or modify User A invitations', async () => {
    // User B tries to view User A invitations for eventAId
    const resList = await fetch(`${baseUrl}/invitations?eventId=${eventAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(resList.status, 404, 'User B cannot access User A event invitations');

    // User B tries to mark User A invitation as sent
    const resMark = await fetch(`${baseUrl}/invitations/${invitationId}/mark-sent`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(resMark.status, 404, 'User B cannot update User A invitation');

    // User B tries to delete User A invitation
    const resDel = await fetch(`${baseUrl}/invitations/${invitationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(resDel.status, 404, 'User B cannot delete User A invitation');
  });
});
