import prisma from '../database/prisma.js';

/**
 * Tenant scoping helpers and middleware
 * Resolves effective family workspace owner or personal tenant
 */
export async function enforceTenant(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      error: 'Tenant context missing. Authentication required.'
    });
  }

  try {
    // Check if user is an accepted member of a family workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: req.user.id,
        status: 'ACCEPTED'
      }
    });

    if (membership && membership.workspaceId) {
      req.tenantId = membership.workspaceId;
      req.workspace = {
        id: membership.workspaceId,
        ownerId: membership.workspaceId,
        isOwner: false,
        memberRole: membership.role,
        membershipId: membership.id
      };
    } else {
      req.tenantId = req.user.id;
      req.workspace = {
        id: req.user.id,
        ownerId: req.user.id,
        isOwner: true,
        memberRole: 'OWNER'
      };
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Helper to ensure queries always merge tenant isolation
 * @param {string} userId - Authenticated user id or workspace owner id
 * @param {object} filter - Additional Prisma filter conditions
 */
export function scopeToTenant(userId, filter = {}) {
  return {
    ...filter,
    userId
  };
}

