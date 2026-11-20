import prisma from '../database/prisma.js';

export class SubscriptionService {
  /**
   * Fetches grace period days from system settings
   * @returns {Promise<number>}
   */
  async getGracePeriodDays() {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'grace_period_days' }
    });
    return setting ? parseInt(setting.value, 10) || 7 : 7;
  }

  /**
   * Evaluates subscription lifecycle state considering expiry & grace period
   */
  async evaluateSubscriptionState(subscription) {
    if (!subscription) return null;

    const graceDays = await this.getGracePeriodDays();
    const now = new Date();
    const expiresAt = new Date(subscription.expiresAt);
    const diffMs = expiresAt.getTime() - now.getTime();
    const isPastExpiry = diffMs < 0;

    let inGracePeriod = false;
    let graceDaysRemaining = 0;
    let isExpired = false;
    let effectiveStatus = subscription.status;

    // Free plan with 0 price never expires
    if (subscription.plan?.code === 'FREE' || (subscription.plan?.priceMonthly === 0 && subscription.plan?.priceYearly === 0)) {
      return {
        status: 'ACTIVE',
        isExpired: false,
        inGracePeriod: false,
        graceDaysRemaining: 0,
        daysRemaining: 9999,
        graceDaysTotal: graceDays
      };
    }

    if (subscription.status === 'CANCELLED') {
      isExpired = isPastExpiry;
      effectiveStatus = isPastExpiry ? 'EXPIRED' : 'CANCELLED';
    } else if (isPastExpiry) {
      const gracePeriodEnds = new Date(expiresAt.getTime() + graceDays * 24 * 60 * 60 * 1000);
      if (now.getTime() <= gracePeriodEnds.getTime()) {
        inGracePeriod = true;
        graceDaysRemaining = Math.max(0, Math.ceil((gracePeriodEnds.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
        effectiveStatus = 'TRIAL_GRACE';
      } else {
        isExpired = true;
        effectiveStatus = 'EXPIRED';

        if (subscription.status !== 'EXPIRED') {
          await prisma.userSubscription.update({
            where: { id: subscription.id },
            data: { status: 'EXPIRED' }
          });
        }
      }
    }

    const daysRemaining = isPastExpiry ? 0 : Math.ceil(diffMs / (24 * 60 * 60 * 1000));

    return {
      status: effectiveStatus,
      isExpired,
      inGracePeriod,
      graceDaysRemaining,
      daysRemaining,
      graceDaysTotal: graceDays
    };
  }

  /**
   * Resolves or initializes current monthly billing period window
   * @param {Object} subscription 
   * @returns {Promise<{ start: Date, end: Date }>}
   */
  async resolveBillingPeriod(subscription) {
    const now = new Date();
    const existingStart = subscription.currentPeriodStartsAt ? new Date(subscription.currentPeriodStartsAt) : null;
    const existingEnd = subscription.currentPeriodEndsAt ? new Date(subscription.currentPeriodEndsAt) : null;

    if (existingStart && existingEnd && now >= existingStart && now < existingEnd) {
      return { start: existingStart, end: existingEnd };
    }

    // Compute monthly window from startsAt anchor (30-day billing cycle)
    const anchor = new Date(subscription.startsAt || subscription.createdAt);
    const cycleMs = 30 * 24 * 60 * 60 * 1000;
    const elapsedCycles = Math.floor(Math.max(0, now.getTime() - anchor.getTime()) / cycleMs);
    const start = new Date(anchor.getTime() + elapsedCycles * cycleMs);
    const end = new Date(start.getTime() + cycleMs);

    // Save updated billing period boundaries
    try {
      await prisma.userSubscription.update({
        where: { id: subscription.id },
        data: {
          currentPeriodStartsAt: start,
          currentPeriodEndsAt: end
        }
      });
    } catch {
      // Ignore background write conflicts
    }

    return { start, end };
  }

  /**
   * Retrieves active subscription, quotas, and current consumption for a user/workspace
   * @param {string} userId - Workspace owner userId
   */
  async getCurrentSubscription(userId) {
    let subscription = await prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true }
    });

    if (!subscription) {
      // Auto-assign default FREE plan if user has none
      let freePlan = await prisma.subscriptionPlan.findUnique({
        where: { code: 'FREE' }
      });

      if (!freePlan) {
        freePlan = await prisma.subscriptionPlan.findFirst({
          where: { isActive: true, isLegacy: false, tier: 0 }
        });
      }

      const now = new Date();
      const initialPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const lifetimeEnd = new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000); // 10 years

      subscription = await prisma.userSubscription.create({
        data: {
          userId,
          planId: freePlan.id,
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          startsAt: now,
          expiresAt: lifetimeEnd,
          currentPeriodStartsAt: now,
          currentPeriodEndsAt: initialPeriodEnd
        },
        include: { plan: true }
      });
    }

    const lifecycle = await this.evaluateSubscriptionState(subscription);
    const billingPeriod = await this.resolveBillingPeriod(subscription);

    const plan = subscription.plan;
    const contactLimit = plan.maxContacts || plan.maxPermanentGuests || 100;
    const campaignLimit = plan.maxCampaignsPerMonth || plan.maxEvents || 2;
    const whatsAppLimit = plan.maxAutomatedWhatsApp || 0;
    const memberLimit = plan.maxWorkspaceMembers || 1;

    // Calculate real database usage
    const [contactsCount, campaignsCount, whatsAppCount, workspaceMembersCount] = await Promise.all([
      // 1. Unique saved contacts in workspace
      prisma.guest.count({ where: { userId } }),
      // 2. Newly created campaigns in current billing cycle
      prisma.event.count({
        where: {
          userId,
          createdAt: {
            gte: billingPeriod.start,
            lt: billingPeriod.end
          }
        }
      }),
      // 3. Automated WhatsApp messages dispatched in current billing cycle
      prisma.automatedWhatsAppLog.count({
        where: {
          userId,
          billingPeriodStart: billingPeriod.start,
          status: { in: ['SUBMITTED', 'DELIVERED'] }
        }
      }),
      // 4. Workspace members occupying slots (owner + accepted + pending invitations)
      prisma.workspaceMember.count({
        where: {
          workspaceId: userId,
          status: { in: ['ACCEPTED', 'PENDING'] }
        }
      }).then((count) => count + 1)
    ]);

    let parsedFeatures = [];
    try {
      parsedFeatures = plan.features ? JSON.parse(plan.features) : [];
    } catch {
      parsedFeatures = [];
    }

    let parsedReminderTypes = [];
    try {
      parsedReminderTypes = plan.reminderTypes ? JSON.parse(plan.reminderTypes) : [];
    } catch {
      parsedReminderTypes = [];
    }

    return {
      id: subscription.id,
      userId: subscription.userId,
      status: subscription.status,
      effectiveStatus: lifecycle.status,
      isExpired: lifecycle.isExpired,
      inGracePeriod: lifecycle.inGracePeriod,
      graceDaysRemaining: lifecycle.graceDaysRemaining,
      daysRemaining: lifecycle.daysRemaining,
      billingCycle: subscription.billingCycle || 'MONTHLY',
      startsAt: subscription.startsAt,
      expiresAt: subscription.expiresAt,
      cancelledAt: subscription.cancelledAt,
      billingPeriod: {
        start: billingPeriod.start.toISOString(),
        end: billingPeriod.end.toISOString()
      },
      plan: {
        id: plan.id,
        name: plan.name,
        code: plan.code,
        tier: plan.tier,
        priceMonthly: plan.priceMonthly || 0,
        priceYearly: plan.priceYearly || 0,
        currency: plan.currency,
        maxContacts: contactLimit,
        maxCampaignsPerMonth: campaignLimit,
        maxAutomatedWhatsApp: whatsAppLimit,
        maxWorkspaceMembers: memberLimit,
        maxGuestsPerEvent: plan.maxGuestsPerEvent,
        canExportContacts: Boolean(plan.canExportContacts),
        canImportContacts: Boolean(plan.canImportContacts),
        hasReminders: Boolean(plan.hasReminders),
        reminderTypes: parsedReminderTypes,
        canCustomBranding: Boolean(plan.canCustomBranding),
        hasPrioritySupport: Boolean(plan.hasPrioritySupport),
        hasFamilyCategorisation: Boolean(plan.hasFamilyCategorisation),
        hasAdvancedSearch: Boolean(plan.hasAdvancedSearch),
        canUploadCustomTemplates: Boolean(plan.canUploadCustomTemplates),
        canCustomInviteUpload: Boolean(plan.canCustomInviteUpload),
        isPopular: plan.isPopular,
        description: plan.description,
        features: parsedFeatures
      },
      usage: {
        contacts: {
          used: contactsCount,
          limit: contactLimit,
          remaining: Math.max(0, contactLimit - contactsCount),
          percentage: Math.min(100, Math.round((contactsCount / contactLimit) * 100))
        },
        campaigns: {
          used: campaignsCount,
          limit: campaignLimit,
          remaining: Math.max(0, campaignLimit - campaignsCount),
          percentage: Math.min(100, Math.round((campaignsCount / campaignLimit) * 100))
        },
        automatedWhatsApp: {
          used: whatsAppCount,
          limit: whatsAppLimit,
          remaining: Math.max(0, whatsAppLimit - whatsAppCount),
          percentage: whatsAppLimit > 0 ? Math.min(100, Math.round((whatsAppCount / whatsAppLimit) * 100)) : 0
        },
        familyMembers: {
          used: workspaceMembersCount,
          limit: memberLimit,
          remaining: Math.max(0, memberLimit - workspaceMembersCount),
          percentage: Math.min(100, Math.round((workspaceMembersCount / memberLimit) * 100))
        },
        // Legacy backward-compatibility aliases
        events: {
          used: campaignsCount,
          limit: campaignLimit,
          remaining: Math.max(0, campaignLimit - campaignsCount),
          percentage: Math.min(100, Math.round((campaignsCount / campaignLimit) * 100))
        },
        permanentGuests: {
          used: contactsCount,
          limit: contactLimit,
          remaining: Math.max(0, contactLimit - contactsCount),
          percentage: Math.min(100, Math.round((contactsCount / contactLimit) * 100))
        },
        maxGuestsPerEvent: plan.maxGuestsPerEvent
      }
    };
  }

  /**
   * Retrieves all available active subscription plans for users
   */
  async getAvailablePlans() {
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        isLegacy: false,
        code: { not: 'TRIAL' }
      },
      orderBy: [
        { displayOrder: 'asc' },
        { tier: 'asc' }
      ]
    });

    return plans.map((p) => {
      let features = [];
      try {
        features = p.features ? JSON.parse(p.features) : [];
      } catch {
        features = [];
      }
      let reminderTypes = [];
      try {
        reminderTypes = p.reminderTypes ? JSON.parse(p.reminderTypes) : [];
      } catch {
        reminderTypes = [];
      }
      return {
        ...p,
        features,
        reminderTypes
      };
    });
  }

  /**
   * Centralized backend subscription entitlement & quota enforcement
   * @param {string} userId - Workspace owner userId
   * @param {string} action - Action being guarded
   * @param {Object} [meta] - Contextual metadata (count, reminderType, etc.)
   */
  async enforceLimit(userId, action, meta = {}) {
    const current = await this.getCurrentSubscription(userId);

    // If subscription is expired beyond grace period, block all write actions
    if (current.isExpired) {
      const err = new Error('Your subscription has expired. Please upgrade or renew your plan to continue.');
      err.statusCode = 403;
      err.code = 'SUBSCRIPTION_EXPIRED';
      err.upgradeRecommendation = 'PERSONAL';
      throw err;
    }

    const { plan, usage } = current;

    switch (action) {
      case 'ADD_CONTACT':
      case 'ADD_PERMANENT_GUEST': {
        const additional = meta.count || 1;
        if (usage.contacts.used + additional > plan.maxContacts) {
          const rec = plan.tier === 0 ? 'PERSONAL' : plan.tier === 1 ? 'FAMILY' : 'FAMILY_PLUS';
          const err = new Error(
            `Contact limit reached (${usage.contacts.used}/${plan.maxContacts} contacts). Upgrade your plan to save more contacts.`
          );
          err.statusCode = 403;
          err.code = 'LIMIT_CONTACTS_REACHED';
          err.currentUsage = usage.contacts.used;
          err.maxUsage = plan.maxContacts;
          err.upgradeRecommendation = rec;
          throw err;
        }
        break;
      }

      case 'IMPORT_CONTACTS': {
        if (!plan.canImportContacts) {
          const err = new Error(
            'Excel contact import is available on Family and Family Plus plans. Upgrade your plan to import contacts in bulk.'
          );
          err.statusCode = 403;
          err.code = 'FEATURE_IMPORT_LOCKED';
          err.upgradeRecommendation = 'FAMILY';
          throw err;
        }
        const incomingCount = meta.count || 0;
        if (usage.contacts.used + incomingCount > plan.maxContacts) {
          const rec = plan.tier < 2 ? 'FAMILY' : 'FAMILY_PLUS';
          const err = new Error(
            `Importing ${incomingCount} contacts exceeds your saved contact limit (${usage.contacts.used}/${plan.maxContacts}). Please upgrade or reduce the file.`
          );
          err.statusCode = 403;
          err.code = 'LIMIT_CONTACTS_REACHED';
          err.currentUsage = usage.contacts.used;
          err.maxUsage = plan.maxContacts;
          err.upgradeRecommendation = rec;
          throw err;
        }
        break;
      }

      case 'EXPORT_CONTACTS': {
        if (!plan.canExportContacts) {
          const err = new Error(
            'Contact export is available on Personal, Family, and Family Plus plans. Upgrade your plan to export your address book.'
          );
          err.statusCode = 403;
          err.code = 'FEATURE_EXPORT_LOCKED';
          err.upgradeRecommendation = 'PERSONAL';
          throw err;
        }
        break;
      }

      case 'CREATE_CAMPAIGN':
      case 'CREATE_EVENT': {
        if (usage.campaigns.used >= plan.maxCampaignsPerMonth) {
          const rec = plan.tier === 0 ? 'PERSONAL' : plan.tier === 1 ? 'FAMILY' : 'FAMILY_PLUS';
          const err = new Error(
            `Monthly campaign limit reached (${usage.campaigns.used}/${plan.maxCampaignsPerMonth} campaigns this month). Upgrade your plan to launch more campaigns.`
          );
          err.statusCode = 403;
          err.code = 'LIMIT_CAMPAIGNS_REACHED';
          err.currentUsage = usage.campaigns.used;
          err.maxUsage = plan.maxCampaignsPerMonth;
          err.upgradeRecommendation = rec;
          throw err;
        }
        break;
      }

      case 'SEND_AUTOMATED_WHATSAPP': {
        if (plan.maxAutomatedWhatsApp <= 0) {
          const err = new Error(
            'Automated WhatsApp messaging is not included in the Free plan. Upgrade to Personal (100/mo), Family (250/mo), or Family Plus (500/mo).'
          );
          err.statusCode = 403;
          err.code = 'FEATURE_WHATSAPP_AUTOMATION_LOCKED';
          err.upgradeRecommendation = 'PERSONAL';
          throw err;
        }
        const count = meta.count || 1;
        if (usage.automatedWhatsApp.used + count > plan.maxAutomatedWhatsApp) {
          const rec = plan.tier < 2 ? 'FAMILY' : 'FAMILY_PLUS';
          const err = new Error(
            `Monthly automated WhatsApp quota reached (${usage.automatedWhatsApp.used}/${plan.maxAutomatedWhatsApp} messages). Upgrade your plan for additional message quota.`
          );
          err.statusCode = 403;
          err.code = 'LIMIT_WHATSAPP_REACHED';
          err.currentUsage = usage.automatedWhatsApp.used;
          err.maxUsage = plan.maxAutomatedWhatsApp;
          err.upgradeRecommendation = rec;
          throw err;
        }
        break;
      }

      case 'INVITE_WORKSPACE_MEMBER': {
        if (plan.maxWorkspaceMembers <= 1) {
          const err = new Error(
            'Shared family workspace access is available on Family (up to 2 members) and Family Plus (up to 5 members) plans.'
          );
          err.statusCode = 403;
          err.code = 'FEATURE_FAMILY_WORKSPACE_LOCKED';
          err.upgradeRecommendation = 'FAMILY';
          throw err;
        }
        if (usage.familyMembers.used >= plan.maxWorkspaceMembers) {
          const rec = plan.tier < 3 ? 'FAMILY_PLUS' : null;
          const err = new Error(
            `Workspace member limit reached (${usage.familyMembers.used}/${plan.maxWorkspaceMembers} members). Upgrade to Family Plus to invite up to 5 family members.`
          );
          err.statusCode = 403;
          err.code = 'LIMIT_WORKSPACE_MEMBERS_REACHED';
          err.currentUsage = usage.familyMembers.used;
          err.maxUsage = plan.maxWorkspaceMembers;
          err.upgradeRecommendation = rec;
          throw err;
        }
        break;
      }

      case 'USE_REMINDERS': {
        if (!plan.hasReminders) {
          const err = new Error(
            'Celebration reminders are available on Personal, Family, and Family Plus plans.'
          );
          err.statusCode = 403;
          err.code = 'FEATURE_REMINDERS_LOCKED';
          err.upgradeRecommendation = 'PERSONAL';
          throw err;
        }
        if (meta.reminderType === 'FESTIVAL' && !plan.reminderTypes.includes('FESTIVAL')) {
          const err = new Error(
            'Festival reminders are available on Family and Family Plus plans.'
          );
          err.statusCode = 403;
          err.code = 'FEATURE_FESTIVAL_REMINDERS_LOCKED';
          err.upgradeRecommendation = 'FAMILY';
          throw err;
        }
        break;
      }

      case 'CUSTOM_BRANDING': {
        if (!plan.canCustomBranding) {
          const err = new Error(
            'Custom invitation branding and watermark removal is an exclusive feature of the Family Plus plan.'
          );
          err.statusCode = 403;
          err.code = 'FEATURE_CUSTOM_BRANDING_LOCKED';
          err.upgradeRecommendation = 'FAMILY_PLUS';
          throw err;
        }
        break;
      }

      case 'ADVANCED_SEARCH': {
        if (!plan.hasAdvancedSearch) {
          const err = new Error(
            'Advanced contact search & filtering is available on Family and Family Plus plans.'
          );
          err.statusCode = 403;
          err.code = 'FEATURE_ADVANCED_SEARCH_LOCKED';
          err.upgradeRecommendation = 'FAMILY';
          throw err;
        }
        break;
      }

      case 'FAMILY_CATEGORISATION': {
        if (!plan.hasFamilyCategorisation) {
          const err = new Error(
            'Family-wise contact categorisation is available on Family and Family Plus plans.'
          );
          err.statusCode = 403;
          err.code = 'FEATURE_FAMILY_CATEGORIES_LOCKED';
          err.upgradeRecommendation = 'FAMILY';
          throw err;
        }
        break;
      }

      case 'CUSTOM_TEMPLATE': {
        if (!plan.canUploadCustomTemplates) {
          const err = new Error(
            'Custom stationery card upload is available on Personal, Family, and Family Plus plans.'
          );
          err.statusCode = 403;
          err.code = 'FEATURE_CUSTOM_TEMPLATE_LOCKED';
          err.upgradeRecommendation = 'PERSONAL';
          throw err;
        }
        break;
      }

      case 'ADD_EVENT_GUEST': {
        const eventId = meta.eventId;
        const additional = meta.count || 1;
        if (eventId) {
          const currentCount = await prisma.eventGuest.count({ where: { eventId } });
          if (currentCount + additional > plan.maxGuestsPerEvent) {
            const err = new Error(
              `Guest limit per event reached (${plan.maxGuestsPerEvent} guests per event). Upgrade your plan to invite more guests.`
            );
            err.statusCode = 403;
            err.code = 'LIMIT_EVENT_GUESTS_REACHED';
            throw err;
          }
        }
        break;
      }

      default:
        break;
    }

    return true;
  }

  /**
   * Allows host to switch or downgrade plan (e.g. to Free)
   * Preserves all existing contacts, events, and members
   */
  async switchPlan(userId, { targetPlanId, targetPlanCode }) {
    let targetPlan = null;
    if (targetPlanId) {
      targetPlan = await prisma.subscriptionPlan.findUnique({ where: { id: targetPlanId } });
    } else if (targetPlanCode) {
      targetPlan = await prisma.subscriptionPlan.findUnique({ where: { code: targetPlanCode.toUpperCase() } });
    }

    if (!targetPlan || !targetPlan.isActive || targetPlan.isLegacy) {
      const err = new Error('Requested plan is not available.');
      err.statusCode = 404;
      throw err;
    }

    const currentSub = await prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true }
    });

    const isDowngrade = currentSub ? targetPlan.tier < currentSub.plan.tier : false;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiresAt = targetPlan.priceMonthly === 0
      ? new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000) // 10 years for Free
      : periodEnd;

    const updated = await prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: targetPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        startsAt: now,
        expiresAt,
        currentPeriodStartsAt: now,
        currentPeriodEndsAt: periodEnd
      },
      update: {
        planId: targetPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStartsAt: now,
        currentPeriodEndsAt: periodEnd
      },
      include: { plan: true }
    });

    await prisma.subscriptionHistory.create({
      data: {
        userId,
        planId: targetPlan.id,
        status: 'ACTIVE',
        startsAt: now,
        expiresAt,
        reason: isDowngrade ? 'PLAN_DOWNGRADE' : 'PLAN_UPGRADE',
        notes: `Plan changed to ${targetPlan.name} (${targetPlan.code}). All existing records preserved.`,
        performedBy: 'USER'
      }
    });

    return updated;
  }

  /**
   * Applies an authorized manual subscription override by Super Admin with audit trail
   */
  async manualAdjustSubscription({ adminId, userId, planId, status, expiresAt, reason, notes }) {
    if (!reason || reason.trim().length < 3) {
      const err = new Error('A detailed reason is mandatory for manual subscription adjustments.');
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: { include: { plan: true } } }
    });

    if (!user) {
      const err = new Error('Target user not found.');
      err.statusCode = 404;
      throw err;
    }

    const updateData = {};
    let targetPlanId = user.subscription?.planId;

    if (planId) {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) {
        const err = new Error('Specified plan does not exist.');
        err.statusCode = 404;
        throw err;
      }
      updateData.planId = plan.id;
      targetPlanId = plan.id;
    }

    if (status) {
      updateData.status = status;
    }

    if (expiresAt) {
      updateData.expiresAt = new Date(expiresAt);
    }

    const updated = await prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: targetPlanId,
        status: status || 'ACTIVE',
        startsAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      update: updateData,
      include: { plan: true }
    });

    await prisma.subscriptionHistory.create({
      data: {
        userId,
        planId: updated.planId,
        status: updated.status,
        startsAt: updated.startsAt,
        expiresAt: updated.expiresAt,
        reason: 'ADMIN_OVERRIDE',
        notes: `Admin adjustment: ${reason}${notes ? ` - ${notes}` : ''}`,
        performedBy: adminId
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'ADMIN_SUBSCRIPTION_OVERRIDE',
        resourceType: 'UserSubscription',
        resourceId: updated.id,
        metadata: JSON.stringify({
          userId,
          reason,
          notes: notes || null,
          previousPlan: user.subscription?.plan?.code,
          newPlan: updated.plan.code,
          newStatus: updated.status,
          newExpiresAt: updated.expiresAt
        })
      }
    });

    return updated;
  }

  /**
   * Cancels user subscription without deleting data; remains active until expiresAt
   */
  async cancelSubscription(userId) {
    const sub = await prisma.userSubscription.findUnique({ where: { userId } });
    if (!sub) {
      const err = new Error('Active subscription not found.');
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.userSubscription.update({
      where: { userId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      },
      include: { plan: true }
    });

    await prisma.subscriptionHistory.create({
      data: {
        userId,
        planId: updated.planId,
        status: 'CANCELLED',
        startsAt: updated.startsAt,
        expiresAt: updated.expiresAt,
        reason: 'USER_CANCELLED',
        notes: 'User requested cancellation. Access remains valid until expiry date.',
        performedBy: 'USER'
      }
    });

    return updated;
  }

  /**
   * Retrieves full history of subscription changes and payments for a user
   */
  async getUserHistory(userId) {
    const [history, payments] = await Promise.all([
      prisma.subscriptionHistory.findMany({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.paymentTransaction.findMany({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { history, payments };
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
