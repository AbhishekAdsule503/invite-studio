import prisma from '../../database/prisma.js';
import subscriptionService from '../../services/subscription.service.js';
import paymentService from '../../services/payments/payment.service.js';
import razorpayProvider from '../../services/payments/razorpayProvider.js';

// ==========================================
// 1. DASHBOARD ANALYTICS (AGGREGATE ONLY)
// ==========================================

export async function getDashboardStats(_req, res, next) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeSubs,
      trialSubs,
      expiredSubs,
      cancelledSubs,
      revenueResult,
      newRegistrationsCount,
      renewalsCount,
      plans,
      totalActivePlansCount,
      totalInactivePlansCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userSubscription.count({ where: { status: 'ACTIVE' } }),
      prisma.userSubscription.count({ where: { status: 'TRIAL' } }),
      prisma.userSubscription.count({ where: { status: 'EXPIRED' } }),
      prisma.userSubscription.count({ where: { status: 'CANCELLED' } }),
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: { status: 'SUCCESS' }
      }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.subscriptionHistory.count({
        where: { reason: { in: ['RENEWAL', 'RAZORPAY_PAYMENT'] } }
      }),
      prisma.subscriptionPlan.findMany({
        where: { isActive: true, isLegacy: false, code: { not: 'TRIAL' } },
        orderBy: [{ displayOrder: 'asc' }, { tier: 'asc' }],
        select: { id: true, name: true, code: true, tier: true, priceYearly: true, priceMonthly: true }
      }),
      prisma.subscriptionPlan.count({
        where: { isActive: true, isLegacy: false, code: { not: 'TRIAL' } }
      }),
      prisma.subscriptionPlan.count({
        where: { OR: [{ isActive: false }, { isLegacy: true }] }
      })
    ]);

    // Subscription distribution by plan (for active plans only)
    const distributionCounts = await prisma.userSubscription.groupBy({
      by: ['planId'],
      where: { status: 'ACTIVE' },
      _count: { id: true }
    });

    const subscriptionDistribution = plans.map((p) => {
      const match = distributionCounts.find((d) => d.planId === p.id);
      return {
        planName: p.name,
        planCode: p.code,
        tier: p.tier,
        priceYearly: p.priceYearly,
        priceMonthly: p.priceMonthly,
        count: match ? match._count.id : 0
      };
    });

    // Recent payments (up to 10 latest verified payments)
    const recentPayments = await prisma.paymentTransaction.findMany({
      where: { status: 'SUCCESS' },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { name: true, code: true } },
        user: { select: { id: true, mobile: true, name: true, email: true } }
      }
    });

    // Recent user signups (anonymized/aggregate safe)
    const recentUsers = await prisma.user.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        mobile: true,
        name: true,
        role: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            plan: { select: { name: true, code: true } }
          }
        }
      }
    });

    const totalRevenuePaise = revenueResult._sum.amount || 0;
    const totalRevenueRupees = Math.round(totalRevenuePaise / 100);

    return res.status(200).json({
      success: true,
      metrics: {
        totalUsers,
        activeSubscriptions: activeSubs,
        trialUsers: trialSubs,
        expiredSubscriptions: expiredSubs,
        cancelledSubscriptions: cancelledSubs,
        totalRevenueRupees,
        totalRevenuePaise,
        totalVerifiedTransactions: revenueResult._count.id || 0,
        newRegistrations30d: newRegistrationsCount,
        renewalsCount,
        totalActivePlans: totalActivePlansCount,
        totalInactivePlans: totalInactivePlansCount,
        totalActiveSubscribers: activeSubs
      },
      subscriptionDistribution,
      recentPayments,
      recentUsers,
      gatewayStatus: razorpayProvider.getStatus()
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 2. USER MANAGEMENT (PRIVACY RESTRICTED)
// ==========================================

export async function listUsers(req, res, next) {
  try {
    const { search = '', role, status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      ...(search
        ? {
            OR: [
              { mobile: { contains: search } },
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(role ? { role } : {}),
      ...(status !== undefined ? { isActive: status === 'true' || status === true } : {})
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          mobile: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              events: true,
              guests: true
            }
          },
          subscription: {
            select: {
              id: true,
              status: true,
              startsAt: true,
              expiresAt: true,
              plan: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  priceYearly: true
                }
              }
            }
          }
        }
      })
    ]);

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserDetails(req, res, next) {
  try {
    const { id } = req.params;

    // Strict privacy-safe user query: never exposes guest contacts or individual RSVPs
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        mobile: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            events: true,
            guests: true,
            customTemplates: true
          }
        },
        subscription: {
          include: { plan: true }
        },
        subscriptionHistory: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        paymentTransactions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Administrators cannot deactivate their own active session.'
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
      select: {
        id: true,
        mobile: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: isActive ? 'ADMIN_USER_REACTIVATED' : 'ADMIN_USER_SUSPENDED',
        resourceType: 'User',
        resourceId: id,
        metadata: JSON.stringify({
          targetUserMobile: updated.mobile,
          isActive,
          reason: reason || 'Super Admin account status modification'
        })
      }
    });

    return res.status(200).json({
      success: true,
      message: `User account has been ${isActive ? 'reactivated' : 'suspended'}.`,
      user: updated
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 3. PLAN MANAGEMENT
// ==========================================

export async function listPlansAdmin(req, res, next) {
  try {
    const includeLegacy = req.query.includeLegacy === 'true';
    const where = includeLegacy ? {} : { isLegacy: false };

    const plans = await prisma.subscriptionPlan.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { tier: 'asc' }
      ],
      include: {
        _count: {
          select: {
            subscriptions: true,
            paymentTransactions: true,
            subscriptionHistory: true
          }
        }
      }
    });

    const parsed = plans.map((p) => {
      let features = [];
      try {
        features = p.features ? JSON.parse(p.features) : [];
      } catch {
        features = [];
      }
      return { ...p, features };
    });

    return res.status(200).json({
      success: true,
      plans: parsed
    });
  } catch (error) {
    next(error);
  }
}

