import prisma from '../database/prisma.js';
import subscriptionService from './subscription.service.js';

// Calendar dates for prominent Indian celebrations & festivals
const INDIAN_FESTIVALS = [
  { name: 'Diwali (Deepavali)', month: 11, day: 1, type: 'FESTIVAL', description: 'Festival of Lights' },
  { name: 'Holi', month: 3, day: 14, type: 'FESTIVAL', description: 'Festival of Colours' },
  { name: 'Raksha Bandhan', month: 8, day: 19, type: 'FESTIVAL', description: 'Celebration of Sibling Bond' },
  { name: 'Ganesh Chaturthi', month: 9, day: 7, type: 'FESTIVAL', description: 'Vinayaka Chavithi' },
  { name: 'Navratri & Dussehra', month: 10, day: 12, type: 'FESTIVAL', description: 'Vijayadashami Celebration' },
  { name: 'Makar Sankranti / Pongal', month: 1, day: 14, type: 'FESTIVAL', description: 'Harvest Festival' },
  { name: 'Karwa Chauth', month: 10, day: 20, type: 'FESTIVAL', description: 'Celebration of Marital Love' },
  { name: 'New Year', month: 1, day: 1, type: 'FESTIVAL', description: 'Celebration of New Beginnings' }
];

export class ReminderService {
  /**
   * Calculates upcoming days until a recurring annual event
   */
  _getDaysUntil(targetMonth, targetDay, now = new Date()) {
    const currentYear = now.getFullYear();
    let nextDate = new Date(currentYear, targetMonth - 1, targetDay);
    if (nextDate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      nextDate = new Date(currentYear + 1, targetMonth - 1, targetDay);
    }
    const diffMs = nextDate.getTime() - now.getTime();
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  }

  /**
   * Retrieves upcoming reminders based on plan entitlements
   * @param {string} userId - Workspace owner userId
   * @param {{ daysAhead?: number }} options
   */
  async getUpcomingReminders(userId, options = {}) {
    // 1. Enforce subscription entitlement
    await subscriptionService.enforceLimit(userId, 'USE_REMINDERS');

    const sub = await subscriptionService.getCurrentSubscription(userId);
    const plan = sub.plan;
    const daysAhead = Math.min(60, Math.max(1, parseInt(options.daysAhead, 10) || 14));
    const now = new Date();

    const allowedTypes = plan.reminderTypes || [];
    const canFestivals = allowedTypes.includes('FESTIVAL');
    const canBirthdays = allowedTypes.includes('BIRTHDAY');
    const canAnniversaries = allowedTypes.includes('ANNIVERSARY');

    // 2. Fetch guests with birthDate or anniversaryDate
    const guests = await prisma.guest.findMany({
      where: {
        userId,
        OR: [
          ...(canBirthdays ? [{ birthDate: { not: null } }] : []),
          ...(canAnniversaries ? [{ anniversaryDate: { not: null } }] : [])
        ]
      },
      select: {
        id: true,
        fullName: true,
        whatsappNumber: true,
        relation: true,
        category: true,
        birthDate: true,
        anniversaryDate: true
      }
    });

    const reminders = [];

    // Guest Birthdays
    if (canBirthdays) {
      for (const g of guests) {
        if (g.birthDate) {
          const bDate = new Date(g.birthDate);
          const daysUntil = this._getDaysUntil(bDate.getMonth() + 1, bDate.getDate(), now);
          if (daysUntil >= 0 && daysUntil <= daysAhead) {
            reminders.push({
              id: `bday_${g.id}`,
              type: 'BIRTHDAY',
              title: `${g.fullName}'s Birthday`,
              targetName: g.fullName,
              targetPhone: g.whatsappNumber,
              relation: g.relation,
              category: g.category || 'General',
              daysUntil,
              eventMonth: bDate.getMonth() + 1,
              eventDay: bDate.getDate(),
              suggestedAction: 'Send Birthday Greeting on WhatsApp'
            });
          }
        }
      }
    }

    // Guest Anniversaries
    if (canAnniversaries) {
      for (const g of guests) {
        if (g.anniversaryDate) {
          const aDate = new Date(g.anniversaryDate);
          const daysUntil = this._getDaysUntil(aDate.getMonth() + 1, aDate.getDate(), now);
          if (daysUntil >= 0 && daysUntil <= daysAhead) {
            reminders.push({
              id: `anniv_${g.id}`,
              type: 'ANNIVERSARY',
              title: `${g.fullName}'s Anniversary`,
              targetName: g.fullName,
              targetPhone: g.whatsappNumber,
              relation: g.relation,
              category: g.category || 'General',
              daysUntil,
              eventMonth: aDate.getMonth() + 1,
              eventDay: aDate.getDate(),
              suggestedAction: 'Send Anniversary Celebration Card'
            });
          }
        }
      }
    }

    // Indian Cultural Festivals (Family and Family Plus)
    if (canFestivals) {
      for (const fest of INDIAN_FESTIVALS) {
        const daysUntil = this._getDaysUntil(fest.month, fest.day, now);
        if (daysUntil >= 0 && daysUntil <= daysAhead) {
          reminders.push({
            id: `fest_${fest.name.toLowerCase().replace(/[^a-z]/g, '_')}`,
            type: 'FESTIVAL',
            title: fest.name,
            description: fest.description,
            daysUntil,
            eventMonth: fest.month,
            eventDay: fest.day,
            suggestedAction: 'Create Festival Invitation Campaign'
          });
        }
      }
    }

    // Sort by soonest first
    reminders.sort((a, b) => a.daysUntil - b.daysUntil);

    return {
      success: true,
      planEntitlement: {
        hasReminders: plan.hasReminders,
        allowedTypes: plan.reminderTypes
      },
      count: reminders.length,
      daysAhead,
      reminders
    };
  }

  /**
   * Retrieves notification settings and delivery preferences
   */
  async getSettings(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mobile: true }
    });

    return {
      emailNotifications: true,
      whatsappNotifications: false, // automated WhatsApp gateway currently offline
      recipientEmail: user?.email || '',
      optOutAll: false
    };
  }
}

export const reminderService = new ReminderService();
export default reminderService;
