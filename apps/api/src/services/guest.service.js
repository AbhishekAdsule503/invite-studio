import prisma from '../database/prisma.js';
import subscriptionService from './subscription.service.js';
import { normalizePhone, phoneRegex } from '@smart-invitation/shared';

export class GuestService {
  /**
   * List guests with search, filtering, pagination, and sorting (tenant isolated)
   */
  async listGuests(userId, { search = '', relation = '', page = 1, limit = 20, sortBy = 'fullName', sortOrder = 'asc' } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      userId,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { whatsappNumber: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(relation && relation.trim() !== ''
        ? { relation: { equals: relation.trim(), mode: 'insensitive' } }
        : {})
    };

    const allowedSortFields = ['fullName', 'whatsappNumber', 'relation', 'createdAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'fullName';
    const direction = sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc';

    const [total, guests] = await Promise.all([
      prisma.guest.count({ where }),
      prisma.guest.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortField]: direction },
        include: {
          _count: {
            select: { eventGuests: true }
          }
        }
      })
    ]);

    return {
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
   * Retrieve single guest by ID (tenant isolated)
   */
  async getGuestById(userId, guestId) {
    const guest = await prisma.guest.findFirst({
      where: { id: guestId, userId },
      include: {
        eventGuests: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                eventType: true,
                eventDate: true,
                venue: true
              }
            }
          }
        }
      }
    });

    if (!guest) {
      const err = new Error('Guest not found.');
      err.statusCode = 404;
      throw err;
    }

    return guest;
  }

  /**
   * Create a new permanent guest (tenant isolated)
   */
  async createGuest(userId, data) {
    // Enforce permanent guest limit & active subscription
    await subscriptionService.enforceLimit(userId, 'ADD_PERMANENT_GUEST', { count: 1 });

    const normalizedMobile = normalizePhone(data.whatsappNumber);
    if (!normalizedMobile || !phoneRegex.test(normalizedMobile)) {
      const err = new Error('Invalid WhatsApp phone number format.');
      err.statusCode = 400;
      throw err;
    }

    // Duplicate check for this user
    const existing = await prisma.guest.findFirst({
      where: {
        userId,
        whatsappNumber: normalizedMobile
      }
    });

    if (existing) {
      const err = new Error(`A guest with WhatsApp number ${normalizedMobile} already exists in your address book.`);
      err.statusCode = 409;
      throw err;
    }

    const guest = await prisma.guest.create({
      data: {
        userId,
        fullName: data.fullName.trim(),
        whatsappNumber: normalizedMobile,
        email: data.email ? data.email.trim().toLowerCase() : null,
        address: data.address ? data.address.trim() : null,
        relation: data.relation ? data.relation.trim() : null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        anniversaryDate: data.anniversaryDate ? new Date(data.anniversaryDate) : null,
        category: data.category ? data.category.trim() : null,
        tags: data.tags ? (typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags)) : null,
        notes: data.notes ? data.notes.trim() : null,
        isPermanent: true
      }
    });

    return guest;
  }

  /**
   * Update an existing guest (tenant isolated)
   */
  async updateGuest(userId, guestId, data) {
    // Verify ownership
    const existingGuest = await prisma.guest.findFirst({
      where: { id: guestId, userId }
    });

    if (!existingGuest) {
      const err = new Error('Guest not found.');
      err.statusCode = 404;
      throw err;
    }

    let normalizedMobile = existingGuest.whatsappNumber;
    if (data.whatsappNumber && data.whatsappNumber.trim() !== '') {
      normalizedMobile = normalizePhone(data.whatsappNumber);
      if (!normalizedMobile || !phoneRegex.test(normalizedMobile)) {
        const err = new Error('Invalid WhatsApp phone number format.');
        err.statusCode = 400;
        throw err;
      }

      // Check if another guest has this phone number
      const duplicate = await prisma.guest.findFirst({
        where: {
          userId,
          whatsappNumber: normalizedMobile,
          id: { not: guestId }
        }
      });

      if (duplicate) {
        const err = new Error(`Another guest with WhatsApp number ${normalizedMobile} already exists in your address book.`);
        err.statusCode = 409;
        throw err;
      }
    }

    const updated = await prisma.guest.update({
      where: { id: guestId },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}),
        whatsappNumber: normalizedMobile,
        ...(data.email !== undefined ? { email: data.email ? data.email.trim().toLowerCase() : null } : {}),
        ...(data.address !== undefined ? { address: data.address ? data.address.trim() : null } : {}),
        ...(data.relation !== undefined ? { relation: data.relation ? data.relation.trim() : null } : {}),
        ...(data.birthDate !== undefined ? { birthDate: data.birthDate ? new Date(data.birthDate) : null } : {}),
        ...(data.anniversaryDate !== undefined ? { anniversaryDate: data.anniversaryDate ? new Date(data.anniversaryDate) : null } : {}),
        ...(data.category !== undefined ? { category: data.category ? data.category.trim() : null } : {}),
        ...(data.tags !== undefined ? { tags: typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes ? data.notes.trim() : null } : {})
      }
    });

    return updated;
  }

  /**
   * Delete a permanent guest (tenant isolated)
   */
  async deleteGuest(userId, guestId) {
    const existing = await prisma.guest.findFirst({
      where: { id: guestId, userId }
    });

    if (!existing) {
      const err = new Error('Guest not found.');
      err.statusCode = 404;
      throw err;
    }

    // Delete guest; onDelete: SetNull on EventGuest preserves past event assignment records
    await prisma.guest.delete({
      where: { id: guestId }
    });

    return { success: true, message: 'Guest deleted successfully.' };
  }

  /**
   * Bulk delete multiple guests (tenant isolated)
   */
  async bulkDeleteGuests(userId, guestIds) {
    if (!Array.isArray(guestIds) || guestIds.length === 0) {
      const err = new Error('No guest IDs provided for deletion.');
      err.statusCode = 400;
      throw err;
    }

    const result = await prisma.guest.deleteMany({
      where: {
        id: { in: guestIds },
        userId
      }
    });

    return {
      success: true,
      deletedCount: result.count,
      message: `Successfully deleted ${result.count} guest(s).`
    };
  }
}

export const guestService = new GuestService();
export default guestService;
