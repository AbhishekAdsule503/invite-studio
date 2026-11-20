import test from 'node:test';
import assert from 'node:assert';
import prisma from '../src/database/prisma.js';
import subscriptionService from '../src/services/subscription.service.js';
import workspaceService from '../src/services/workspace.service.js';
import reminderService from '../src/services/reminder.service.js';
import excelService from '../src/services/excel.service.js';
import eventService from '../src/services/event.service.js';
import guestService from '../src/services/guest.service.js';

test('Final 4-Tier Subscription & Feature Access Integration Suite', async (t) => {
  let userFree;
  let userPersonal;
  let userFamily;
  let userFamilyPlus;
  let invitedMember;

  const testSuffix = Date.now();

  t.before(async () => {
    // 1. Create test users
    userFree = await prisma.user.create({
      data: {
        mobile: `+9191000${String(testSuffix).slice(-5)}`,
        name: 'Free Host User',
        email: `free_host_${testSuffix}@example.com`
      }
    });

    userPersonal = await prisma.user.create({
      data: {
        mobile: `+9192000${String(testSuffix).slice(-5)}`,
        name: 'Personal Host User',
        email: `personal_host_${testSuffix}@example.com`
      }
    });

    userFamily = await prisma.user.create({
      data: {
        mobile: `+9193000${String(testSuffix).slice(-5)}`,
        name: 'Family Host User',
        email: `family_host_${testSuffix}@example.com`
      }
    });

    userFamilyPlus = await prisma.user.create({
      data: {
        mobile: `+9194000${String(testSuffix).slice(-5)}`,
        name: 'Family Plus Host User',
        email: `familyplus_host_${testSuffix}@example.com`
      }
    });

    invitedMember = await prisma.user.create({
      data: {
        mobile: `+9195000${String(testSuffix).slice(-5)}`,
        name: 'Invited Family Member',
        email: `invited_member_${testSuffix}@example.com`
      }
    });

    // 2. Assign plans
    await subscriptionService.switchPlan(userFree.id, { targetPlanCode: 'FREE' });
    await subscriptionService.switchPlan(userPersonal.id, { targetPlanCode: 'PERSONAL' });
    await subscriptionService.switchPlan(userFamily.id, { targetPlanCode: 'FAMILY' });
    await subscriptionService.switchPlan(userFamilyPlus.id, { targetPlanCode: 'FAMILY_PLUS' });
  });

  t.after(async () => {
    // Clean up test users & data
    const userIds = [userFree?.id, userPersonal?.id, userFamily?.id, userFamilyPlus?.id, invitedMember?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.workspaceMember.deleteMany({ where: { workspaceId: { in: userIds } } });
      await prisma.eventGuest.deleteMany({ where: { event: { userId: { in: userIds } } } });
      await prisma.invitation.deleteMany({ where: { event: { userId: { in: userIds } } } });
      await prisma.event.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.guest.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.subscriptionHistory.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.paymentTransaction.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.userSubscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  await t.test('1. Catalog verification: Exactly four final customer plans exist', async () => {
    const plans = await subscriptionService.getAvailablePlans();
    assert.strictEqual(plans.length, 4, 'Customer catalog must present exactly 4 active plans');

    const codes = plans.map((p) => p.code);
    assert.deepStrictEqual(codes, ['FREE', 'PERSONAL', 'FAMILY', 'FAMILY_PLUS']);

    const free = plans.find((p) => p.code === 'FREE');
    assert.strictEqual(free.priceMonthly, 0);
    assert.strictEqual(free.maxContacts, 100);
    assert.strictEqual(free.maxCampaignsPerMonth, 2);
    assert.strictEqual(free.maxAutomatedWhatsApp, 0);

    const personal = plans.find((p) => p.code === 'PERSONAL');
    assert.strictEqual(personal.priceMonthly, 9900);
    assert.strictEqual(personal.maxContacts, 1000);
    assert.strictEqual(personal.maxCampaignsPerMonth, 10);
    assert.strictEqual(personal.maxAutomatedWhatsApp, 100);

    const family = plans.find((p) => p.code === 'FAMILY');
    assert.strictEqual(family.priceMonthly, 19900);
    assert.strictEqual(family.maxContacts, 3000);
    assert.strictEqual(family.maxCampaignsPerMonth, 30);
    assert.strictEqual(family.maxAutomatedWhatsApp, 250);
    assert.strictEqual(family.maxWorkspaceMembers, 2);

    const familyPlus = plans.find((p) => p.code === 'FAMILY_PLUS');
    assert.strictEqual(familyPlus.priceMonthly, 39900);
    assert.strictEqual(familyPlus.maxContacts, 10000);
    assert.strictEqual(familyPlus.maxCampaignsPerMonth, 75);
    assert.strictEqual(familyPlus.maxAutomatedWhatsApp, 500);
    assert.strictEqual(familyPlus.maxWorkspaceMembers, 5);
  });

  await t.test('2. Feature entitlement: Free plan cannot import contacts via Excel', async () => {
    await assert.rejects(
      async () => {
        await excelService.parseAndPreviewImport(userFree.id, Buffer.from('dummy'));
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.code, 'FEATURE_IMPORT_LOCKED');
        assert.strictEqual(err.upgradeRecommendation, 'FAMILY');
        return true;
      }
    );
  });

  await t.test('3. Feature entitlement: Free plan cannot export contacts', async () => {
    await assert.rejects(
      async () => {
        await excelService.exportGuests(userFree.id);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.code, 'FEATURE_EXPORT_LOCKED');
        return true;
      }
    );
  });

  await t.test('4. Feature entitlement: Personal plan can export contacts', async () => {
    const buffer = await excelService.exportGuests(userPersonal.id);
    assert.ok(buffer instanceof Buffer);
    assert.ok(buffer.length > 0);
  });

  await t.test('5. Campaign limit enforcement: Free plan limited to 2 campaigns per month', async () => {
    // 1st campaign succeeds
    const ev1 = await eventService.createEvent(userFree.id, {
      name: 'Event 1',
      eventType: 'BIRTHDAY',
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      venue: 'Grand Hall'
    });
    assert.ok(ev1.id);

    // 2nd campaign succeeds
    const ev2 = await eventService.createEvent(userFree.id, {
      name: 'Event 2',
      eventType: 'ANNIVERSARY',
      eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      venue: 'Palace Grounds'
    });
    assert.ok(ev2.id);

    // 3rd campaign must be BLOCKED
    await assert.rejects(
      async () => {
        await eventService.createEvent(userFree.id, {
          name: 'Event 3 (Should Fail)',
          eventType: 'FAMILY_GATHERING',
          eventDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          venue: 'Club House'
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.code, 'LIMIT_CAMPAIGNS_REACHED');
        assert.strictEqual(err.currentUsage, 2);
        assert.strictEqual(err.maxUsage, 2);
        assert.strictEqual(err.upgradeRecommendation, 'PERSONAL');
        return true;
      }
    );
  });

  await t.test('6. Shared Family Workspace: Free user cannot invite members', async () => {
    await assert.rejects(
      async () => {
        await workspaceService.inviteMember(userFree.id, {
          email: 'family_member@example.com',
          name: 'Brother'
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.code, 'FEATURE_FAMILY_WORKSPACE_LOCKED');
        return true;
      }
    );
  });

  await t.test('7. Shared Family Workspace: Family plan can invite 1 member (max 2 total)', async () => {
    // 1st member invitation succeeds (total 2 including owner)
    const invite = await workspaceService.inviteMember(userFamily.id, {
      email: invitedMember.email,
      name: 'Spouse',
      role: 'ADMIN'
    });
    assert.ok(invite.id);
    assert.strictEqual(invite.status, 'PENDING');

    // 2nd member invitation must be BLOCKED (would exceed max 2 members)
    await assert.rejects(
      async () => {
        await workspaceService.inviteMember(userFamily.id, {
          email: 'extra_person@example.com',
          name: 'Cousin'
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.code, 'LIMIT_WORKSPACE_MEMBERS_REACHED');
        assert.strictEqual(err.maxUsage, 2);
        assert.strictEqual(err.upgradeRecommendation, 'FAMILY_PLUS');
        return true;
      }
    );

    // Member accepts invitation
    const acceptRes = await workspaceService.acceptInvite(invite.id, invitedMember.id);
    assert.strictEqual(acceptRes.success, true);
    assert.strictEqual(acceptRes.membership.status, 'ACCEPTED');

    // Verify workspace details report 2 active members
    const ws = await workspaceService.getWorkspaceDetails(userFamily.id);
    assert.strictEqual(ws.membersCount.totalOccupied, 2);
    assert.strictEqual(ws.membersCount.remainingSlots, 0);
  });

  await t.test('8. Shared Family Workspace: Removing member does NOT delete shared data', async () => {
    // Create guest under family workspace
    const guest = await guestService.createGuest(userFamily.id, {
      fullName: 'Uncle Sharma',
      whatsappNumber: `+9198765${String(testSuffix).slice(-5)}`,
      relation: 'Family'
    });
    assert.ok(guest.id);

    // Get membership record
    const ws = await workspaceService.getWorkspaceDetails(userFamily.id);
    const memberRecord = ws.acceptedMembers[0];
    assert.ok(memberRecord);

    // Owner removes member
    const removeRes = await workspaceService.removeMember(userFamily.id, memberRecord.id);
    assert.strictEqual(removeRes.success, true);

    // Verify guest still exists intact
    const remainingGuest = await prisma.guest.findUnique({ where: { id: guest.id } });
    assert.ok(remainingGuest, 'Guest data must not be deleted when a family member is removed');
    assert.strictEqual(remainingGuest.fullName, 'Uncle Sharma');
  });

  await t.test('9. Automated WhatsApp quota: Free plan blocked from automated WhatsApp', async () => {
    await assert.rejects(
      async () => {
        await subscriptionService.enforceLimit(userFree.id, 'SEND_AUTOMATED_WHATSAPP');
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.code, 'FEATURE_WHATSAPP_AUTOMATION_LOCKED');
        return true;
      }
    );
  });

  await t.test('10. Reminders: Festival reminders locked on Personal, unlocked on Family', async () => {
    // Personal user festival check fails
    await assert.rejects(
      async () => {
        await subscriptionService.enforceLimit(userPersonal.id, 'USE_REMINDERS', { reminderType: 'FESTIVAL' });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.code, 'FEATURE_FESTIVAL_REMINDERS_LOCKED');
        return true;
      }
    );

    // Family user festival check passes
    const allowed = await subscriptionService.enforceLimit(userFamily.id, 'USE_REMINDERS', { reminderType: 'FESTIVAL' });
    assert.strictEqual(allowed, true);
  });

  await t.test('11. Safe Downgrade: Downgrading to Free preserves all existing events and contacts', async () => {
    // Personal user creates contact and event
    const g = await guestService.createGuest(userPersonal.id, {
      fullName: 'VIP Client',
      whatsappNumber: `+9198711${String(testSuffix).slice(-5)}`
    });
    const ev = await eventService.createEvent(userPersonal.id, {
      name: 'Corporate Gala',
      eventType: 'OTHER',
      eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      venue: 'Taj Palace'
    });

    // Downgrade to FREE
    const downgraded = await subscriptionService.switchPlan(userPersonal.id, { targetPlanCode: 'FREE' });
    assert.strictEqual(downgraded.plan.code, 'FREE');

    // Verify existing records are still present
    const checkG = await prisma.guest.findUnique({ where: { id: g.id } });
    const checkEv = await prisma.event.findUnique({ where: { id: ev.id } });
    assert.ok(checkG, 'Existing guest must not be deleted on downgrade');
    assert.ok(checkEv, 'Existing event must not be deleted on downgrade');
  });

  await t.test('12. Live Quotas in getCurrentSubscription reflects real database usage', async () => {
    const sub = await subscriptionService.getCurrentSubscription(userFree.id);
    assert.strictEqual(sub.plan.code, 'FREE');
    assert.ok(sub.usage.contacts);
    assert.ok(sub.usage.campaigns);
    assert.ok(sub.usage.automatedWhatsApp);
    assert.ok(sub.usage.familyMembers);
    assert.strictEqual(sub.usage.campaigns.used, 2);
    assert.strictEqual(sub.usage.campaigns.limit, 2);
    assert.strictEqual(sub.usage.campaigns.remaining, 0);
  });
});
