import { z } from 'zod';

export const UserRole = {
  HOST: 'HOST',
  SUPER_ADMIN: 'SUPER_ADMIN'
};

export const EventType = {
  WEDDING: 'WEDDING',
  BIRTHDAY: 'BIRTHDAY',
  ANNIVERSARY: 'ANNIVERSARY',
  ENGAGEMENT: 'ENGAGEMENT',
  HOUSEWARMING: 'HOUSEWARMING',
  FAMILY_GATHERING: 'FAMILY_GATHERING',
  OTHER: 'OTHER'
};

export const RsvpDeadlineType = {
  EXACT_DATE: 'EXACT_DATE',
  DAYS_BEFORE: 'DAYS_BEFORE'
};

export const RsvpStatus = {
  IN: 'IN',
  OUT: 'OUT'
};

export const WhatsAppStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT'
};

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  TRIAL: 'TRIAL',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

// Phone normalization helper (e.g. standardizing Indian/E.164 formats)
export const phoneRegex = /^\+?[1-9]\d{7,14}$/;
export const indianMobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;

export function isValidIndianMobile(phone) {
  if (!phone) return false;
  const cleaned = phone.toString().trim().replace(/[\s-]/g, '');
  return indianMobileRegex.test(cleaned);
}

export function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  // Remove non-digit except leading +
  let cleaned = rawPhone.toString().trim().replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    // If 10 digits (common for India), prefix with +91
    if (cleaned.length === 10) {
      cleaned = `+91${cleaned}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      cleaned = `+${cleaned}`;
    } else {
      cleaned = `+${cleaned}`;
    }
  }
  return cleaned;
}

export function normalizeEmail(rawEmail) {
  if (!rawEmail || typeof rawEmail !== 'string') return '';
  return rawEmail.trim().toLowerCase();
}

// Zod schemas for Authentication
export const sendOtpSchema = z.object({
  mobile: z.string().min(8, 'Mobile number is required').max(18),
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100).optional(),
  email: z.string().trim().email('Please enter a valid email address').optional().or(z.literal('')),
  isRegistration: z.union([z.boolean(), z.string()]).optional()
});

export const sendEmailOtpSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100).optional(),
  isRegistration: z.union([z.boolean(), z.string()]).optional()
});

export const verifyOtpSchema = z.object({
  mobile: z.string().min(8, 'Mobile number is required').max(18),
  otp: z.string().length(5, 'OTP must be exactly 5 digits'),
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100).optional(),
  email: z.string().trim().email('Please enter a valid email address').optional().or(z.literal(''))
});

export const verifyEmailOtpSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  otp: z.string().length(5, 'OTP must be exactly 5 digits'),
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100).optional()
});

export const completeProfileSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().trim().email('Please enter a valid email address')
});

// Zod schemas for Guest Management
export const guestCreateSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100),
  whatsappNumber: z.string().min(8, 'WhatsApp number is required').max(20),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  relation: z.string().max(50).optional().or(z.literal(''))
});

export const guestUpdateSchema = guestCreateSchema.partial();

export const guestBulkDeleteSchema = z.object({
  guestIds: z.array(z.string().min(1)).min(1, 'At least one guest ID is required')
});

export const guestImportConfirmSchema = z.object({
  rows: z.array(
    z.object({
      fullName: z.string().min(1),
      whatsappNumber: z.string().min(8),
      email: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      relation: z.string().optional().nullable()
    })
  ).min(1, 'At least one valid guest row is required for import')
});

// Zod schemas for Event Management
export const eventCreateSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(150),
  eventType: z.enum([
    EventType.WEDDING,
    EventType.BIRTHDAY,
    EventType.ANNIVERSARY,
    EventType.ENGAGEMENT,
    EventType.HOUSEWARMING,
    EventType.FAMILY_GATHERING,
    EventType.OTHER
  ]),
  eventDate: z.string().or(z.date()),
  eventTime: z.string().optional().or(z.literal('')),
  venue: z.string().min(1, 'Venue is required').max(255),
  description: z.string().max(1000).optional().or(z.literal('')),
  coverImageUrl: z.string().url().optional().or(z.literal('')).nullable(),
  rsvpDeadlineType: z.enum([RsvpDeadlineType.EXACT_DATE, RsvpDeadlineType.DAYS_BEFORE]).default(RsvpDeadlineType.DAYS_BEFORE),
  rsvpDeadlineDate: z.string().optional().nullable(),
  rsvpDeadlineDaysBefore: z.number().int().min(0).max(60).default(2)
});

export const eventUpdateSchema = eventCreateSchema.partial();

// Event-wise Guest Management schemas
export const eventAddExistingGuestsSchema = z.object({
  guestIds: z.array(z.string().min(1)).min(1, 'At least one guest ID must be selected')
});

export const eventAddNewGuestSchema = z.object({
  name: z.string().min(1, 'Guest name is required').max(100),
  whatsappNumber: z.string().min(8, 'WhatsApp number is required').max(20),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  relation: z.string().max(50).optional().or(z.literal('')),
  saveToMyGuests: z.boolean().default(false)
});

export const rsvpSubmitSchema = z.object({
  status: z.enum([RsvpStatus.IN, RsvpStatus.OUT]),
  companionCount: z.number().int().min(0).max(10).optional().default(0)
});

// Zod schemas for Invitation Templates & Invitations (Phase 4)
export const templateCreateSchema = z.object({
  title: z.string().min(1, 'Template title is required').max(100),
  eventType: z.enum([
    EventType.WEDDING,
    EventType.BIRTHDAY,
    EventType.ANNIVERSARY,
    EventType.ENGAGEMENT,
    EventType.HOUSEWARMING,
    EventType.FAMILY_GATHERING,
    EventType.OTHER
  ]).optional().nullable(),
  previewImageUrl: z.string().optional().nullable(),
  contentHtml: z.string().optional().nullable(),
  defaultMessage: z.string().min(1, 'Default message is required').max(1000)
});

export const invitationCreateSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  templateId: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  eventGuestIds: z.array(z.string().min(1)).optional(),
  customMessage: z.string().max(1000).optional().or(z.literal('')),
  regenerate: z.boolean().default(false)
});

export const invitationUpdateSchema = z.object({
  templateId: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  personalizedMessage: z.string().max(1000).optional().or(z.literal(''))
});

export const DEFAULT_WHATSAPP_TEMPLATES = {
  EN: `Dear {{guestName}},\n\nWe would be delighted to have you join us for {{eventName}}!\n\nWe've created a special digital invitation for you. Please take a moment to view it here:\n\n{{invitationUrl}}\n\nWe sincerely hope you can join us and make this occasion even more memorable.\n\nWith warm regards,\n{{hostName}} ❤️`,
  HI: `प्रिय {{guestName}} जी,\n\nहमें बहुत खुशी होगी यदि आप {{eventName}} के इस खास अवसर पर हमारे साथ शामिल हों।\n\nआपके लिए एक विशेष डिजिटल निमंत्रण तैयार किया है। कृपया नीचे दिए गए लिंक पर जाकर हमारा निमंत्रण देखें:\n\n{{invitationUrl}}\n\nआपकी उपस्थिति हमारे लिए इस अवसर को और भी यादगार बना देगी।\n\nस्नेह सहित,\n{{hostName}} ❤️`
};

