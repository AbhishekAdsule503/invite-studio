import 'dotenv/config';
import prisma from '../src/database/prisma.js';
import subscriptionService from '../src/services/subscription.service.js';
import paymentService from '../src/services/payments/payment.service.js';
import * as adminController from '../src/modules/admin/admin.controller.js';

async function runVerification() {
  console.log('====================================================');
  console.log('INVITE STUDIO: SUBSCRIPTION & PLAN MANAGEMENT AUDIT');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  try {
    // TEST 1: Exactly 3 default active subscription plans (plus trial for onboarding)
    console.log('--- TEST 1: Default Plans in DB ---');
    const activePublicPlans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true, isLegacy: false, code: { not: 'TRIAL' } },
      orderBy: { displayOrder: 'asc' }
    });
    console.log(`Found ${activePublicPlans.length} active customer-facing plans:`, activePublicPlans.map(p => `${p.name} (${p.code}) - Order: ${p.displayOrder}`));
    assert(activePublicPlans.length === 3, 'Exactly three active customer-facing plans exist');
    const codes = activePublicPlans.map(p => p.code);
    assert(codes.includes('BASIC') && codes.includes('STANDARD') && codes.includes('PREMIUM'), 'Active plans are BASIC, STANDARD, and PREMIUM');

    // TEST 2: Customer getAvailablePlans only returns active, non-legacy plans
    console.log('\n--- TEST 2: Customer Catalog API Filtering ---');
    const customerCatalog = await subscriptionService.getAvailablePlans();
    console.log(`Customer catalog returns ${customerCatalog.length} plans:`, customerCatalog.map(p => `${p.name} (${p.code})`));
    assert(customerCatalog.length === 3, 'Customer catalog returns exactly 3 plans');
    assert(customerCatalog.every(p => p.isActive && !p.isLegacy && p.code !== 'TRIAL'), 'Customer catalog filters out inactive, legacy, and trial plans');
    assert(customerCatalog.every(p => !p.code.startsWith('LIMIT_') && !p.code.startsWith('GLIMIT_')), 'Zero GLIMIT or LIMIT plans appear in customer catalog');

    // TEST 3: Subscriber Preservation
    console.log('\n--- TEST 3: Existing Subscribers Safety ---');
    const allSubs = await prisma.userSubscription.findMany({
      include: { plan: true }
    });
    console.log(`Total subscribers in database: ${allSubs.length}`);
    const activeSubs = allSubs.filter(s => s.status === 'ACTIVE');
    console.log(`Active paid subscribers: ${activeSubs.length}`);
    activeSubs.forEach(s => {
      console.log(`- User ${s.userId.slice(0, 8)} on plan ${s.plan.name} (${s.plan.code}), expires: ${s.expiresAt.toISOString().slice(0, 10)}`);
    });
    assert(allSubs.length >= 9, 'All 9 subscriber records are preserved intact');
    assert(allSubs.every(s => s.plan !== null), 'Every subscriber is mapped to a valid existing plan');

    // TEST 4: Super Admin Dashboard Metrics & Distribution
    console.log('\n--- TEST 4: Dashboard Distribution & Metrics ---');
    const mockReq = {};
    let dashboardResult = null;
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          dashboardResult = data;
          return data;
        }
      })
    };
    await adminController.getDashboardStats(mockReq, mockRes, (err) => { if (err) console.error(err); });
    assert(dashboardResult && dashboardResult.success, 'Dashboard stats API responds successfully');
    console.log('Dashboard metrics:', {
      totalActivePlans: dashboardResult.metrics.totalActivePlans,
      totalInactivePlans: dashboardResult.metrics.totalInactivePlans,
      activeSubscriptions: dashboardResult.metrics.activeSubscriptions,
      subscriptionDistribution: dashboardResult.subscriptionDistribution.map(d => `${d.planCode}: ${d.count}`)
    });
    assert(dashboardResult.metrics.totalActivePlans === 3, 'Dashboard reports exactly 3 total active plans');
    assert(dashboardResult.subscriptionDistribution.length === 3, 'Dashboard distribution has clean list of only active plans (no legacy clutter)');

    // TEST 5: Dynamic Plan Creation (Super Admin)
    console.log('\n--- TEST 5: Super Admin Plan Creation ---');
    const adminUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (!adminUser) throw new Error('No SUPER_ADMIN found in DB');

    const testPlanCode = `TEST_VIP_${Date.now()}`;
    const createReq = {
      user: { id: adminUser.id },
      body: {
        name: 'VIP Enterprise Plan',
        code: testPlanCode,
        priceYearly: 1499900,
        priceMonthly: 149900,
        hasMonthlyBilling: true,
        hasYearlyBilling: true,
        currency: 'INR',
        maxEvents: 50,
        maxGuestsPerEvent: 1000,
        maxPermanentGuests: 2000,
        canUploadCustomTemplates: true,
        canCustomInviteUpload: true,
        tier: 4,
        displayOrder: 4,
        isPopular: true,
        description: 'For high-scale event organizers and enterprises',
        features: ['Up to 50 Events', 'Up to 1,000 Guests/Event', 'VIP Dedicated Support']
      }
    };
    let createdPlanResult = null;
    await adminController.createPlan(createReq, {
      status: (c) => ({
        json: (data) => {
          createdPlanResult = data;
          return data;
        }
      })
    }, (err) => { if (err) console.error(err); });

    assert(createdPlanResult && createdPlanResult.success, 'Super Admin can successfully create a new plan');
    const createdPlan = createdPlanResult.plan;
    console.log(`Created Plan ID: ${createdPlan.id}, Name: ${createdPlan.name}, Code: ${createdPlan.code}`);

    // TEST 6: Newly Created Plan Appears in Customer Catalog
    console.log('\n--- TEST 6: Dynamic Availability in Customer Catalog ---');
    const updatedCatalog = await subscriptionService.getAvailablePlans();
    const foundInCatalog = updatedCatalog.find(p => p.id === createdPlan.id);
    assert(Boolean(foundInCatalog), 'Newly created active plan immediately appears in customer catalog');
    assert(foundInCatalog?.priceMonthly === 149900 && foundInCatalog?.hasMonthlyBilling === true, 'Plan preserves monthly billing and price from database');

    // TEST 7: Super Admin Edit Plan
    console.log('\n--- TEST 7: Super Admin Edit Plan ---');
    const updateReq = {
      params: { id: createdPlan.id },
      user: { id: adminUser.id },
      body: {
        name: 'VIP Enterprise Plus Plan',
        priceMonthly: 179900,
        displayOrder: 5
      }
    };
    let updatedPlanResult = null;
    await adminController.updatePlan(updateReq, {
      status: (c) => ({
        json: (data) => {
          updatedPlanResult = data;
          return data;
        }
      })
    }, (err) => { if (err) console.error(err); });

    assert(updatedPlanResult && updatedPlanResult.success, 'Super Admin can successfully edit plan details');
    const updatedDbPlan = await prisma.subscriptionPlan.findUnique({ where: { id: createdPlan.id } });
    assert(updatedDbPlan.name === 'VIP Enterprise Plus Plan' && updatedDbPlan.priceMonthly === 179900, 'Database reflects edited plan name and monthly price');

    // TEST 8: Monthly vs Yearly Order Creation & DB Price Calculation
    console.log('\n--- TEST 8: Order Creation & Server-Side Price Calculation ---');
    const hostUser = await prisma.user.findFirst({ where: { role: 'HOST' } });
    if (!hostUser) throw new Error('No HOST user found');

    const yearlyOrder = await paymentService.createSubscriptionOrder(hostUser.id, createdPlan.id, 'YEARLY');
    assert(yearlyOrder.amount === 1499900, 'Yearly order amount is calculated accurately from DB (₹14,999.00)');
    assert(yearlyOrder.billingCycle === 'YEARLY', 'Order records YEARLY billingCycle');

    const monthlyOrder = await paymentService.createSubscriptionOrder(hostUser.id, createdPlan.id, 'MONTHLY');
    assert(monthlyOrder.amount === 179900, 'Monthly order amount is calculated accurately from DB (₹1,799.00)');
    assert(monthlyOrder.billingCycle === 'MONTHLY', 'Order records MONTHLY billingCycle');

    // Clean up pending test transactions
    await prisma.paymentTransaction.deleteMany({
      where: { orderId: { in: [yearlyOrder.orderId, monthlyOrder.orderId] } }
    });

    // TEST 9: Deactivate Plan & Prevention of New Subscriptions
    console.log('\n--- TEST 9: Deactivate Plan Prevents New Orders ---');
    await adminController.togglePlan({ params: { id: createdPlan.id }, user: { id: adminUser.id } }, {
      status: (c) => ({ json: (d) => d })
    }, (e) => {});

    const deactivatedPlan = await prisma.subscriptionPlan.findUnique({ where: { id: createdPlan.id } });
    assert(deactivatedPlan.isActive === false, 'Plan is successfully deactivated (isActive: false)');

    let orderOnDeactivatedFailed = false;
    try {
      await paymentService.createSubscriptionOrder(hostUser.id, createdPlan.id, 'YEARLY');
    } catch (err) {
      orderOnDeactivatedFailed = true;
      console.log(`Deactivated order rejected with: "${err.message}"`);
    }
    assert(orderOnDeactivatedFailed, 'Deactivated plan cannot receive new checkout orders');

    // TEST 10: Delete Referenced Plan Rejection
    console.log('\n--- TEST 10: Protection of Referenced Plans ---');
    const standardPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'STANDARD' } });
    let deleteDefaultBlocked = false;
    let deleteDefaultError = '';
    await adminController.deletePlan({ params: { id: standardPlan.id }, user: { id: adminUser.id } }, {
      status: (code) => ({
        json: (data) => {
          if (code === 400) {
            deleteDefaultBlocked = true;
            deleteDefaultError = data.error;
          }
          return data;
        }
      })
    }, (e) => {});
    assert(deleteDefaultBlocked, 'Deletion of default platform plan (STANDARD) is blocked');
    console.log(`Default plan deletion rejected with: "${deleteDefaultError}"`);

    // Check archived legacy plan with transactions
    const legacyArchivedPlan = await prisma.subscriptionPlan.findFirst({ where: { isLegacy: true } });
    if (legacyArchivedPlan) {
      let deleteLegacyBlocked = false;
      let deleteLegacyError = '';
      await adminController.deletePlan({ params: { id: legacyArchivedPlan.id }, user: { id: adminUser.id } }, {
        status: (code) => ({
          json: (data) => {
            if (code === 400) {
              deleteLegacyBlocked = true;
              deleteLegacyError = data.error;
            }
            return data;
          }
        })
      }, (e) => {});
      assert(deleteLegacyBlocked, 'Deletion of plan with payment transactions is blocked');
      console.log(`Referenced legacy plan deletion rejected with: "${deleteLegacyError}"`);
    }

    // TEST 11: Permanent Deletion of Unreferenced Plan
    console.log('\n--- TEST 11: Permanent Deletion of Unreferenced Plan ---');
    let deleteSuccess = false;
    await adminController.deletePlan({ params: { id: createdPlan.id }, user: { id: adminUser.id } }, {
      status: (code) => ({
        json: (data) => {
          if (code === 200 && data.success) {
            deleteSuccess = true;
          }
          return data;
        }
      })
    }, (e) => {});
    assert(deleteSuccess, 'Unreferenced test plan was safely permanently deleted');

    const checkDeleted = await prisma.subscriptionPlan.findUnique({ where: { id: createdPlan.id } });
    assert(checkDeleted === null, 'Deleted plan no longer exists in database');

    // SUMMARY
    console.log('\n====================================================');
    console.log(`VERIFICATION SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('====================================================\n');
  } catch (error) {
    console.error('Audit failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
