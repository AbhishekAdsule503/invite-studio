import subscriptionService from '../services/subscription.service.js';

/**
 * Middleware: Blocks restricted actions if subscription is expired beyond grace period
 */
export async function requireActiveSubscription(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const current = await subscriptionService.getCurrentSubscription(req.user.id);
    if (current.isExpired) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_EXPIRED',
        error: 'Your subscription has expired. Please upgrade or renew your plan to continue creating and managing events.',
        expiresAt: current.expiresAt
      });
    }

    req.currentSubscription = current;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: Enforces that the user has not exceeded their plan's maximum events
 */
export async function enforceEventLimit(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    await subscriptionService.enforceLimit(req.user.id, 'CREATE_EVENT');
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: Enforces permanent guest limit on address book additions
 */
export async function enforcePermanentGuestLimit(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const count = req.body?.rows ? req.body.rows.length : 1;
    await subscriptionService.enforceLimit(req.user.id, 'ADD_PERMANENT_GUEST', { count });
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: Enforces custom template upload permission
 */
export async function enforceCustomTemplatePermission(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    await subscriptionService.enforceLimit(req.user.id, 'CUSTOM_TEMPLATE');
    next();
  } catch (error) {
    next(error);
  }
}