/**
 * Formats a personalized WhatsApp invitation message with dynamic placeholders
 * @param {Object} params
 * @returns {string}
 */
export function formatWhatsAppInvitationMessage({
  guestName,
  eventName,
  eventDate,
  eventTime,
  venue,
  invitationUrl,
  hostName,
  language = 'EN',
  customMessage
}) {
  const chosenLang = (language || 'EN').toUpperCase() === 'HI' ? 'HI' : 'EN';
  let msg = customMessage && customMessage.trim() ? customMessage : DEFAULT_WHATSAPP_TEMPLATES[chosenLang];

  const resolvedGuest = guestName && guestName.trim() ? guestName.trim() : (chosenLang === 'HI' ? 'अतिथि' : 'Guest');
  const resolvedEvent = eventName && eventName.trim() ? eventName.trim() : (chosenLang === 'HI' ? 'समारोह' : 'Celebration');
  const resolvedHost = hostName && hostName.trim() ? hostName.trim() : (chosenLang === 'HI' ? 'आयोजक' : 'Your Host');

  msg = msg.replace(/{{guestName}}/g, resolvedGuest);
  msg = msg.replace(/{{eventName}}/g, resolvedEvent);
  msg = msg.replace(/{{eventDate}}/g, eventDate || '');
  msg = msg.replace(/{{eventTime}}/g, eventTime || '');
  msg = msg.replace(/{{venue}}/g, venue || '');
  msg = msg.replace(/{{invitationUrl}}/g, invitationUrl || '');
  msg = msg.replace(/{{hostName}}/g, resolvedHost);

  // Eliminate any unreplaced placeholders
  msg = msg.replace(/{{[^}]+}}/g, '').trim();

  // If custom message omitted the invitation URL, ensure it is appended
  if (invitationUrl && !msg.includes(invitationUrl)) {
    if (chosenLang === 'HI') {
      msg += `\n\nकृपया नीचे दिए गए लिंक पर जाकर हमारा निमंत्रण देखें:\n${invitationUrl}`;
    } else {
      msg += `\n\nPlease take a moment to view your special digital invitation:\n${invitationUrl}`;
    }
  }

  return msg;
}

