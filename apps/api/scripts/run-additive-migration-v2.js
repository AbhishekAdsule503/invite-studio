import prisma from '../src/database/prisma.js';

export async function runAdditiveMigrationV2() {
  console.log('--- Running Safe Additive Database Migration V2 ---');

  const statements = [
    // 1. Create Enums if not existing
    `DO $$ BEGIN
      CREATE TYPE "WorkspaceMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
      CREATE TYPE "WorkspaceInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;`,

    // 2. Additive columns for Guest
    `ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);`,
    `ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "anniversaryDate" TIMESTAMP(3);`,
    `ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "category" TEXT;`,
    `ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "tags" TEXT;`,
    `ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "notes" TEXT;`,

    // 3. Additive columns for SubscriptionPlan
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxContacts" INTEGER DEFAULT 100;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxCampaignsPerMonth" INTEGER DEFAULT 2;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxAutomatedWhatsApp" INTEGER DEFAULT 0;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxWorkspaceMembers" INTEGER DEFAULT 1;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "canExportContacts" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "canImportContacts" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "hasReminders" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "reminderTypes" TEXT;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "canCustomBranding" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "hasPrioritySupport" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "hasFamilyCategorisation" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "hasAdvancedSearch" BOOLEAN DEFAULT false;`,

    // 4. Additive columns for UserSubscription
    `ALTER TABLE "UserSubscription" ADD COLUMN IF NOT EXISTS "currentPeriodStartsAt" TIMESTAMP(3);`,
    `ALTER TABLE "UserSubscription" ADD COLUMN IF NOT EXISTS "currentPeriodEndsAt" TIMESTAMP(3);`,
    `ALTER TABLE "UserSubscription" ADD COLUMN IF NOT EXISTS "monthlyAutomatedWhatsAppCount" INTEGER DEFAULT 0;`,
    `ALTER TABLE "UserSubscription" ADD COLUMN IF NOT EXISTS "razorpaySubscriptionId" TEXT;`,

    // 5. Create WorkspaceMember table
    `CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
      "id" TEXT NOT NULL,
      "workspaceId" TEXT NOT NULL,
      "userId" TEXT,
      "email" TEXT,
      "mobile" TEXT,
      "name" TEXT,
      "role" "WorkspaceMemberRole" NOT NULL DEFAULT 'MEMBER',
      "status" "WorkspaceInviteStatus" NOT NULL DEFAULT 'PENDING',
      "invitedById" TEXT NOT NULL,
      "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "acceptedAt" TIMESTAMP(3),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );`,

    `CREATE INDEX IF NOT EXISTS "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");`,
    `CREATE INDEX IF NOT EXISTS "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");`,
    `CREATE INDEX IF NOT EXISTS "WorkspaceMember_email_idx" ON "WorkspaceMember"("email");`,
    `CREATE INDEX IF NOT EXISTS "WorkspaceMember_mobile_idx" ON "WorkspaceMember"("mobile");`,
    `CREATE INDEX IF NOT EXISTS "WorkspaceMember_status_idx" ON "WorkspaceMember"("status");`,

    // 6. Create AutomatedWhatsAppLog table
    `CREATE TABLE IF NOT EXISTS "AutomatedWhatsAppLog" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "invitationId" TEXT,
      "recipientPhone" TEXT NOT NULL,
      "templateName" TEXT,
      "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
      "providerMessageId" TEXT,
      "billingPeriodStart" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AutomatedWhatsAppLog_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "AutomatedWhatsAppLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,

    `CREATE INDEX IF NOT EXISTS "AutomatedWhatsAppLog_userId_billingPeriodStart_idx" ON "AutomatedWhatsAppLog"("userId", "billingPeriodStart");`,
    `CREATE INDEX IF NOT EXISTS "AutomatedWhatsAppLog_status_idx" ON "AutomatedWhatsAppLog"("status");`
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      console.warn(`[AdditiveMigrationV2] Statement warning: ${err.message}`);
    }
  }

  console.log('✔ Additive database migration V2 completed successfully.');
}

if (process.argv[1]?.endsWith('run-additive-migration-v2.js')) {
  runAdditiveMigrationV2()
    .catch((err) => {
      console.error('Fatal migration error:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
