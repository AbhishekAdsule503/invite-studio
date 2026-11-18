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

        // Auto-update database status if not already marked EXPIRED
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
   * Retrieves active subscription, quotas, and current consumption for a user
   */
  async getCurrentSubscription(userId) {
    let subscription = await prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true }
    });

    if (!subscription) {
      // Auto-assign default Trial plan if user has none
      let trialPlan = await prisma.subscriptionPlan.findUnique({
        where: { code: 'TRIAL' }
      });
      if (!trialPlan) {
        trialPlan = await prisma.subscriptionPlan.create({
          data: {
            name: 'Free Trial',
            code: 'TRIAL',
            priceYearly: 0,
            currency: 'INR',
            maxEvents: 3,
            maxGuestsPerEvent: 50,
            maxPermanentGuests: 100,
            canUploadCustomTemplates: false,
            isActive: true
          }
        });
      }

      const trialDaysSetting = await prisma.systemSetting.findUnique({
        where: { key: 'trial_duration_days' }
      });
      const trialDays = trialDaysSetting ? parseInt(trialDaysSetting.value, 10) || 30 : 30;

      subscription = await prisma.userSubscription.create({
        data: {
          userId,
          planId: trialPlan.id,
          status: 'TRIAL',
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
        },
        include: { plan: true }
      });
    }

    const lifecycle = await this.evaluateSubscriptionState(subscription);

    // Calculate real database usage
    const [eventsCount, permanentGuestsCount] = await Promise.all([
      prisma.event.count({ where: { userId } }),
      prisma.guest.count({ where: { userId, isPermanent: true } })
    ]);

    const plan = subscription.plan;
    let parsedFeatures = [];
    try {
      parsedFeatures = plan.features ? JSON.parse(plan.features) : [];
    } catch {
      parsedFeatures = [];
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
      startsAt: subscription.startsAt,
      expiresAt: subscription.expiresAt,
      cancelledAt: subscription.cancelledAt,
      plan: {
        id: plan.id,
        name: plan.name,
        code: plan.code,
        priceYearly: plan.priceYearly,
        currency: plan.currency,
        maxEvents: plan.maxEvents,
        maxGuestsPerEvent: plan.maxGuestsPerEvent,
        maxPermanentGuests: plan.maxPermanentGuests,
        canUploadCustomTemplates: plan.canUploadCustomTemplates,
        canCustomInviteUpload: plan.canCustomInviteUpload,
        tier: plan.tier,
        isPopular: plan.isPopular,
        description: plan.description,
        features: parsedFeatures
      },
      usage: {
        events: {
          used: eventsCount,
          limit: plan.maxEvents,
          remaining: Math.max(0, plan.maxEvents - eventsCount),
          percentage: Math.min(100, Math.round((eventsCount / plan.maxEvents) * 100))
        },
        permanentGuests: {
          used: permanentGuestsCount,
          limit: plan.maxPermanentGuests,
          remaining: Math.max(0, plan.maxPermanentGuests - permanentGuestsCount),
          percentage: Math.min(100, Math.round((permanentGuestsCount / plan.maxPermanentGuests) * 100))
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
      return {
        ...p,
        features
      };
    });
  }

  /**
   * Checks subscription limits and blocks restricted actions if quota exceeded or expired
   * @param {string} userId
   * @param {'CREATE_EVENT'|'ADD_EVENT_GUEST'|'ADD_PERMANENT_GUEST'|'CUSTOM_TEMPLATE'} action
   * @param {Object} [meta]
   */
  async enforceLimit(userId, action, meta = {}) {
    const current = await this.getCurrentSubscription(userId);

    // If subscription is expired beyond grace period, block all write actions
    if (current.isExpired) {
      const err = new Error('Your subscription has expired. Please upgrade or renew your plan to continue.');
      err.statusCode = 403;
      err.code = 'SUBSCRIPTION_EXPIRED';
      throw err;
    }

    if (action === 'CREATE_EVENT') {
      if (current.usage.events.used >= current.plan.maxEvents) {
        const err = new Error(
          `Event limit reached (${current.plan.maxEvents} events). Upgrade your plan to create more events.`
        );
        err.statusCode = 403;
        err.code = 'LIMIT_EVENTS_REACHED';
        throw err;
      }
    } else if (action === 'ADD_PERMANENT_GUEST') {
      const additionalCount = meta.count || 1;
      if (current.usage.permanentGuests.used + additionalCount > current.plan.maxPermanentGuests) {
        const err = new Error(
          `Permanent guest limit reached (${current.plan.maxPermanentGuests} guests). Upgrade your plan to add more guests.`
        );
        err.statusCode = 403;
        err.code = 'LIMIT_PERMANENT_GUESTS_REACHED';
        throw err;
      }
    } else if (action === 'ADD_EVENT_GUEST') {
      const eventId = meta.eventId;
      const additionalCount = meta.count || 1;
      if (eventId) {
        const currentGuestsCount = await prisma.eventGuest.count({ where: { eventId } });
        if (currentGuestsCount + additionalCount > current.plan.maxGuestsPerEvent) {
          const err = new Error(
            `Guest limit per event reached (${current.plan.maxGuestsPerEvent} guests per event). Upgrade your plan to invite more guests.`
          );
          err.statusCode = 403;
          err.code = 'LIMIT_EVENT_GUESTS_REACHED';
          throw err;
        }
      }
    } else if (action === 'CUSTOM_TEMPLATE') {
      if (!current.plan.canUploadCustomTemplates) {
        const err = new Error(
          'Custom template creation is not available on your current plan. Please upgrade to Standard or Premium.'
        );
        err.statusCode = 403;
        err.code = 'FEATURE_CUSTOM_TEMPLATE_LOCKED';
        throw err;
      }
    }

    return true;
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

    // Write subscription history record
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

    // Audit log
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