/**
 * Calculates the effective RSVP deadline Date for an event
 * @param {Object} event
 * @returns {Date}
 */
export function calculateEffectiveDeadline(event) {
  const eventDateObj = new Date(event.eventDate);

  if (event.rsvpDeadlineType === RsvpDeadlineType.EXACT_DATE && event.rsvpDeadlineDate) {
    return new Date(event.rsvpDeadlineDate);
  }

  const daysBefore = typeof event.rsvpDeadlineDaysBefore === 'number' ? event.rsvpDeadlineDaysBefore : 2;
  const deadline = new Date(eventDateObj.getTime() - daysBefore * 24 * 60 * 60 * 1000);
  return deadline;
}

/**
 * Validates that an RSVP deadline is before or on the event date
 * @param {Date|string} eventDate
 * @param {string} deadlineType
 * @param {Date|string} [deadlineDate]
 * @param {number} [daysBefore]
 * @returns {{ valid: boolean, error?: string, effectiveDeadline?: Date }}
 */
export function validateEventDeadline(eventDate, deadlineType, deadlineDate, daysBefore) {
  const eventDateObj = new Date(eventDate);
  if (isNaN(eventDateObj.getTime())) {
    return { valid: false, error: 'Invalid event date.' };
  }

  let effectiveDeadline;
  if (deadlineType === RsvpDeadlineType.EXACT_DATE) {
    if (!deadlineDate) {
      return { valid: false, error: 'Exact RSVP deadline date is required when EXACT_DATE is selected.' };
    }
    effectiveDeadline = new Date(deadlineDate);
    if (isNaN(effectiveDeadline.getTime())) {
      return { valid: false, error: 'Invalid RSVP deadline date.' };
    }
  } else {
    const days = typeof daysBefore === 'number' ? daysBefore : 2;
    if (days < 0 || days > 60) {
      return { valid: false, error: 'Days before must be between 0 and 60 days.' };
    }
    effectiveDeadline = new Date(eventDateObj.getTime() - days * 24 * 60 * 60 * 1000);
  }

  if (effectiveDeadline.getTime() > eventDateObj.getTime()) {
    return { valid: false, error: 'RSVP deadline cannot be set after the event date.' };
  }

  return { valid: true, effectiveDeadline };
}

// Phase 6: Subscription, Payment, Support Ticket & Setting Schemas
export const planCreateSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100),
  code: z.string().min(2, 'Plan code is required').max(50).toUpperCase(),
  priceMonthly: z.number().int().min(0, 'Monthly price must be >= 0').optional().default(0),
  priceYearly: z.number().int().min(0, 'Price must be >= 0'),
  currency: z.string().default('INR'),
  hasMonthlyBilling: z.boolean().optional().default(false),
  hasYearlyBilling: z.boolean().optional().default(true),
  maxEvents: z.number().int().min(1, 'Max events must be at least 1'),
  maxGuestsPerEvent: z.number().int().min(1, 'Max guests per event must be at least 1'),
  maxPermanentGuests: z.number().int().min(1, 'Max permanent guests must be at least 1').default(100),
  canUploadCustomTemplates: z.boolean().default(false),
  canCustomInviteUpload: z.boolean().default(false),
  tier: z.number().int().min(0).default(0),
  displayOrder: z.number().int().optional().default(0),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().optional().default(true),
  isLegacy: z.boolean().optional().default(false),
  description: z.string().optional().nullable(),
  features: z.array(z.string()).optional()
});

export const planUpdateSchema = planCreateSchema.partial();

export const subscriptionManualAdjustSchema = z.object({
  planId: z.string().optional(),
  status: z.enum([
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIAL,
    SubscriptionStatus.EXPIRED,
    SubscriptionStatus.CANCELLED
  ]).optional(),
  expiresAt: z.string().or(z.date()).optional(),
  reason: z.string().min(3, 'Adjustment reason is required for audit logs').max(500),
  notes: z.string().max(1000).optional()
});

export const supportTicketCreateSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(150),
  message: z.string().min(10, 'Message must be at least 10 characters').max(3000),
  category: z.enum(['BILLING', 'TECHNICAL', 'GENERAL', 'FEATURE']).default('GENERAL'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM')
});

export const supportTicketUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  adminNotes: z.string().max(3000).optional().nullable(),
  assignedToId: z.string().optional().nullable()
});

export const createOrderSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional().default('YEARLY')
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  paymentId: z.string().min(1, 'Payment ID is required'),
  signature: z.string().min(1, 'Signature is required')
});

export const recordPaymentFailureSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  paymentId: z.string().optional(),
  reason: z.string().optional(),
  description: z.string().optional()
});

export const systemSettingsUpdateSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string()
    })
  ).min(1, 'At least one setting must be provided')
});