export async function createPlan(req, res, next) {
  try {
    const data = req.body;

    const existing = await prisma.subscriptionPlan.findUnique({
      where: { code: data.code.toUpperCase() }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: `A subscription plan with code ${data.code} already exists.`
      });
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: data.name.trim(),
        code: data.code.toUpperCase().trim(),
        priceYearly: parseInt(data.priceYearly, 10),
        priceMonthly: data.priceMonthly !== undefined ? parseInt(data.priceMonthly, 10) : 0,
        currency: data.currency || 'INR',
        hasMonthlyBilling: Boolean(data.hasMonthlyBilling),
        hasYearlyBilling: data.hasYearlyBilling !== undefined ? Boolean(data.hasYearlyBilling) : true,
        maxEvents: parseInt(data.maxEvents || data.maxCampaignsPerMonth || 2, 10),
        maxGuestsPerEvent: parseInt(data.maxGuestsPerEvent || 50, 10),
        maxPermanentGuests: parseInt(data.maxPermanentGuests || data.maxContacts || 100, 10),
        maxContacts: parseInt(data.maxContacts || data.maxPermanentGuests || 100, 10),
        maxCampaignsPerMonth: parseInt(data.maxCampaignsPerMonth || data.maxEvents || 2, 10),
        maxAutomatedWhatsApp: parseInt(data.maxAutomatedWhatsApp || 0, 10),
        maxWorkspaceMembers: parseInt(data.maxWorkspaceMembers || 1, 10),
        canExportContacts: Boolean(data.canExportContacts),
        canImportContacts: Boolean(data.canImportContacts),
        hasReminders: Boolean(data.hasReminders),
        reminderTypes: data.reminderTypes ? (typeof data.reminderTypes === 'string' ? data.reminderTypes : JSON.stringify(data.reminderTypes)) : null,
        canCustomBranding: Boolean(data.canCustomBranding),
        hasPrioritySupport: Boolean(data.hasPrioritySupport),
        hasFamilyCategorisation: Boolean(data.hasFamilyCategorisation),
        hasAdvancedSearch: Boolean(data.hasAdvancedSearch),
        canUploadCustomTemplates: Boolean(data.canUploadCustomTemplates),
        canCustomInviteUpload: Boolean(data.canCustomInviteUpload),
        tier: parseInt(data.tier || 0, 10),
        displayOrder: data.displayOrder !== undefined ? parseInt(data.displayOrder, 10) : 0,
        isPopular: Boolean(data.isPopular),
        description: data.description ? data.description.trim() : null,
        features: data.features ? JSON.stringify(data.features) : null,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        isLegacy: false,
        razorpayMonthlyPlanId: data.razorpayMonthlyPlanId || null,
        razorpayYearlyPlanId: data.razorpayYearlyPlanId || null
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'ADMIN_PLAN_CREATED',
        resourceType: 'SubscriptionPlan',
        resourceId: plan.id,
        metadata: JSON.stringify({ code: plan.code, priceYearly: plan.priceYearly, priceMonthly: plan.priceMonthly })
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully.',
      plan
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePlan(req, res, next) {
  try {
    const { id } = req.params;
    const data = req.body;

    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.priceYearly !== undefined ? { priceYearly: parseInt(data.priceYearly, 10) } : {}),
        ...(data.priceMonthly !== undefined ? { priceMonthly: parseInt(data.priceMonthly, 10) } : {}),
        ...(data.currency ? { currency: data.currency } : {}),
        ...(data.hasMonthlyBilling !== undefined ? { hasMonthlyBilling: Boolean(data.hasMonthlyBilling) } : {}),
        ...(data.hasYearlyBilling !== undefined ? { hasYearlyBilling: Boolean(data.hasYearlyBilling) } : {}),
        ...(data.maxEvents !== undefined ? { maxEvents: parseInt(data.maxEvents, 10) } : {}),
        ...(data.maxGuestsPerEvent !== undefined ? { maxGuestsPerEvent: parseInt(data.maxGuestsPerEvent, 10) } : {}),
        ...(data.maxPermanentGuests !== undefined ? { maxPermanentGuests: parseInt(data.maxPermanentGuests, 10) } : {}),
        ...(data.maxContacts !== undefined ? { maxContacts: parseInt(data.maxContacts, 10) } : {}),
        ...(data.maxCampaignsPerMonth !== undefined ? { maxCampaignsPerMonth: parseInt(data.maxCampaignsPerMonth, 10) } : {}),
        ...(data.maxAutomatedWhatsApp !== undefined ? { maxAutomatedWhatsApp: parseInt(data.maxAutomatedWhatsApp, 10) } : {}),
        ...(data.maxWorkspaceMembers !== undefined ? { maxWorkspaceMembers: parseInt(data.maxWorkspaceMembers, 10) } : {}),
        ...(data.canExportContacts !== undefined ? { canExportContacts: Boolean(data.canExportContacts) } : {}),
        ...(data.canImportContacts !== undefined ? { canImportContacts: Boolean(data.canImportContacts) } : {}),
        ...(data.hasReminders !== undefined ? { hasReminders: Boolean(data.hasReminders) } : {}),
        ...(data.reminderTypes !== undefined ? { reminderTypes: typeof data.reminderTypes === 'string' ? data.reminderTypes : JSON.stringify(data.reminderTypes) } : {}),
        ...(data.canCustomBranding !== undefined ? { canCustomBranding: Boolean(data.canCustomBranding) } : {}),
        ...(data.hasPrioritySupport !== undefined ? { hasPrioritySupport: Boolean(data.hasPrioritySupport) } : {}),
        ...(data.hasFamilyCategorisation !== undefined ? { hasFamilyCategorisation: Boolean(data.hasFamilyCategorisation) } : {}),
        ...(data.hasAdvancedSearch !== undefined ? { hasAdvancedSearch: Boolean(data.hasAdvancedSearch) } : {}),
        ...(data.canUploadCustomTemplates !== undefined ? { canUploadCustomTemplates: Boolean(data.canUploadCustomTemplates) } : {}),
        ...(data.canCustomInviteUpload !== undefined ? { canCustomInviteUpload: Boolean(data.canCustomInviteUpload) } : {}),
        ...(data.tier !== undefined ? { tier: parseInt(data.tier, 10) } : {}),
        ...(data.displayOrder !== undefined ? { displayOrder: parseInt(data.displayOrder, 10) } : {}),
        ...(data.isPopular !== undefined ? { isPopular: Boolean(data.isPopular) } : {}),
        ...(data.description !== undefined ? { description: data.description ? data.description.trim() : null } : {}),
        ...(data.features !== undefined ? { features: JSON.stringify(data.features) } : {}),
        ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
        ...(data.isLegacy !== undefined ? { isLegacy: Boolean(data.isLegacy) } : {}),
        ...(data.razorpayMonthlyPlanId !== undefined ? { razorpayMonthlyPlanId: data.razorpayMonthlyPlanId } : {}),
        ...(data.razorpayYearlyPlanId !== undefined ? { razorpayYearlyPlanId: data.razorpayYearlyPlanId } : {})
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'ADMIN_PLAN_UPDATED',
        resourceType: 'SubscriptionPlan',
        resourceId: plan.id,
        metadata: JSON.stringify({ code: plan.code, priceYearly: plan.priceYearly, priceMonthly: plan.priceMonthly })
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Subscription plan updated successfully.',
      plan
    });
  } catch (error) {
    next(error);
  }
}

