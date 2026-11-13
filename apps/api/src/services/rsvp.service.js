import prisma from '../database/prisma.js';
import {
  calculateEffectiveDeadline,
  RsvpStatus
} from '@smart-invitation/shared';

export class RsvpService {
  /**
   * Public RSVP submission (zero authentication required)
   * Enforces deadline validation, duplicate prevention, and response privacy.
   *
   * @param {string} token - Cryptographically secure invitation token
   * @param {Object} data - { status: 'IN' | 'OUT', companionCount?: number }
   * @returns {Promise<Object>} Sanitized public confirmation
   */
  async submitPublicRsvp(token, { status, companionCount = 0 }) {
    if (!token || typeof token !== 'string') {
      const err = new Error('Valid invitation link is required.');
      err.statusCode = 400;
      throw err;
    }

    if (status !== RsvpStatus.IN && status !== RsvpStatus.OUT) {
      const err = new Error('RSVP status must be either IN or OUT.');
      err.statusCode = 400;
      throw err;
    }

    // 1. Fetch invitation and associated event
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            rsvpDeadlineType: true,
            rsvpDeadlineDate: true,
            rsvpDeadlineDaysBefore: true
          }
        },
        rsvpResponse: true
      }
    });

    if (!invitation) {
      const err = new Error('Invitation not found or link has expired.');
      err.statusCode = 404;
      throw err;
    }

    // 2. Validate RSVP deadline (server-side calculation; never trust client-provided dates)
    const effectiveDeadline = calculateEffectiveDeadline(invitation.event);
    const now = new Date();

    if (now.getTime() > effectiveDeadline.getTime()) {
      const err = new Error('The RSVP response window has closed for this celebration.');
      err.statusCode = 400;
      throw err;
    }

    // 3. Upsert RSVP response within a transaction to prevent race conditions & duplicates
    const companions = status === RsvpStatus.IN ? Math.max(0, parseInt(companionCount, 10) || 0) : 0;

    const response = await prisma.$transaction(async (tx) => {
      return tx.rsvpResponse.upsert({
        where: { invitationId: invitation.id },
        create: {
          invitationId: invitation.id,
          status,
          companionCount: companions,
          respondedAt: now
        },
        update: {
          status,
          companionCount: companions,
          respondedAt: now
        }
      });
    });

    return {
      success: true,
      status: response.status,
      companionCount: response.companionCount,
      respondedAt: response.respondedAt,
      message:
        status === RsvpStatus.IN
          ? 'Thank you! Your attendance has been warmly confirmed.'
          : 'Thank you for letting us know! We have recorded that you will not be attending.'
    };
  }

  /**
   * Aggregate RSVP summary for a specific event (tenant isolated; strictly aggregate counts)
   *
   * @param {string} userId - Host user ID
   * @param {string} eventId - Target event ID
   * @returns {Promise<Object>} Aggregate counts only
   */
  async getEventRsvpSummary(userId, eventId) {
    // 1. Verify event ownership
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId }
    });

    if (!event) {
      const err = new Error('Event not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    // 2. Calculate Total Invited (supports both assigned event guests and generated invitations)
    const [eventGuestCount, invitationCount] = await Promise.all([
      prisma.eventGuest.count({ where: { eventId } }),
      prisma.invitation.count({ where: { eventId } })
    ]);
    const totalInvited = Math.max(eventGuestCount, invitationCount);

    // 3. Calculate Aggregate IN and OUT counts
    const [totalIn, totalOut] = await Promise.all([
      prisma.rsvpResponse.count({
        where: {
          invitation: { eventId },
          status: RsvpStatus.IN
        }
      }),
      prisma.rsvpResponse.count({
        where: {
          invitation: { eventId },
          status: RsvpStatus.OUT
        }
      })
    ]);

    // 4. Calculate Not Responded: Total Invited - (Total IN + Total OUT)
    const totalNotResponded = Math.max(0, totalInvited - (totalIn + totalOut));

    // PRIVACY GUARANTEE: Never include guest IDs, names, invitation IDs, tokens, or timestamps
    return {
      success: true,
      eventId: event.id,
      eventName: event.name,
      totalInvited,
      totalIn,
      totalOut,
      totalNotResponded
    };
  }

  /**
   * Host workspace overall aggregate RSVP & celebration statistics
   *
   * @param {string} userId - Host user ID
   * @returns {Promise<Object>} Aggregate metrics
   */
  async getOverallRsvpSummary(userId) {
    const [totalEvents, totalMyGuests, eventGuestsTotal, invitationsTotal] = await Promise.all([
      prisma.event.count({ where: { userId } }),
      prisma.guest.count({ where: { userId } }),
      prisma.eventGuest.count({ where: { event: { userId } } }),
      prisma.invitation.count({ where: { event: { userId } } })
    ]);

    const totalInvited = Math.max(eventGuestsTotal, invitationsTotal);

    const [totalIn, totalOut] = await Promise.all([
      prisma.rsvpResponse.count({
        where: {
          invitation: { event: { userId } },
          status: RsvpStatus.IN
        }
      }),
      prisma.rsvpResponse.count({
        where: {
          invitation: { event: { userId } },
          status: RsvpStatus.OUT
        }
      })
    ]);

    const totalNotResponded = Math.max(0, totalInvited - (totalIn + totalOut));

    return {
      success: true,
      totalEvents,
      totalMyGuests,
      totalInvited,
      totalIn,
      totalOut,
      totalNotResponded
    };
  }
}

export const rsvpService = new RsvpService();
export default rsvpService;
