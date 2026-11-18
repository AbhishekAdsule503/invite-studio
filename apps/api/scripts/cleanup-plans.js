import prisma from '../src/database/prisma.js';

export async function cleanupSubscriptionPlans() {
  console.log('=== Starting Subscription Plan Audit & Cleanup ===');

  const allPlans = await prisma.subscriptionPlan.findMany({
    include: {
      subscriptions: true,
      paymentTransactions: true,
      subscriptionHistory: true
    }
  });

  console.log(`Audited total existing plans: ${allPlans.length}`);

  const defaultCodes = ['BASIC', 'STANDARD', 'PREMIUM', 'TRIAL'];

  const stats = {
    originalCount: allPlans.length,
    duplicateLegacyFound: 0,
    safelyDeleted: 0,
    archivedDeactivated: 0,
    activePlans: [],
    affectedSubscribers: 0
  };

  const toDeleteIds = [];
  const toArchiveIds = [];

  for (const plan of allPlans) {
    if (defaultCodes.includes(plan.code)) {
      continue;
    }

    stats.duplicateLegacyFound++;
    const refCount = plan.subscriptions.length + plan.paymentTransactions.length + plan.subscriptionHistory.length;

    if (refCount > 0) {
      // Must preserve customer subscription and billing references!
      toArchiveIds.push(plan.id);
    } else {
      toDeleteIds.push(plan.id);
    }
  }

  console.log(`Plans to safely delete: ${toDeleteIds.length}`);
  console.log(`Plans to archive/deactivate: ${toArchiveIds.length}`);

  // Execute cleanup in database transaction
  await prisma.$transaction(async (tx) => {
    // 1. Delete unreferenced plans
    if (toDeleteIds.length > 0) {
      await tx.subscriptionPlan.deleteMany({
        where: { id: { in: toDeleteIds } }
      });
      stats.safelyDeleted = toDeleteIds.length;
    }

    // 2. Archive referenced legacy plans
    if (toArchiveIds.length > 0) {
      await tx.subscriptionPlan.updateMany({
        where: { id: { in: toArchiveIds } },
        data: {
          isActive: false,
          isLegacy: true
        }
      });
      stats.archivedDeactivated = toArchiveIds.length;
    }

    // 3. Ensure BASIC is active and updated
    await tx.subscriptionPlan.upsert({
      where: { code: 'BASIC' },
      create: {
        name: 'Basic',
        code: 'BASIC',
        priceMonthly: 14900, // ₹149/mo
        priceYearly: 99900,  // ₹999/yr
        currency: 'INR',
        hasMonthlyBilling: true,
        hasYearlyBilling: true,
        maxEvents: 10,
        maxGuestsPerEvent: 150,
        maxPermanentGuests: 300,
        canUploadCustomTemplates: false,
        canCustomInviteUpload: false,
        tier: 1,
        displayOrder: 1,
        isPopular: false,
        isActive: true,
        isLegacy: false,
        description: 'Essential yearly plan for small to medium family gatherings',
        features: JSON.stringify([
          'Up to 10 Events / year',
          'Up to 150 Guests per Event',
          'Up to 300 Permanent Saved Guests',
          'All Standard Occasion Templates',
          'WhatsApp Personalized Invitations',
          'Private Aggregate RSVP Tracking',
          'Email Support'
        ])
      },
      update: {
        name: 'Basic',
        priceMonthly: 14900,
        priceYearly: 99900,
        currency: 'INR',
        hasMonthlyBilling: true,
        hasYearlyBilling: true,
        maxEvents: 10,
        maxGuestsPerEvent: 150,
        maxPermanentGuests: 300,
        canUploadCustomTemplates: false,
        canCustomInviteUpload: false,
        tier: 1,
        displayOrder: 1,
        isPopular: false,
        isActive: true,
        isLegacy: false
      }
    });

    // 4. Ensure STANDARD is active and updated
    await tx.subscriptionPlan.upsert({
      where: { code: 'STANDARD' },
      create: {
        name: 'Standard',
        code: 'STANDARD',
        priceMonthly: 29900, // ₹299/mo
        priceYearly: 249900, // ₹2,499/yr
        currency: 'INR',
        hasMonthlyBilling: true,
        hasYearlyBilling: true,
        maxEvents: 25,
        maxGuestsPerEvent: 500,
        maxPermanentGuests: 1000,
        canUploadCustomTemplates: true,
        canCustomInviteUpload: true,
        tier: 2,
        displayOrder: 2,
        isPopular: true,
        isActive: true,
        isLegacy: false,
        description: 'Most popular for active hosts and grand family celebrations',
        features: JSON.stringify([
          'Up to 25 Events / year',
          'Up to 500 Guests per Event',
          'Up to 1,000 Permanent Saved Guests',
          'Custom Occasion Template Studio',
          'Custom Invitation Card Uploads',
          'Excel Bulk Guest Import',
          'Priority WhatsApp Formats',
          'Standard Host Support'
        ])
      },
      update: {
        name: 'Standard',
        priceMonthly: 29900,
        priceYearly: 249900,
        currency: 'INR',
        hasMonthlyBilling: true,
        hasYearlyBilling: true,
        maxEvents: 25,
        maxGuestsPerEvent: 500,
        maxPermanentGuests: 1000,
        canUploadCustomTemplates: true,
        canCustomInviteUpload: true,
        tier: 2,
        displayOrder: 2,
        isPopular: true,
        isActive: true,
        isLegacy: false
      }
    });

    // 5. Ensure PREMIUM is active and updated
    await tx.subscriptionPlan.upsert({
      where: { code: 'PREMIUM' },
      create: {
        name: 'Premium',
        code: 'PREMIUM',
        priceMonthly: 59900, // ₹599/mo
        priceYearly: 499900, // ₹4,999/yr
        currency: 'INR',
        hasMonthlyBilling: true,
        hasYearlyBilling: true,
        maxEvents: 100,
        maxGuestsPerEvent: 2000,
        maxPermanentGuests: 5000,
        canUploadCustomTemplates: true,
        canCustomInviteUpload: true,
        tier: 3,
        displayOrder: 3,
        isPopular: false,
        isActive: true,
        isLegacy: false,
        description: 'Ultimate capacity and VIP support for massive celebrations',
        features: JSON.stringify([
          'Up to 100 Events / year',
          'Up to 2,000 Guests per Event',
          'Up to 5,000 Permanent Saved Guests',
          'Unlimited Custom Templates & Uploads',
          'Excel Bulk Import & Export',
          'VIP Event Branding Options',
          'Dedicated Priority Support',
          'Fast-track Feature Access'
        ])
      },
      update: {
        name: 'Premium',
        priceMonthly: 59900,
        priceYearly: 499900,
        currency: 'INR',
        hasMonthlyBilling: true,
        hasYearlyBilling: true,
        maxEvents: 100,
        maxGuestsPerEvent: 2000,
        maxPermanentGuests: 5000,
        canUploadCustomTemplates: true,
        canCustomInviteUpload: true,
        tier: 3,
        displayOrder: 3,
        isPopular: false,
        isActive: true,
        isLegacy: false
      }
    });

    // 6. Ensure TRIAL onboarding plan is preserved
    await tx.subscriptionPlan.upsert({
      where: { code: 'TRIAL' },
      create: {
        name: 'Free Trial',
        code: 'TRIAL',
        priceMonthly: 0,
        priceYearly: 0,
        currency: 'INR',
        hasMonthlyBilling: false,
        hasYearlyBilling: false,
        maxEvents: 3,
        maxGuestsPerEvent: 50,
        maxPermanentGuests: 100,
        canUploadCustomTemplates: true,
        canCustomInviteUpload: false,
        tier: 0,
        displayOrder: 0,
        isPopular: false,
        isActive: true,
        isLegacy: false,
        description: 'Experience Invite Studio with essential celebration features',
        features: JSON.stringify([
          'Up to 3 Events',
          'Up to 50 Guests per Event',
          'Up to 100 Permanent Saved Guests',
          'Standard Occasion Templates',
          'WhatsApp Click-to-Chat Flow',
          'Private Aggregate RSVP Headcounts'
        ])
      },
      update: {
        name: 'Free Trial',
        priceMonthly: 0,
        priceYearly: 0,
        currency: 'INR',
        hasMonthlyBilling: false,
        hasYearlyBilling: false,
        tier: 0,
        displayOrder: 0,
        isActive: true,
        isLegacy: false
      }
    });

    // Record audit log
    await tx.auditLog.create({
      data: {
        action: 'SUPER_ADMIN_PLAN_CLEANUP',
        resourceType: 'SubscriptionPlan',
        resourceId: 'PLATFORM_PLANS',
        metadata: JSON.stringify({
          originalCount: stats.originalCount,
          deletedCount: stats.safelyDeleted,
          archivedCount: stats.archivedDeactivated
        })
      }
    });
  });

  // Query final state
  const remainingActivePlans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true, isLegacy: false, priceYearly: { gt: 0 } },
    orderBy: { displayOrder: 'asc' }
  });

  stats.activePlans = remainingActivePlans.map((p) => ({
    code: p.code,
    name: p.name,
    priceMonthly: p.priceMonthly,
    priceYearly: p.priceYearly,
    tier: p.tier
  }));

  console.log('=== Cleanup Completed Successfully ===');
  console.log(JSON.stringify(stats, null, 2));
  return stats;
}

if (process.argv[1]?.endsWith('cleanup-plans.js')) {
  cleanupSubscriptionPlans()
    .catch((err) => {
      console.error('Plan cleanup failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
