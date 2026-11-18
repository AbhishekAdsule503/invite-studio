import prisma from '../src/database/prisma.js';

export async function runAdditiveMigration() {
  console.log('Running safe additive database migration...');
  const statements = [
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "priceMonthly" INTEGER DEFAULT 0;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "hasMonthlyBilling" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "hasYearlyBilling" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER DEFAULT 0;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "isLegacy" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "razorpayMonthlyPlanId" TEXT;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "razorpayYearlyPlanId" TEXT;`,
    `ALTER TABLE "UserSubscription" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT DEFAULT 'YEARLY';`,
    `ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT DEFAULT 'YEARLY';`,
    `CREATE INDEX IF NOT EXISTS "SubscriptionPlan_isLegacy_idx" ON "SubscriptionPlan"("isLegacy");`,
    `CREATE INDEX IF NOT EXISTS "SubscriptionPlan_displayOrder_idx" ON "SubscriptionPlan"("displayOrder");`
  ];

  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('Additive columns and indexes verified/created successfully.');
}

if (process.argv[1]?.endsWith('run-additive-migration.js')) {
  runAdditiveMigration()
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
