import prisma from '../src/database/prisma.js';

export async function seedPlansAndSettings() {
  console.log('--- Seeding / Updating Subscription Plans & Settings ---');

  const plans = [
    {
      code: 'TRIAL',
      name: 'Free Trial',
      priceYearly: 0,
      currency: 'INR',
      maxEvents: 3,
      maxGuestsPerEvent: 50,
      maxPermanentGuests: 100,
      canUploadCustomTemplates: true,
      canCustomInviteUpload: false,
      tier: 0,
      isPopular: false,
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
    {
      code: 'BASIC',
      name: 'Basic',
      priceYearly: 99900, // ₹999 in paise
      currency: 'INR',
      maxEvents: 10,
      maxGuestsPerEvent: 150,
      maxPermanentGuests: 300,
      canUploadCustomTemplates: false,
      canCustomInviteUpload: false,
      tier: 1,
      isPopular: false,
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
    {
      code: 'STANDARD',
      name: 'Standard',
      priceYearly: 249900, // ₹2,499 in paise
      currency: 'INR',
      maxEvents: 25,
      maxGuestsPerEvent: 500,
      maxPermanentGuests: 1000,
      canUploadCustomTemplates: true,
      canCustomInviteUpload: true,
      tier: 2,
      isPopular: true,
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
    {
      code: 'PREMIUM',
      name: 'Premium',
      priceYearly: 499900, // ₹4,999 in paise
      currency: 'INR',
      maxEvents: 100,
      maxGuestsPerEvent: 2000,
      maxPermanentGuests: 5000,
      canUploadCustomTemplates: true,
      canCustomInviteUpload: true,
      tier: 3,
      isPopular: false,
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
    }
  ];

  for (const p of plans) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { code: p.code }
    });

    if (existing) {
      await prisma.subscriptionPlan.update({
        where: { code: p.code },
        data: {
          name: p.name,
          priceYearly: p.priceYearly,
          currency: p.currency,
          maxEvents: p.maxEvents,
          maxGuestsPerEvent: p.maxGuestsPerEvent,
          maxPermanentGuests: p.maxPermanentGuests,
          canUploadCustomTemplates: p.canUploadCustomTemplates,
          canCustomInviteUpload: p.canCustomInviteUpload,
          tier: p.tier,
          isPopular: p.isPopular,
          description: p.description,
          features: p.features,
          isActive: true
        }
      });
      console.log(`Updated plan: ${p.code} (${p.name})`);
    } else {
      await prisma.subscriptionPlan.create({
        data: p
      });
      console.log(`Created plan: ${p.code} (${p.name})`);
    }
  }

  // Seed default system settings
  const defaultSettings = [
    { key: 'trial_duration_days', value: '30', description: 'Default duration in days for free trial' },
    { key: 'grace_period_days', value: '7', description: 'Grace period in days after subscription expiry' },
    { key: 'support_email', value: 'support@invitestudio.in', description: 'Official support email address' },
    { key: 'support_phone', value: '+91 98765 43210', description: 'Official customer support phone' },
    { key: 'payment_gateway_mode', value: 'sandbox', description: 'Payment gateway mode (sandbox / live)' },
    { key: 'currency', value: 'INR', description: 'Default billing currency' }
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      create: s,
      update: { description: s.description }
    });
  }
  console.log('Seeded / Verified system settings.');

  console.log('--- Plan & Settings Seed Completed Successfully ---');
}

// Allow direct execution
if (process.argv[1]?.endsWith('seed-plans-settings.js')) {
  seedPlansAndSettings()
    .catch((err) => {
      console.error('Failed to seed plans & settings:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
