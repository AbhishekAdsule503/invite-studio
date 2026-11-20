import prisma from '../src/database/prisma.js';

export async function seedFinalPlans() {
  console.log('--- INVITE STUDIO: Seeding Final 4-Tier Subscription Catalog ---');

  const plansData = [
    {
      code: 'FREE',
      name: 'Free',
      description: 'Ideal for getting started with digital invitations for small family celebrations.',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'INR',
      hasMonthlyBilling: true,
      hasYearlyBilling: false,
      maxContacts: 100,
      maxPermanentGuests: 100,
      maxCampaignsPerMonth: 2,
      maxEvents: 2,
      maxGuestsPerEvent: 50,
      maxAutomatedWhatsApp: 0,
      maxWorkspaceMembers: 1,
      canExportContacts: false,
      canImportContacts: false,
      hasReminders: false,
      reminderTypes: JSON.stringify([]),
      canCustomBranding: false,
      hasPrioritySupport: false,
      hasFamilyCategorisation: false,
      hasAdvancedSearch: false,
      canUploadCustomTemplates: false,
      canCustomInviteUpload: true,
      tier: 0,
      displayOrder: 1,
      isPopular: false,
      isActive: true,
      isLegacy: false,
      features: JSON.stringify([
        'Up to 100 saved contacts',
        '2 invitation campaigns per month',
        'Basic invitation templates (3 designs)',
        'Manual WhatsApp sharing (click-to-chat)',
        'Basic contact categories',
        'Basic event dashboard',
        '0 automated WhatsApp messages'
      ])
    },
    {
      code: 'PERSONAL',
      name: 'Personal',
      description: 'Perfect for personal celebrations, birthdays, anniversaries, and staying connected.',
      priceMonthly: 9900, // ₹99
      priceYearly: 99900,  // ₹999 / year
      currency: 'INR',
      hasMonthlyBilling: true,
      hasYearlyBilling: true,
      maxContacts: 1000,
      maxPermanentGuests: 1000,
      maxCampaignsPerMonth: 10,
      maxEvents: 10,
      maxGuestsPerEvent: 200,
      maxAutomatedWhatsApp: 100,
      maxWorkspaceMembers: 1,
      canExportContacts: true,
      canImportContacts: false,
      hasReminders: true,
      reminderTypes: JSON.stringify(['BIRTHDAY', 'ANNIVERSARY']),
      canCustomBranding: false,
      hasPrioritySupport: false,
      hasFamilyCategorisation: false,
      hasAdvancedSearch: false,
      canUploadCustomTemplates: true,
      canCustomInviteUpload: true,
      tier: 1,
      displayOrder: 2,
      isPopular: true,
      isActive: true,
      isLegacy: false,
      features: JSON.stringify([
        'Up to 1,000 saved contacts',
        '10 invitation campaigns per month',
        'Premium invitation templates (10 designs)',
        'Personalised invitation creation',
        'Contact groups & relationship labels',
        'Birthday & anniversary reminders',
        'Manual WhatsApp sharing',
        '100 automated WhatsApp messages / month',
        'Contact export (CSV & Excel)'
      ])
    },
    {
      code: 'FAMILY',
      name: 'Family',
      description: 'Ideal for joint families planning weddings, festivals, and multiple events together.',
      priceMonthly: 19900, // ₹199
      priceYearly: 199900,  // ₹1,999 / year
      currency: 'INR',
      hasMonthlyBilling: true,
      hasYearlyBilling: true,
      maxContacts: 3000,
      maxPermanentGuests: 3000,
      maxCampaignsPerMonth: 30,
      maxEvents: 30,
      maxGuestsPerEvent: 500,
      maxAutomatedWhatsApp: 250,
      maxWorkspaceMembers: 2, // Maximum 2 members including owner
      canExportContacts: true,
      canImportContacts: true,
      hasReminders: true,
      reminderTypes: JSON.stringify(['BIRTHDAY', 'ANNIVERSARY', 'FESTIVAL']),
      canCustomBranding: false,
      hasPrioritySupport: false,
      hasFamilyCategorisation: true,
      hasAdvancedSearch: true,
      canUploadCustomTemplates: true,
      canCustomInviteUpload: true,
      tier: 2,
      displayOrder: 3,
      isPopular: false,
      isActive: true,
      isLegacy: false,
      features: JSON.stringify([
        'Up to 3,000 saved contacts',
        '30 invitation campaigns per month',
        'All Personal & premium templates',
        'Family-wise contact categorisation',
        'Multiple event lists',
        'Birthday, anniversary & festival reminders',
        'Advanced contact search',
        'Manual WhatsApp sharing',
        '250 automated WhatsApp messages / month',
        'Excel contact import & export',
        'Shared family access (max 2 members)'
      ])
    },
    {
      code: 'FAMILY_PLUS',
      name: 'Family Plus',
      description: 'The ultimate celebration suite for large families, VIP events, and bespoke atelier stationery.',
      priceMonthly: 39900, // ₹399
      priceYearly: 399900,  // ₹3,999 / year
      currency: 'INR',
      hasMonthlyBilling: true,
      hasYearlyBilling: true,
      maxContacts: 10000,
      maxPermanentGuests: 10000,
      maxCampaignsPerMonth: 75,
      maxEvents: 75,
      maxGuestsPerEvent: 2000,
      maxAutomatedWhatsApp: 500,
      maxWorkspaceMembers: 5, // Maximum 5 members including owner
      canExportContacts: true,
      canImportContacts: true,
      hasReminders: true,
      reminderTypes: JSON.stringify(['BIRTHDAY', 'ANNIVERSARY', 'FESTIVAL', 'CUSTOM']),
      canCustomBranding: true,
      hasPrioritySupport: true,
      hasFamilyCategorisation: true,
      hasAdvancedSearch: true,
      canUploadCustomTemplates: true,
      canCustomInviteUpload: true,
      tier: 3,
      displayOrder: 4,
      isPopular: false,
      isActive: true,
      isLegacy: false,
      features: JSON.stringify([
        'Up to 10,000 saved contacts',
        '75 invitation campaigns per month',
        'All templates & exclusive designs',
        'Advanced contact segmentation & search',
        'Shared family access (max 5 members)',
        'Advanced event management',
        'Custom invitation branding & watermarks',
        '500 automated WhatsApp messages / month',
        'Advanced automated reminders',
        'Priority concierge support'
      ])
    }
  ];

  // 1. Upsert the four final default plans
  for (const planData of plansData) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { code: planData.code }
    });

    if (existing) {
      await prisma.subscriptionPlan.update({
        where: { code: planData.code },
        data: planData
      });
      console.log(`✔ Updated plan: ${planData.name} (${planData.code})`);
    } else {
      await prisma.subscriptionPlan.create({
        data: planData
      });
      console.log(`✔ Created plan: ${planData.name} (${planData.code})`);
    }
  }

  // 2. Mark previous default plans (BASIC, STANDARD, PREMIUM) as legacy to protect existing subscribers
  const legacyCodes = ['BASIC', 'STANDARD', 'PREMIUM'];
  for (const code of legacyCodes) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });

    if (plan) {
      const activeSubs = plan._count?.subscriptions || 0;
      await prisma.subscriptionPlan.update({
        where: { id: plan.id },
        data: {
          isLegacy: true,
          // If active subscribers exist, keep isActive: true so their login/access isn't broken,
          // but isLegacy: true hides it from new customer catalogs!
          isActive: activeSubs > 0
        }
      });
      console.log(`✔ Preserved legacy plan [${code}] (Subscribers: ${activeSubs}, isLegacy: true)`);
    }
  }

  // 3. Clean up unreferenced temporary LIMIT_* or GLIMIT_* plans
  const tempPlans = await prisma.subscriptionPlan.findMany({
    where: {
      OR: [
        { code: { startsWith: 'LIMIT_' } },
        { code: { startsWith: 'GLIMIT_' } },
        { code: { startsWith: 'TEST_' } }
      ]
    },
    include: {
      _count: {
        select: {
          subscriptions: true,
          paymentTransactions: true
        }
      }
    }
  });

  for (const tp of tempPlans) {
    const hasRefs = (tp._count?.subscriptions || 0) + (tp._count?.paymentTransactions || 0) > 0;
    if (!hasRefs) {
      await prisma.subscriptionPlan.delete({ where: { id: tp.id } });
      console.log(`✔ Safely deleted unreferenced test plan: ${tp.code}`);
    } else {
      await prisma.subscriptionPlan.update({
        where: { id: tp.id },
        data: { isLegacy: true, isActive: false }
      });
      console.log(`✔ Deactivated referenced test plan: ${tp.code}`);
    }
  }

  console.log('--- Plan Catalog Seeding Completed Successfully ---');
}

if (process.argv[1]?.endsWith('seed-final-plans.js')) {
  seedFinalPlans()
    .catch((err) => {
      console.error('Plan seeding error:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
