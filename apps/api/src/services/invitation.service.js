import crypto from 'crypto';
import prisma from '../database/prisma.js';
import { config } from '../config/env.js';
import templateService from './template.service.js';
import {
  calculateEffectiveDeadline,
  formatWhatsAppInvitationMessage
} from '@smart-invitation/shared';

export class InvitationService {
  /**
   * Generates cryptographically secure 16-byte hex token (32 chars)
   * @returns {string}
   */
  generateToken() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generates or updates invitations for assigned event guests (tenant isolated)
   */
  async generateInvitations(userId, { eventId, templateId, eventGuestIds, customMessage, regenerate = false }) {
    // 1. Verify event ownership
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId }
    });

    if (!event) {
      const err = new Error('Event not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    // 2. Fetch template if provided
    let template = null;
    if (templateId) {
      template = await templateService.getTemplateById(userId, templateId);
    }

    // 3. Fetch target event guests
    const guestWhere = {
      eventId,
      ...(eventGuestIds && eventGuestIds.length > 0 ? { id: { in: eventGuestIds } } : {})
    };

    const eventGuests = await prisma.eventGuest.findMany({
      where: guestWhere
    });

    if (eventGuests.length === 0) {
      const err = new Error('No assigned guests found for this event.');
      err.statusCode = 400;
      throw err;
    }

    // 4. Check existing invitations for these event guests
    const existingInvitations = await prisma.invitation.findMany({
      where: {
        eventId,
        eventGuestId: { in: eventGuests.map((g) => g.id) }
      }
    });

    const existingMap = new Map(existingInvitations.map((inv) => [inv.eventGuestId, inv]));

    let generatedCount = 0;
    let existingCount = 0;
    const defaultMsg = customMessage || (template ? template.defaultMessage : null);

    await prisma.$transaction(
      async (tx) => {
        for (const guest of eventGuests) {
          const existing = existingMap.get(guest.id);

          if (existing) {
            if (regenerate) {
              // Regenerate token and update template
              const newToken = this.generateToken();
              await tx.invitation.update({
                where: { id: existing.id },
                data: {
                  token: newToken,
                  templateId: templateId || existing.templateId,
                  personalizedMessage: defaultMsg || existing.personalizedMessage
                }
              });
              generatedCount++;
            } else {
              existingCount++;
            }
          } else {
            // Create new invitation
            const token = this.generateToken();
            await tx.invitation.create({
              data: {
                eventId,
                eventGuestId: guest.id,
                templateId: templateId || null,
                token,
                personalizedMessage: defaultMsg || null,
                whatsappStatus: 'PENDING'
              }
            });
            generatedCount++;
          }
        }
      },
      { maxWait: 15000, timeout: 30000 }
    );

    return {
      success: true,
      generatedCount,
      existingCount,
      message: `Generated ${generatedCount} invitation(s). ${existingCount > 0 ? `(${existingCount} already existed)` : ''}`
    };
  }

  /**
   * Lists invitations for an event with formatted WhatsApp links (tenant isolated)
   */
  async listInvitations(userId, { eventId, search = '', status = '', page = 1, limit = 50 } = {}, origin = null) {
    // Verify event ownership
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId }
    });

    if (!event) {
      const err = new Error('Event not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      eventId,
      ...(status && status.trim() !== '' ? { whatsappStatus: status } : {}),
      ...(search
        ? {
            eventGuest: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { whatsappNumber: { contains: search } }
              ]
            }
          }
        : {})
    };

    const [total, invitations] = await Promise.all([
      prisma.invitation.count({ where }),
      prisma.invitation.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [{ whatsappStatus: 'asc' }, { createdAt: 'desc' }],
        include: {
          eventGuest: true,
          template: {
            select: { id: true, title: true, previewImageUrl: true }
          }
        }
      })
    ]);

    const formattedEventDate = new Date(event.eventDate).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const appOrigin = origin || config.appOrigin || 'http://localhost:3000';

    const enrichedInvitations = invitations.map((inv) => {
      const invitationUrl = `${appOrigin}/invite/${inv.token}`;
      const guestName = inv.eventGuest.name;
      const cleanPhone = inv.eventGuest.whatsappNumber.replace(/[^\d]/g, '');

      const formattedMessage = formatWhatsAppInvitationMessage({
        guestName,
        eventName: event.name,
        eventDate: formattedEventDate,
        eventTime: event.eventTime || '',
        venue: event.venue,
        invitationUrl,
        customMessage: inv.personalizedMessage
      });

      const whatsAppUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(formattedMessage)}`;

      return {
        ...inv,
        invitationUrl,
        formattedMessage,
        whatsAppUrl
      };
    });

    return {
      eventId,
      eventName: event.name,
      total,
      invitations: enrichedInvitations,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  /**
   * Get single invitation by ID (tenant isolated)
   */
  async getInvitationById(userId, invitationId, origin = null) {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        event: true,
        eventGuest: true,
        template: true
      }
    });

    if (!invitation || invitation.event.userId !== userId) {
      const err = new Error('Invitation not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    const appOrigin = origin || config.appOrigin || 'http://localhost:3000';
    const invitationUrl = `${appOrigin}/invite/${invitation.token}`;
    const cleanPhone = invitation.eventGuest.whatsappNumber.replace(/[^\d]/g, '');

    const formattedMessage = formatWhatsAppInvitationMessage({
      guestName: invitation.eventGuest.name,
      eventName: invitation.event.name,
      eventDate: new Date(invitation.event.eventDate).toLocaleDateString(),
      eventTime: invitation.event.eventTime || '',
      venue: invitation.event.venue,
      invitationUrl,
      customMessage: invitation.personalizedMessage
    });

    const whatsAppUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(formattedMessage)}`;

    return {
      ...invitation,
      invitationUrl,
      formattedMessage,
      whatsAppUrl
    };
  }

  /**
   * Update invitation message or template (tenant isolated)
   */
  async updateInvitation(userId, invitationId, data) {
    const existing = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { event: true }
    });

    if (!existing || existing.event.userId !== userId) {
      const err = new Error('Invitation not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    if (data.templateId) {
      await templateService.getTemplateById(userId, data.templateId);
    }

    const updated = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        ...(data.templateId !== undefined ? { templateId: data.templateId || null } : {}),
        ...(data.personalizedMessage !== undefined ? { personalizedMessage: data.personalizedMessage || null } : {})
      },
      include: {
        eventGuest: true,
        template: true
      }
    });

    return updated;
  }

  /**
   * Mark invitation as sent manually by host (tenant isolated)
   */
  async markInvitationSent(userId, invitationId) {
    const existing = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { event: true }
    });

    if (!existing || existing.event.userId !== userId) {
      const err = new Error('Invitation not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        whatsappStatus: 'SENT',
        sentAt: new Date()
      }
    });

    return {
      success: true,
      invitation: updated,
      message: 'Invitation marked as sent.'
    };
  }

  /**
   * Delete an invitation (tenant isolated)
   */
  async deleteInvitation(userId, invitationId) {
    const existing = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { event: true }
    });

    if (!existing || existing.event.userId !== userId) {
      const err = new Error('Invitation not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    await prisma.invitation.delete({
      where: { id: invitationId }
    });

    return { success: true, message: 'Invitation deleted.' };
  }

  /**
   * Public Invitee API - Exposes strictly minimum required details for the guest
   * Publicly accessible by token; no JWT required!
   * @param {string} token Cryptographic token
   */
  async getPublicInvitation(token) {
    if (!token || typeof token !== 'string') {
      const err = new Error('Invalid invitation link.');
      err.statusCode = 400;
      throw err;
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        event: {
          select: {
            name: true,
            eventType: true,
            eventDate: true,
            eventTime: true,
            venue: true,
            description: true,
            coverImageUrl: true,
            rsvpDeadlineType: true,
            rsvpDeadlineDate: true,
            rsvpDeadlineDaysBefore: true
          }
        },
        eventGuest: {
          select: {
            name: true
          }
        },
        template: {
          select: {
            title: true,
            previewImageUrl: true,
            contentHtml: true
          }
        },
        rsvpResponse: {
          select: {
            status: true,
            companionCount: true,
            respondedAt: true
          }
        }
      }
    });

    if (!invitation) {
      const err = new Error('Invitation not found or link has expired.');
      err.statusCode = 404;
      throw err;
    }

    const effectiveDeadline = calculateEffectiveDeadline(invitation.event);

    // Dynamic placeholder resolution for invitee view
    let displayMessage = invitation.personalizedMessage || '';
    if (displayMessage) {
      displayMessage = displayMessage.replace(/{{guestName}}/g, invitation.eventGuest.name);
      displayMessage = displayMessage.replace(/{{eventName}}/g, invitation.event.name);
      displayMessage = displayMessage.replace(
        /{{eventDate}}/g,
        new Date(invitation.event.eventDate).toLocaleDateString()
      );
      displayMessage = displayMessage.replace(/{{venue}}/g, invitation.event.venue);
    }

    return {
      success: true,
      guestName: invitation.eventGuest.name,
      eventName: invitation.event.name,
      eventType: invitation.event.eventType,
      eventDate: invitation.event.eventDate,
      eventTime: invitation.event.eventTime,
      venue: invitation.event.venue,
      description: invitation.event.description,
      coverImageUrl: invitation.event.coverImageUrl,
      effectiveDeadline: effectiveDeadline.toISOString(),
      isDeadlinePassed: new Date() > effectiveDeadline,
      personalizedMessage: displayMessage,
      template: invitation.template,
      rsvpStatus: invitation.rsvpResponse ? invitation.rsvpResponse.status : null,
      companionCount: invitation.rsvpResponse ? invitation.rsvpResponse.companionCount : 0
    };
  }
}

export const invitationService = new InvitationService();
export default invitationService;
