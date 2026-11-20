import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import guestRoutes from '../modules/guests/guest.routes.js';
import eventRoutes from '../modules/events/event.routes.js';
import invitationRoutes from '../modules/invitations/invitation.routes.js';
import templateRoutes from '../modules/templates/template.routes.js';
import subscriptionRoutes from '../modules/subscriptions/subscription.routes.js';
import supportRoutes from '../modules/support/support.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import workspaceRoutes from '../modules/workspace/workspace.routes.js';
import reminderRoutes from '../modules/reminders/reminder.routes.js';

const router = Router();

// Health check endpoints
router.use('/health', healthRoutes);

// Phase 2 Authentication endpoints
router.use('/auth', authRoutes);

// Phase 3 Guest & Event Management endpoints
router.use('/guests', guestRoutes);
router.use('/events', eventRoutes);

// Phase 4 Invitation & Template Management endpoints
router.use('/invitations', invitationRoutes);
router.use('/templates', templateRoutes);

// Phase 6 Subscription, Support & Super Admin endpoints
router.use('/subscriptions', subscriptionRoutes);
router.use('/support', supportRoutes);
router.use('/admin', adminRoutes);
router.use('/workspace', workspaceRoutes);
router.use('/reminders', reminderRoutes);

export default router;

