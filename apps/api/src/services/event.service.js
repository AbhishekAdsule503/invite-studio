import prisma from '../database/prisma.js';
import subscriptionService from './subscription.service.js';
import {
  calculateEffectiveDeadline,
  validateEventDeadline,
  normalizePhone,
  phoneRegex
} from '@smart-invitation/shared';

export class EventService {
  /**
   * List all events for user with guest counts and pagination (tenant isolated)
   */
  async listEvents(userId, { search = '', eventType = '', page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      userId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { venue: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(eventType && eventType.trim() !== '' ? { eventType } : {})
    };

    const [total, events] = await Promise.all([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { eventDate: 'asc' },
        include: {
          _count: {
            select: { eventGuests: true, invitations: true }
          }
        }
      })
    ]);

    const formattedEvents = events.map((event) => ({
      ...event,
      effectiveDeadline: calculateEffectiveDeadline(event),
      guestCount: event._count.eventGuests
    }));

    return {
      events: formattedEvents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  /**
   * Retrieve event details by ID (tenant isolated)
   */
  async getEventById(userId, eventId) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId },
      include: {
        _count: {
          select: { eventGuests: true, invitations: true }
        }
      }
    });

    if (!event) {
      const err = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    return {
      ...event,
      effectiveDeadline: calculateEffectiveDeadline(event),
      guestCount: event._count.eventGuests
    };
  }

  /**
   * Create a new celebration event with validated deadline (tenant isolated)
   */
  async createEvent(userId, data) {
    // Enforce subscription event limits and active status
    await subscriptionService.enforceLimit(userId, 'CREATE_EVENT');

    const deadlineCheck = validateEventDeadline(
      data.eventDate,
      data.rsvpDeadlineType,
      data.rsvpDeadlineDate,
      data.rsvpDeadlineDaysBefore
    );

    if (!deadlineCheck.valid) {
      const err = new Error(deadlineCheck.error || 'Invalid RSVP deadline settings.');
      err.statusCode = 400;
      throw err;
    }

    const event = await prisma.event.create({
      data: {
        userId,
        name: data.name.trim(),
        eventType: data.eventType,
        eventDate: new Date(data.eventDate),
        eventTime: data.eventTime ? data.eventTime.trim() : null,
        venue: data.venue.trim(),
        description: data.description ? data.description.trim() : null,
        coverImageUrl: data.coverImageUrl || null,
        rsvpDeadlineType: data.rsvpDeadlineType || 'DAYS_BEFORE',
        rsvpDeadlineDate: data.rsvpDeadlineDate ? new Date(data.rsvpDeadlineDate) : null,
        rsvpDeadlineDaysBefore:
          data.rsvpDeadlineDaysBefore !== undefined ? parseInt(data.rsvpDeadlineDaysBefore, 10) : 2
      }
    });

    return {
      ...event,
      effectiveDeadline: calculateEffectiveDeadline(event),
      guestCount: 0
    };
  }

  /**
   * Update an event (tenant isolated)
   */
  async updateEvent(userId, eventId, data) {
    const existing = await prisma.event.findFirst({
      where: { id: eventId, userId }
    });

    if (!existing) {
      const err = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    const targetDate = data.eventDate !== undefined ? data.eventDate : existing.eventDate;
    const targetDeadlineType = data.rsvpDeadlineType !== undefined ? data.rsvpDeadlineType : existing.rsvpDeadlineType;
    const targetDeadlineDate = data.rsvpDeadlineDate !== undefined ? data.rsvpDeadlineDate : existing.rsvpDeadlineDate;
    const targetDaysBefore = data.rsvpDeadlineDaysBefore !== undefined ? data.rsvpDeadlineDaysBefore : existing.rsvpDeadlineDaysBefore;

    const deadlineCheck = validateEventDeadline(
      targetDate,
      targetDeadlineType,
      targetDeadlineDate,
      targetDaysBefore
    );

    if (!deadlineCheck.valid) {
      const err = new Error(deadlineCheck.error || 'Invalid RSVP deadline configuration.');
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.eventType !== undefined ? { eventType: data.eventType } : {}),
        ...(data.eventDate !== undefined ? { eventDate: new Date(data.eventDate) } : {}),
        ...(data.eventTime !== undefined ? { eventTime: data.eventTime ? data.eventTime.trim() : null } : {}),
        ...(data.venue !== undefined ? { venue: data.venue.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description ? data.description.trim() : null } : {}),
        ...(data.coverImageUrl !== undefined ? { coverImageUrl: data.coverImageUrl || null } : {}),
        ...(data.rsvpDeadlineType !== undefined ? { rsvpDeadlineType: data.rsvpDeadlineType } : {}),
        ...(data.rsvpDeadlineDate !== undefined ? { rsvpDeadlineDate: data.rsvpDeadlineDate ? new Date(data.rsvpDeadlineDate) : null } : {}),
        ...(data.rsvpDeadlineDaysBefore !== undefined ? { rsvpDeadlineDaysBefore: parseInt(data.rsvpDeadlineDaysBefore, 10) } : {})
      },
      include: {
        _count: {
          select: { eventGuests: true }
        }
      }
    });

    return {
      ...updated,
      effectiveDeadline: calculateEffectiveDeadline(updated),
      guestCount: updated._count.eventGuests
    };
  }

  /**
   * Delete an event (tenant isolated, cascades event-guest links)
   */
  async deleteEvent(userId, eventId) {
    const existing = await prisma.event.findFirst({
      where: { id: eventId, userId }
    });

    if (!existing) {
      const err = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    await prisma.event.delete({
      where: { id: eventId }
    });

    return { success: true, message: 'Event deleted successfully.' };
  }

  // ==========================================
  // EVENT GUEST LIST MANAGEMENT (Part E)
  // ==========================================

  /**
   * List all guests assigned to an event
   */
  async listEventGuests(userId, eventId, { search = '', page = 1, limit = 50 } = {}) {
    // Verify event ownership
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId }
    });

    if (!event) {
      const err = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      eventId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { whatsappNumber: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [total, guests] = await Promise.all([
      prisma.eventGuest.count({ where }),
      prisma.eventGuest.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { name: 'asc' },
        include: {
          guest: {
            select: {
              id: true,
              isPermanent: true
            }
          }
        }
      })
    ]);

    return {
      eventId,
      eventName: event.name,
      guests,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  /**
   * Assign existing permanent guests to an event (Option 1)
   */
  async addExistingGuestsToEvent(userId, eventId, guestIds) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId }
    });

    if (!event) {
      const err = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    // Verify all selected guestIds belong to this user
    const guests = await prisma.guest.findMany({
      where: {
        id: { in: guestIds },
        userId
      }
    });

    if (guests.length === 0) {
      const err = new Error('No valid guests found to add.');
      err.statusCode = 400;
      throw err;
    }

    // Check which guests are already assigned to this event
    const alreadyAssigned = await prisma.eventGuest.findMany({
      where: {
        eventId,
        guestId: { in: guests.map((g) => g.id) }
      },
      select: { guestId: true }
    });

    const assignedSet = new Set(alreadyAssigned.map((a) => a.guestId));
    const unassignedGuests = guests.filter((g) => !assignedSet.has(g.id));

    if (unassignedGuests.length === 0) {
      return {
        success: true,
        addedCount: 0,
        skippedCount: guests.length,
        message: 'All selected guests are already assigned to this event.'
      };
    }

    // Enforce guest limit per event
    await subscriptionService.enforceLimit(userId, 'ADD_EVENT_GUEST', {
      eventId,
      count: unassignedGuests.length
    });

    // In a transaction, create EventGuest records for all unassigned guests
    await prisma.$transaction(
      unassignedGuests.map((guest) =>
        prisma.eventGuest.create({
          data: {
            eventId,
            guestId: guest.id,
            name: guest.fullName,
            whatsappNumber: guest.whatsappNumber,
            email: guest.email,
            address: guest.address,
            relation: guest.relation
          }
        })
      )
    );

    return {
      success: true,
      addedCount: unassignedGuests.length,
      skippedCount: alreadyAssigned.length,
      message: `Added ${unassignedGuests.length} guest(s) to ${event.name}. ${alreadyAssigned.length > 0 ? `(${alreadyAssigned.length} already assigned)` : ''}`
    };
  }

  /**
   * Add a new guest directly to an event (Option 2: Save to My Guests OR Event Only)
   */
  async addNewGuestToEvent(userId, eventId, data) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId }
    });

    if (!event) {
      const err = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    const normalizedPhone = normalizePhone(data.whatsappNumber);
    if (!normalizedPhone || !phoneRegex.test(normalizedPhone)) {
      const err = new Error('Invalid WhatsApp phone number format.');
      err.statusCode = 400;
      throw err;
    }

    let permanentGuestId = null;

    // Enforce guest limit per event
    await subscriptionService.enforceLimit(userId, 'ADD_EVENT_GUEST', { eventId, count: 1 });

    if (data.saveToMyGuests) {
      // Enforce permanent guest limit on My Guests
      await subscriptionService.enforceLimit(userId, 'ADD_PERMANENT_GUEST', { count: 1 });
      // Find or create in permanent My Guests
      let existingPermanent = await prisma.guest.findFirst({
        where: { userId, whatsappNumber: normalizedPhone }
      });

      if (!existingPermanent) {
        existingPermanent = await prisma.guest.create({
          data: {
            userId,
            fullName: data.name.trim(),
            whatsappNumber: normalizedPhone,
            email: data.email ? data.email.trim().toLowerCase() : null,
            address: data.address ? data.address.trim() : null,
            relation: data.relation ? data.relation.trim() : null,
            isPermanent: true
          }
        });
      }
      permanentGuestId = existingPermanent.id;
    }

    // Check if guest is already in this event
    const duplicateInEvent = await prisma.eventGuest.findFirst({
      where: {
        eventId,
        OR: [
          ...(permanentGuestId ? [{ guestId: permanentGuestId }] : []),
          { whatsappNumber: normalizedPhone }
        ]
      }
    });

    if (duplicateInEvent) {
      const err = new Error(`Guest with WhatsApp number ${normalizedPhone} is already on the guest list for this event.`);
      err.statusCode = 409;
      throw err;
    }

    const eventGuest = await prisma.eventGuest.create({
      data: {
        eventId,
        guestId: permanentGuestId,
        name: data.name.trim(),
        whatsappNumber: normalizedPhone,
        email: data.email ? data.email.trim().toLowerCase() : null,
        address: data.address ? data.address.trim() : null,
        relation: data.relation ? data.relation.trim() : null
      }
    });

    return {
      success: true,
      eventGuest,
      message: data.saveToMyGuests
        ? 'Guest saved to My Guests and added to event.'
        : 'Guest added to this event successfully.'
    };
  }

  /**
   * Remove a guest from an event (Does NOT delete permanent guest!)
   */
  async removeGuestFromEvent(userId, eventId, eventGuestId) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId }
    });

    if (!event) {
      const err = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    const eventGuest = await prisma.eventGuest.findFirst({
      where: { id: eventGuestId, eventId }
    });

    if (!eventGuest) {
      const err = new Error('Event guest record not found.');
      err.statusCode = 404;
      throw err;
    }

    // Delete EventGuest assignment record; permanent Guest is preserved
    await prisma.eventGuest.delete({
      where: { id: eventGuestId }
    });

    return {
      success: true,
      message: 'Guest removed from event successfully.'
    };
  }
}

export const eventService = new EventService();
export default eventService;
