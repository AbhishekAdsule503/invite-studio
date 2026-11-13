import prisma from '../database/prisma.js';
import subscriptionService from './subscription.service.js';

export const BUILT_IN_TEMPLATES = [
  {
    title: 'Royal Gold & Ivory Elegance',
    eventType: 'WEDDING',
    previewImageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    contentHtml: '<div class="template-wedding-royal text-center p-8 bg-amber-50 border-2 border-amber-300 rounded-3xl"><h2 class="font-serif text-3xl text-amber-900 font-bold mb-3">Royal Wedding Celebration</h2><p class="text-sm text-amber-800">Together with their families, cordially invite you to share in their joy.</p></div>',
    defaultMessage: 'Namaste {{guestName}}, you are warmly invited to celebrate the wedding ceremony of {{eventName}}! Date: {{eventDate}}. Venue: {{venue}}. Please RSVP here: {{invitationUrl}}',
    isSystem: true
  },
  {
    title: 'Floral Botanical Grace',
    eventType: 'WEDDING',
    previewImageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
    contentHtml: '<div class="template-wedding-botanical text-center p-8 bg-emerald-50 border-2 border-emerald-300 rounded-3xl"><h2 class="font-serif text-3xl text-emerald-900 font-bold mb-3">Two Hearts, One Journey</h2><p class="text-sm text-emerald-800">Join us in celebrating this auspicious beginning of love and togetherness.</p></div>',
    defaultMessage: 'Dear {{guestName}}, we request the pleasure of your company on our wedding day for {{eventName}} on {{eventDate}} at {{venue}}. RSVP: {{invitationUrl}}',
    isSystem: true
  },
  {
    title: 'Vibrant Fiesta & Confetti',
    eventType: 'BIRTHDAY',
    previewImageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80',
    contentHtml: '<div class="template-birthday-fiesta text-center p-8 bg-pink-50 border-2 border-pink-300 rounded-3xl"><h2 class="font-sans text-3xl text-pink-900 font-extrabold mb-3">It\'s Party Time! 🎂</h2><p class="text-sm text-pink-800">Come celebrate laughter, cake, and unforgettable moments!</p></div>',
    defaultMessage: 'Hey {{guestName}}! You are invited to celebrate {{eventName}} on {{eventDate}} at {{venue}}! Join us for cake and fun. Please RSVP: {{invitationUrl}}',
    isSystem: true
  },
  {
    title: 'Silver & Emerald Milestone',
    eventType: 'ANNIVERSARY',
    previewImageUrl: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&q=80',
    contentHtml: '<div class="template-anniversary-emerald text-center p-8 bg-teal-50 border-2 border-teal-300 rounded-3xl"><h2 class="font-serif text-3xl text-teal-900 font-bold mb-3">Celebrating Years of Love</h2><p class="text-sm text-teal-800">Honoring a journey blessed with devotion, friendship, and family.</p></div>',
    defaultMessage: 'Dear {{guestName}}, please join us as we celebrate our anniversary milestone for {{eventName}} on {{eventDate}} at {{venue}}. RSVP: {{invitationUrl}}',
    isSystem: true
  },
  {
    title: 'Rose Gold Rings & Bliss',
    eventType: 'ENGAGEMENT',
    previewImageUrl: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=800&q=80',
    contentHtml: '<div class="template-engagement-bliss text-center p-8 bg-rose-50 border-2 border-rose-300 rounded-3xl"><h2 class="font-serif text-3xl text-rose-900 font-bold mb-3">The Promise of Forever 💍</h2><p class="text-sm text-rose-800">We said Yes! Celebrate our engagement ceremony with us.</p></div>',
    defaultMessage: 'Namaste {{guestName}}, we are excited to announce our engagement! Please join {{eventName}} on {{eventDate}} at {{venue}}. RSVP: {{invitationUrl}}',
    isSystem: true
  },
  {
    title: 'Warm Hearth & Blessings',
    eventType: 'HOUSEWARMING',
    previewImageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
    contentHtml: '<div class="template-housewarming text-center p-8 bg-amber-50 border-2 border-amber-300 rounded-3xl"><h2 class="font-serif text-3xl text-amber-900 font-bold mb-3">Bless Our New Home 🏡</h2><p class="text-sm text-amber-800">Griha Pravesh & Housewarming Celebration. New memories begin here.</p></div>',
    defaultMessage: 'Dear {{guestName}}, we invite you and your family to our Housewarming ceremony for {{eventName}} on {{eventDate}} at {{venue}}. RSVP: {{invitationUrl}}',
    isSystem: true
  },
  {
    title: 'Heritage Family Reunion',
    eventType: 'FAMILY_GATHERING',
    previewImageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
    contentHtml: '<div class="template-family text-center p-8 bg-indigo-50 border-2 border-indigo-300 rounded-3xl"><h2 class="font-serif text-3xl text-indigo-900 font-bold mb-3">Family Reunion & Gathering</h2><p class="text-sm text-indigo-800">Reconnecting generations with love, traditional feasts, and cherished memories.</p></div>',
    defaultMessage: 'Dear {{guestName}}, our family is gathering for {{eventName}} on {{eventDate}} at {{venue}}. Looking forward to seeing you! RSVP: {{invitationUrl}}',
    isSystem: true
  },
  {
    title: 'Grand Gala Celebration',
    eventType: 'OTHER',
    previewImageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
    contentHtml: '<div class="template-other text-center p-8 bg-purple-50 border-2 border-purple-300 rounded-3xl"><h2 class="font-sans text-3xl text-purple-900 font-bold mb-3">Special Celebration 🎉</h2><p class="text-sm text-purple-800">An evening of honors, joy, and grand fellowship.</p></div>',
    defaultMessage: 'Dear {{guestName}}, you are invited to {{eventName}} on {{eventDate}} at {{venue}}. Please RSVP here: {{invitationUrl}}',
    isSystem: true
  }
];