export async function togglePlan(req, res, next) {
  try {
    const { id } = req.params;
    const current = await prisma.subscriptionPlan.findUnique({ where: { id } });

    if (!current) {
      return res.status(404).json({ success: false, error: 'Plan not found.' });
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: !current.isActive }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: updated.isActive ? 'ADMIN_PLAN_ENABLED' : 'ADMIN_PLAN_DISABLED',
        resourceType: 'SubscriptionPlan',
        resourceId: updated.id,
        metadata: JSON.stringify({ code: updated.code, isActive: updated.isActive })
      }
    });

    return res.status(200).json({
      success: true,
      message: `Plan ${updated.code} is now ${updated.isActive ? 'active' : 'disabled'}.`,
      plan: updated
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePlan(req, res, next) {
  try {
    const { id } = req.params;
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscriptions: true,
            paymentTransactions: true,
            subscriptionHistory: true
          }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found.' });
    }

    // Default platform plans cannot be deleted
    const defaultCodes = ['FREE', 'PERSONAL', 'FAMILY', 'FAMILY_PLUS', 'BASIC', 'STANDARD', 'PREMIUM', 'TRIAL'];
    if (defaultCodes.includes(plan.code)) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete default platform plan (${plan.code}). You may deactivate it instead.`
      });
    }

    const subCount = plan._count?.subscriptions || 0;
    const txCount = plan._count?.paymentTransactions || 0;
    const histCount = plan._count?.subscriptionHistory || 0;
    const totalRefs = subCount + txCount + histCount;

    if (totalRefs > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot permanently delete plan '${plan.name}' because it is referenced by ${subCount} subscription(s) and ${txCount} payment transaction(s). Please deactivate (disable) the plan instead to hide it from new customers while preserving billing history.`
      });
    }

    await prisma.subscriptionPlan.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'ADMIN_PLAN_DELETED',
        resourceType: 'SubscriptionPlan',
        resourceId: id,
        metadata: JSON.stringify({ code: plan.code, name: plan.name })
      }
    });

    return res.status(200).json({
      success: true,
      message: `Plan '${plan.name}' (${plan.code}) deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 4. SUBSCRIPTION MANAGEMENT & MANUAL OVERRIDES
// ==========================================

export async function listSubscriptions(req, res, next) {
  try {
    const { search = '', status, planId, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      ...(status ? { status } : {}),
      ...(planId ? { planId } : {}),
      ...(search
        ? {
            user: {
              OR: [
                { mobile: { contains: search } },
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
              ]
            }
          }
        : {})
    };

    const [total, subscriptions] = await Promise.all([
      prisma.userSubscription.count({ where }),
      prisma.userSubscription.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { updatedAt: 'desc' },
        include: {
          plan: true,
          user: {
            select: {
              id: true,
              mobile: true,
              name: true,
              email: true,
              role: true,
              createdAt: true
            }
          }
        }
      })
    ]);

    return res.status(200).json({
      success: true,
      subscriptions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function adjustSubscription(req, res, next) {
  try {
    const { id } = req.params; // userSubscription ID or userId
    const { planId, status, expiresAt, reason, notes } = req.body;

    const sub = await prisma.userSubscription.findFirst({
      where: { OR: [{ id }, { userId: id }] }
    });

    if (!sub) {
      return res.status(404).json({ success: false, error: 'Subscription not found.' });
    }

    const updated = await subscriptionService.manualAdjustSubscription({
      adminId: req.user.id,
      userId: sub.userId,
      planId,
      status,
      expiresAt,
      reason,
      notes
    });

    return res.status(200).json({
      success: true,
      message: 'Subscription adjusted successfully with audit trail.',
      subscription: updated
    });
  } catch (error) {
    next(error);
  }
}

export async function listPaymentsAdmin(req, res, next) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const result = await paymentService.getAllPaymentsAdmin({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      status
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 5. TEMPLATE MANAGEMENT (SYSTEM TEMPLATES)
// ==========================================

export async function listSystemTemplates(_req, res, next) {
  try {
    const templates = await prisma.invitationTemplate.findMany({
      where: { isSystem: true },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      templates
    });
  } catch (error) {
    next(error);
  }
}

export async function createSystemTemplate(req, res, next) {
  try {
    const { title, eventType, previewImageUrl, contentHtml, defaultMessage } = req.body;

    const template = await prisma.invitationTemplate.create({
      data: {
        title: title.trim(),
        eventType: eventType || null,
        previewImageUrl: previewImageUrl || null,
        contentHtml: contentHtml || null,
        defaultMessage: defaultMessage.trim(),
        isSystem: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'ADMIN_SYSTEM_TEMPLATE_CREATED',
        resourceType: 'InvitationTemplate',
        resourceId: template.id,
        metadata: JSON.stringify({ title: template.title, eventType: template.eventType })
      }
    });

    return res.status(201).json({
      success: true,
      message: 'System invitation template created successfully.',
      template
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSystemTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const { title, eventType, previewImageUrl, contentHtml, defaultMessage, isSystem } = req.body;

    const template = await prisma.invitationTemplate.update({
      where: { id },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(eventType !== undefined ? { eventType } : {}),
        ...(previewImageUrl !== undefined ? { previewImageUrl } : {}),
        ...(contentHtml !== undefined ? { contentHtml } : {}),
        ...(defaultMessage ? { defaultMessage: defaultMessage.trim() } : {}),
        ...(isSystem !== undefined ? { isSystem: Boolean(isSystem) } : {})
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'ADMIN_SYSTEM_TEMPLATE_UPDATED',
        resourceType: 'InvitationTemplate',
        resourceId: template.id,
        metadata: JSON.stringify({ title: template.title })
      }
    });

    return res.status(200).json({
      success: true,
      message: 'System template updated successfully.',
      template
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleSystemTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const template = await prisma.invitationTemplate.findUnique({ where: { id } });

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found.' });
    }

    const updated = await prisma.invitationTemplate.update({
      where: { id },
      data: { isSystem: !template.isSystem }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: updated.isSystem ? 'ADMIN_TEMPLATE_ENABLED' : 'ADMIN_TEMPLATE_DISABLED',
        resourceType: 'InvitationTemplate',
        resourceId: updated.id,
        metadata: JSON.stringify({ isSystem: updated.isSystem })
      }
    });

    return res.status(200).json({
      success: true,
      message: `Template is now ${updated.isSystem ? 'enabled as system template' : 'disabled'}.`,
      template: updated
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 6. SUPPORT MANAGEMENT
// ==========================================

export async function listSupportTickets(req, res, next) {
  try {
    const { status, priority, category, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(category ? { category } : {})
    };

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              name: true,
              email: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              mobile: true
            }
          }
        }
      })
    ]);

    return res.status(200).json({
      success: true,
      tickets,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSupportTicket(req, res, next) {
  try {
    const { id } = req.params;
    const { status, priority, adminNotes, assignedToId } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, mobile: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'ADMIN_SUPPORT_TICKET_UPDATED',
        resourceType: 'SupportTicket',
        resourceId: ticket.id,
        metadata: JSON.stringify({ status: ticket.status, priority: ticket.priority })
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Support ticket updated successfully.',
      ticket
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 7. SYSTEM SETTINGS
// ==========================================

export async function getSettings(_req, res, next) {
  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' }
    });

    const settingsMap = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return res.status(200).json({
      success: true,
      settings,
      settingsMap
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const { settings } = req.body;

    for (const item of settings) {
      await prisma.systemSetting.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          value: item.value.toString()
        },
        update: {
          value: item.value.toString()
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'ADMIN_SYSTEM_SETTINGS_UPDATED',
        resourceType: 'SystemSetting',
        metadata: JSON.stringify({ updatedKeys: settings.map((s) => s.key) })
      }
    });

    const updated = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' }
    });

    return res.status(200).json({
      success: true,
      message: 'System settings updated successfully.',
      settings: updated
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 8. AUDIT LOGS
// ==========================================

export async function listAuditLogs(req, res, next) {
  try {
    const { action, resourceType, page = 1, limit = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      ...(action ? { action } : {}),
      ...(resourceType ? { resourceType } : {})
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              mobile: true,
              name: true,
              role: true
            }
          }
        }
      })
    ]);

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    next(error);
  }
}
