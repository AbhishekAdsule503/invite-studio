import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import prisma from '../src/database/prisma.js';
import authService from '../src/services/auth.service.js';
import excelService from '../src/services/excel.service.js';
import ExcelJS from 'exceljs';

test('Guest & Event Management Integration Test Suite', async (t) => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const mobileA = '+919999000001';
  const mobileB = '+919999000002';

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

  let guest1Id = '';
  let guest2Id = '';
  let eventAId = '';
  let eventGuestId = '';

  t.after(async () => {
    // Teardown
    await prisma.event.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.guest.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.otpChallenge.deleteMany({ where: { mobile: { in: [mobileA, mobileB] } } });
    await prisma.user.deleteMany({ where: { mobile: { in: [mobileA, mobileB] } } });
    await new Promise((resolve) => server.close(resolve));
  });

  // 1 & 2. Add permanent guest
  await t.test('1. POST /guests - Adds a permanent guest for User A', async () => {
    const res = await fetch(`${baseUrl}/guests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        fullName: 'Rohit Verma',
        whatsappNumber: '+919876511111',
        email: 'rohit@example.com',
        address: 'Bandra, Mumbai',
        relation: 'Family'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.guest.fullName, 'Rohit Verma');
    assert.strictEqual(body.guest.whatsappNumber, '+919876511111');
    guest1Id = body.guest.id;
  });

  // Duplicate guest check
  await t.test('2. POST /guests - Detects duplicate phone in user address book', async () => {
    const res = await fetch(`${baseUrl}/guests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        fullName: 'Rohit Duplicate',
        whatsappNumber: '9876511111', // Should normalize to +919876511111
        relation: 'Family'
      })
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /already exists/);
  });

  // Add a second guest for search/filter tests
  await t.test('3. POST /guests - Adds second guest for User A', async () => {
    const res = await fetch(`${baseUrl}/guests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        fullName: 'Sneha Kapoor',
        whatsappNumber: '+919876522222',
        email: 'sneha@example.com',
        relation: 'Friend'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    guest2Id = body.guest.id;
  });

  // 3. Edit and delete a guest
  await t.test('4. PUT /guests/:id - Edits guest details', async () => {
    const res = await fetch(`${baseUrl}/guests/${guest1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        fullName: 'Rohit Verma (Updated)',
        address: 'Worli, Mumbai'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.guest.fullName, 'Rohit Verma (Updated)');
    assert.strictEqual(body.guest.address, 'Worli, Mumbai');
  });

  // 4. Search and filter guests
  await t.test('5. GET /guests - Searches and filters guests', async () => {
    // Search by name
    const resName = await fetch(`${baseUrl}/guests?search=Rohit`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const bodyName = await resName.json();
    assert.strictEqual(bodyName.guests.length, 1);
    assert.strictEqual(bodyName.guests[0].fullName, 'Rohit Verma (Updated)');

    // Filter by relation
    const resRel = await fetch(`${baseUrl}/guests?relation=Friend`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const bodyRel = await resRel.json();
    assert.strictEqual(bodyRel.guests.length, 1);
    assert.strictEqual(bodyRel.guests[0].fullName, 'Sneha Kapoor');
  });

  // 5. Download Excel template
  await t.test('6. GET /guests/template - Downloads predefined Excel template', async () => {
    const res = await fetch(`${baseUrl}/guests/template`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(
      res.headers.get('content-type'),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000);
  });

  // 6 & 7. Excel Import preview and confirm
  await t.test('7. Excel Import - Previews valid and invalid rows, then confirms', async () => {
    // Generate an in-memory workbook with 1 valid row, 1 duplicate row, 1 invalid row
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Guests');
    ws.addRow(['Full Name', 'WhatsApp Number', 'Email', 'Address', 'Relation']);
    ws.addRow(['Ananya Roy', '+919876533333', 'ananya@example.com', 'Kolkata', 'Friend']); // Valid
    ws.addRow(['Duplicate Rohit', '+919876511111', '', '', 'Family']); // Duplicate with existing guest1
    ws.addRow(['', 'invalid-phone', '', '', '']); // Invalid

    const buffer = await wb.xlsx.writeBuffer();
    const preview = await excelService.parseAndPreviewImport(userAId, buffer);

    assert.strictEqual(preview.totalRows, 3);
    assert.strictEqual(preview.validCount, 1);
    assert.strictEqual(preview.duplicateCount, 1);
    assert.strictEqual(preview.invalidCount, 1);

    // Confirm import with the valid rows
    const validRows = preview.rows.filter((r) => r.status === 'VALID');
    const confirmRes = await fetch(`${baseUrl}/guests/import/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ rows: validRows })
    });

    assert.strictEqual(confirmRes.status, 200);
    const confirmBody = await confirmRes.json();
    assert.strictEqual(confirmBody.importedCount, 1);
  });

  // 8 & 9. Create a new event with RSVP deadline
  await t.test('8. POST /events - Creates event with DAYS_BEFORE deadline', async () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days in future
    const res = await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'Sharma Family Grand Wedding',
        eventType: 'WEDDING',
        eventDate: futureDate.toISOString(),
        eventTime: '18:00',
        venue: 'Grand Palace, Juhu',
        description: 'Wedding ceremony and reception',
        rsvpDeadlineType: 'DAYS_BEFORE',
        rsvpDeadlineDaysBefore: 3
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.event.name, 'Sharma Family Grand Wedding');
    assert.ok(body.event.effectiveDeadline);
    eventAId = body.event.id;
  });

  // 15. Verify event deadline validation (deadline cannot be after event date)
  await t.test('9. POST /events - Rejects deadline set after event date', async () => {
    const eventDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const invalidDeadline = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000); // 3 days AFTER event

    const res = await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'Invalid Deadline Party',
        eventType: 'BIRTHDAY',
        eventDate: eventDate.toISOString(),
        venue: 'Club House',
        rsvpDeadlineType: 'EXACT_DATE',
        rsvpDeadlineDate: invalidDeadline.toISOString()
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /cannot be set after the event date/);
  });

  // 10. Add existing guests to an event
  await t.test('10. POST /events/:id/guests - Adds existing guests to event', async () => {
    const res = await fetch(`${baseUrl}/events/${eventAId}/guests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ guestIds: [guest1Id, guest2Id] })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.addedCount, 2);
  });

  // 8. Prevent duplicate event assignments
  await t.test('11. POST /events/:id/guests - Prevents duplicate assignment of same guest', async () => {
    const res = await fetch(`${baseUrl}/events/${eventAId}/guests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ guestIds: [guest1Id] })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.addedCount, 0);
    assert.strictEqual(body.skippedCount, 1);
  });

  // 11. Add a new permanent guest directly to an event (Option 2A)
  await t.test('12. POST /events/:id/guests/new - Saves to My Guests + Adds to event', async () => {
    const res = await fetch(`${baseUrl}/events/${eventAId}/guests/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'Deepak Joshi',
        whatsappNumber: '+919876544444',
        email: 'deepak@example.com',
        relation: 'Colleague',
        saveToMyGuests: true
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.eventGuest.guestId, 'Should link permanent guest ID');

    // Verify it exists in My Guests
    const permanent = await prisma.guest.findFirst({
      where: { userId: userAId, whatsappNumber: '+919876544444' }
    });
    assert.ok(permanent, 'Guest should be saved to permanent address book');
  });

  // 12. Add an event-only guest (Option 2B)
  await t.test('13. POST /events/:id/guests/new - Adds event-only guest without permanent record', async () => {
    const res = await fetch(`${baseUrl}/events/${eventAId}/guests/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'Guest Of Honor (Event Only)',
        whatsappNumber: '+919876555555',
        relation: 'VIP',
        saveToMyGuests: false
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.eventGuest.guestId, null, 'Event-only guest has guestId = null');
    eventGuestId = body.eventGuest.id;

    // Verify it does NOT exist in permanent My Guests
    const permanent = await prisma.guest.findFirst({
      where: { userId: userAId, whatsappNumber: '+919876555555' }
    });
    assert.strictEqual(permanent, null, 'Must NOT create permanent guest record');
  });

  // 13. Remove a guest from an event without deleting permanent guest
  await t.test('14. DELETE /events/:id/guests/:eventGuestId - Removes from event without deleting permanent guest', async () => {
    // Find the EventGuest record linking guest1Id
    const eg = await prisma.eventGuest.findFirst({
      where: { eventId: eventAId, guestId: guest1Id }
    });
    assert.ok(eg);

    const res = await fetch(`${baseUrl}/events/${eventAId}/guests/${eg.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert.strictEqual(res.status, 200);

    // Verify event assignment is removed
    const checkEg = await prisma.eventGuest.findUnique({ where: { id: eg.id } });
    assert.strictEqual(checkEg, null);

    // Verify permanent guest STILL EXISTS in My Guests!
    const permanent = await prisma.guest.findUnique({ where: { id: guest1Id } });
    assert.ok(permanent, 'Permanent guest must still exist in address book');
  });

  // 14. Strict Tenant Isolation: User B CANNOT access User A's data
  await t.test('15. Security & Tenant Isolation - User B cannot view, edit, or delete User A data', async () => {
    // User B tries to view User A's guest
    const resGetGuest = await fetch(`${baseUrl}/guests/${guest1Id}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(resGetGuest.status, 404, 'User B cannot access User A guest');

    // User B tries to edit User A's guest
    const resPutGuest = await fetch(`${baseUrl}/guests/${guest1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({ fullName: 'Hacked Guest' })
    });
    assert.strictEqual(resPutGuest.status, 404);

    // User B tries to view User A's event
    const resGetEvent = await fetch(`${baseUrl}/events/${eventAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(resGetEvent.status, 404, 'User B cannot access User A event');

    // User B tries to add guests to User A's event
    const resAddGuest = await fetch(`${baseUrl}/events/${eventAId}/guests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({ guestIds: [guest1Id] })
    });
    assert.strictEqual(resAddGuest.status, 404);

    // User B's guest list is completely isolated
    const resListB = await fetch(`${baseUrl}/guests`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const bodyListB = await resListB.json();
    assert.strictEqual(bodyListB.guests.length, 0, 'User B sees 0 guests');
  });
});
