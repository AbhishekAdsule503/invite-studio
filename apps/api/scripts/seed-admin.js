import prisma from '../src/database/prisma.js';
import { normalizePhone } from '@smart-invitation/shared';

/**
 * CLI command to securely provision or promote a Super Admin.
 * Usage:
 *   node scripts/seed-admin.js --mobile +919876543210 --name "Platform Admin" --email admin@invitestudio.in
 * Or set environment variables:
 *   ADMIN_MOBILE=+919876543210 ADMIN_NAME="Super Admin" node scripts/seed-admin.js
 */
export async function provisionSuperAdmin() {
  const args = process.argv.slice(2);
  let mobile = process.env.ADMIN_MOBILE || '+919999999999';
  let name = process.env.ADMIN_NAME || 'Super Administrator';
  let email = process.env.ADMIN_EMAIL || 'admin@invitestudio.in';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mobile' && args[i + 1]) {
      mobile = args[i + 1];
    } else if (args[i] === '--name' && args[i + 1]) {
      name = args[i + 1];
    } else if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
    }
  }

  const normalizedMobile = normalizePhone(mobile);
  if (!normalizedMobile) {
    console.error('Error: A valid mobile number is required.');
    process.exit(1);
  }

  console.log(`Provisioning Super Admin for mobile: ${normalizedMobile}`);

  // Fetch or create Premium plan
  let premiumPlan = await prisma.subscriptionPlan.findUnique({
    where: { code: 'PREMIUM' }
  });

  if (!premiumPlan) {
    premiumPlan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true }
    });
  }

  const existingUser = await prisma.user.findUnique({
    where: { mobile: normalizedMobile },
    include: { subscription: true }
  });

  let adminUser;

  if (existingUser) {
    adminUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: 'SUPER_ADMIN',
        isActive: true,
        name: existingUser.name || name,
        email: existingUser.email || email
      }
    });

    console.log(`Existing user ${normalizedMobile} promoted to SUPER_ADMIN.`);
  } else {
    adminUser = await prisma.user.create({
      data: {
        mobile: normalizedMobile,
        name,
        email,
        role: 'SUPER_ADMIN',
        isActive: true,
        subscription: premiumPlan ? {
          create: {
            planId: premiumPlan.id,
            status: 'ACTIVE',
            startsAt: new Date(),
            expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) // 10 years
          }
        } : undefined
      }
    });
    console.log(`Created new SUPER_ADMIN user: ${normalizedMobile}`);
  }

  // Record audit log
  await prisma.auditLog.create({
    data: {
      actorId: adminUser.id,
      action: 'ADMIN_PROVISIONED',
      resourceType: 'User',
      resourceId: adminUser.id,
      metadata: JSON.stringify({
        mobile: normalizedMobile,
        role: 'SUPER_ADMIN',
        timestamp: new Date().toISOString()
      })
    }
  });

  console.log('Super Admin provisioning completed successfully.');
  console.log({
    id: adminUser.id,
    mobile: adminUser.mobile,
    role: adminUser.role,
    name: adminUser.name,
    email: adminUser.email
  });
}

if (process.argv[1]?.endsWith('seed-admin.js')) {
  provisionSuperAdmin()
    .catch((err) => {
      console.error('Failed to provision super admin:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
