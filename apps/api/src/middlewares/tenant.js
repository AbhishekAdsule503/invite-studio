/**
 * Tenant scoping helpers and middleware
 */

/**
 * Ensures a request has an authenticated user and attaches the tenant ID (userId)
 */
export function enforceTenant(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      error: 'Tenant context missing. Authentication required.'
    });
  }

  // Bind tenantId to req for convenience
  req.tenantId = req.user.id;
  next();
}

/**
 * Helper to ensure queries always merge tenant isolation
 * @param {string} userId - Authenticated user id
 * @param {object} filter - Additional Prisma filter conditions
 */
export function scopeToTenant(userId, filter = {}) {
  return {
    ...filter,
    userId
  };
}

