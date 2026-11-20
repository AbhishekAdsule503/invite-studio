import prisma from '../database/prisma.js';
import subscriptionService from './subscription.service.js';
import { normalizePhone, phoneRegex } from '@smart-invitation/shared';

export class WorkspaceService {
  /**
   * Retrieves workspace details, members, and limits for the owner or an accepted member
   * @param {string} userId - Requesting user's ID
   */
  async getWorkspaceDetails(userId) {
    // 1. Check if user is an accepted member in another workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        status: 'ACCEPTED'
      },
      include: {
        workspace: {
          select: { id: true, name: true, email: true, mobile: true }
        }
      }
    });

    const isMemberOfOther = Boolean(membership && membership.workspaceId !== userId);
    const effectiveOwnerId = isMemberOfOther ? membership.workspaceId : userId;

    const owner = await prisma.user.findUnique({
      where: { id: effectiveOwnerId },
      select: { id: true, name: true, email: true, mobile: true, createdAt: true }
    });

    if (!owner) {
      const err = new Error('Workspace owner not found.');
      err.statusCode = 404;
      throw err;
    }

    const currentSub = await subscriptionService.getCurrentSubscription(effectiveOwnerId);
    const maxMembers = currentSub.plan.maxWorkspaceMembers || 1;

    // Get all members and pending invitations for this workspace
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: effectiveOwnerId },
      include: {
        memberUser: {
          select: { id: true, name: true, email: true, mobile: true }
        }
      },
      orderBy: { invitedAt: 'asc' }
    });

    const acceptedMembers = members.filter((m) => m.status === 'ACCEPTED');
    const pendingInvites = members.filter((m) => m.status === 'PENDING');
    const totalOccupied = 1 + acceptedMembers.length; // 1 for owner

    return {
      workspaceId: effectiveOwnerId,
      owner,
      isOwner: !isMemberOfOther,
      currentMemberRole: isMemberOfOther ? membership.role : 'OWNER',
      plan: {
        code: currentSub.plan.code,
        name: currentSub.plan.name,
        maxWorkspaceMembers: maxMembers
      },
      membersCount: {
        totalOccupied,
        limit: maxMembers,
        remainingSlots: Math.max(0, maxMembers - (totalOccupied + pendingInvites.length))
      },
      acceptedMembers: acceptedMembers.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.memberUser?.name || m.name,
        email: m.memberUser?.email || m.email,
        mobile: m.memberUser?.mobile || m.mobile,
        role: m.role,
        status: m.status,
        acceptedAt: m.acceptedAt
      })),
      pendingInvites: pendingInvites.map((m) => ({
        id: m.id,
        email: m.email,
        mobile: m.mobile,
        name: m.name,
        role: m.role,
        status: m.status,
        invitedAt: m.invitedAt
      }))
    };
  }

  /**
   * Invites a new family member to the workspace
   * @param {string} ownerId - Workspace owner user ID
   * @param {{ email?: string, mobile?: string, name?: string, role?: 'ADMIN'|'MEMBER' }} data
   */
  async inviteMember(ownerId, data) {
    // 1. Enforce subscription limit
    await subscriptionService.enforceLimit(ownerId, 'INVITE_WORKSPACE_MEMBER');

    const cleanEmail = data.email ? data.email.trim().toLowerCase() : null;
    let cleanMobile = null;
    if (data.mobile) {
      cleanMobile = normalizePhone(data.mobile);
      if (!phoneRegex.test(cleanMobile)) {
        const err = new Error('Invalid mobile phone number format.');
        err.statusCode = 400;
        throw err;
      }
    }

    if (!cleanEmail && !cleanMobile) {
      const err = new Error('Please provide an email address or mobile phone number to invite.');
      err.statusCode = 400;
      throw err;
    }

    // Owner cannot invite themselves
    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (
      (cleanEmail && owner.email && owner.email.toLowerCase() === cleanEmail) ||
      (cleanMobile && owner.mobile && owner.mobile === cleanMobile)
    ) {
      const err = new Error('You cannot invite yourself to your own workspace.');
      err.statusCode = 400;
      throw err;
    }

    // Check for existing pending or accepted invite in this workspace
    const existing = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: ownerId,
        status: { in: ['PENDING', 'ACCEPTED'] },
        OR: [
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ...(cleanMobile ? [{ mobile: cleanMobile }] : [])
        ]
      }
    });

    if (existing) {
      const err = new Error(
        existing.status === 'ACCEPTED'
          ? 'This member is already an active member of your workspace.'
          : 'An active invitation is already pending for this member.'
      );
      err.statusCode = 409;
      throw err;
    }

    // If an existing registered user matches, associate their userId upfront
    const registeredUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ...(cleanMobile ? [{ mobile: cleanMobile }] : [])
        ]
      }
    });

    const invite = await prisma.workspaceMember.create({
      data: {
        workspaceId: ownerId,
        userId: registeredUser ? registeredUser.id : null,
        email: cleanEmail,
        mobile: cleanMobile,
        name: data.name ? data.name.trim() : registeredUser?.name || null,
        role: data.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
        status: 'PENDING',
        invitedById: ownerId
      }
    });

    return invite;
  }

  /**
   * Lists pending invitations for a logged-in user
   * @param {Object} user - Logged in user record
   */
  async listPendingInvitesForUser(user) {
    const invites = await prisma.workspaceMember.findMany({
      where: {
        status: 'PENDING',
        OR: [
          ...(user.id ? [{ userId: user.id }] : []),
          ...(user.email ? [{ email: user.email.toLowerCase() }] : []),
          ...(user.mobile ? [{ mobile: user.mobile }] : [])
        ]
      },
      include: {
        workspace: {
          select: { id: true, name: true, email: true, mobile: true }
        }
      }
    });

    return invites.map((inv) => ({
      id: inv.id,
      workspaceId: inv.workspaceId,
      workspaceOwnerName: inv.workspace?.name || 'Family Host',
      workspaceOwnerEmail: inv.workspace?.email,
      role: inv.role,
      invitedAt: inv.invitedAt
    }));
  }

  /**
   * Accepts an invitation to join a family workspace
   * @param {string} inviteId
   * @param {string} userId
   */
  async acceptInvite(inviteId, userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const invite = await prisma.workspaceMember.findUnique({
      where: { id: inviteId },
      include: { workspace: true }
    });

    if (!invite || invite.status !== 'PENDING') {
      const err = new Error('Invitation not found or is no longer valid.');
      err.statusCode = 404;
      throw err;
    }

    // Verify recipient identity matches email, phone, or userId
    const matchesEmail = invite.email && user.email && invite.email.toLowerCase() === user.email.toLowerCase();
    const matchesPhone = invite.mobile && user.mobile && invite.mobile === user.mobile;
    const matchesUserId = invite.userId && invite.userId === user.id;

    if (!matchesEmail && !matchesPhone && !matchesUserId) {
      const err = new Error('This invitation was sent to a different email or phone number.');
      err.statusCode = 403;
      throw err;
    }

    // Verify workspace capacity before accepting
    const currentSub = await subscriptionService.getCurrentSubscription(invite.workspaceId);
    const maxMembers = currentSub.plan.maxWorkspaceMembers || 1;
    const activeMembersCount = 1 + await prisma.workspaceMember.count({
      where: { workspaceId: invite.workspaceId, status: 'ACCEPTED' }
    });

    if (activeMembersCount >= maxMembers) {
      const err = new Error('The workspace has reached its member limit. The owner must upgrade to invite more members.');
      err.statusCode = 403;
      throw err;
    }

    // Accept invite
    const accepted = await prisma.workspaceMember.update({
      where: { id: inviteId },
      data: {
        userId,
        status: 'ACCEPTED',
        acceptedAt: new Date()
      }
    });

    return {
      success: true,
      message: `You have joined ${invite.workspace.name || 'the family'}'s workspace.`,
      membership: accepted
    };
  }

  /**
   * Declines or rejects an invitation
   */
  async rejectInvite(inviteId, userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const invite = await prisma.workspaceMember.findUnique({ where: { id: inviteId } });

    if (!invite || invite.status !== 'PENDING') {
      const err = new Error('Invitation not found or already processed.');
      err.statusCode = 404;
      throw err;
    }

    await prisma.workspaceMember.update({
      where: { id: inviteId },
      data: { status: 'REJECTED' }
    });

    return { success: true, message: 'Invitation declined.' };
  }

  /**
   * Workspace owner removes a member or revokes an invitation
   * Shared guest and event data is NEVER deleted!
   */
  async removeMember(ownerId, memberRecordId) {
    const member = await prisma.workspaceMember.findUnique({
      where: { id: memberRecordId }
    });

    if (!member || member.workspaceId !== ownerId) {
      const err = new Error('Workspace member record not found.');
      err.statusCode = 404;
      throw err;
    }

    await prisma.workspaceMember.delete({
      where: { id: memberRecordId }
    });

    return {
      success: true,
      message: 'Member removed from workspace successfully. All shared celebration data is preserved.'
    };
  }
}

export const workspaceService = new WorkspaceService();
export default workspaceService;