export class TemplateService {
  /**
   * Automatically bootstrap system templates if not present
   */
  async ensureSystemTemplates() {
    const systemCount = await prisma.invitationTemplate.count({
      where: { isSystem: true }
    });

    if (systemCount === 0) {
      await prisma.$transaction(
        BUILT_IN_TEMPLATES.map((tmpl) =>
          prisma.invitationTemplate.create({
            data: {
              title: tmpl.title,
              eventType: tmpl.eventType,
              previewImageUrl: tmpl.previewImageUrl,
              contentHtml: tmpl.contentHtml,
              defaultMessage: tmpl.defaultMessage,
              isSystem: true,
              userId: null
            }
          })
        )
      );
    }
  }

  /**
   * List templates available to a user (System + User's custom templates)
   * @param {string} userId
   * @param {{ eventType?: string }} filter
   */
  async listTemplates(userId, { eventType } = {}) {
    await this.ensureSystemTemplates();

    const where = {
      OR: [
        { isSystem: true },
        { userId, isSystem: false }
      ],
      ...(eventType && eventType.trim() !== '' ? { eventType } : {})
    };

    const templates = await prisma.invitationTemplate.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }]
    });

    return templates;
  }

  /**
   * Get template by ID ensuring tenant or system authorization
   */
  async getTemplateById(userId, templateId) {
    await this.ensureSystemTemplates();

    const template = await prisma.invitationTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { isSystem: true },
          { userId }
        ]
      }
    });

    if (!template) {
      const err = new Error('Invitation template not found.');
      err.statusCode = 404;
      throw err;
    }

    return template;
  }

  /**
   * Create custom template for a host
   */
  async createCustomTemplate(userId, data) {
    // Enforce custom template permission & active subscription
    await subscriptionService.enforceLimit(userId, 'CUSTOM_TEMPLATE');

    const template = await prisma.invitationTemplate.create({
      data: {
        userId,
        title: data.title.trim(),
        eventType: data.eventType || null,
        previewImageUrl: data.previewImageUrl || null,
        contentHtml: data.contentHtml || null,
        defaultMessage: data.defaultMessage.trim(),
        isSystem: false
      }
    });

    return template;
  }
}

export const templateService = new TemplateService();
export default templateService;
