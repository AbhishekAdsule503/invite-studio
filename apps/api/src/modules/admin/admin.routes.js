import { Router } from 'express';
import {
  planCreateSchema,
  planUpdateSchema,
  subscriptionManualAdjustSchema,
  supportTicketUpdateSchema,
  systemSettingsUpdateSchema
} from '@smart-invitation/shared';
import { authenticateToken } from '../../middlewares/auth.js';
import { requireSuperAdmin } from '../../middlewares/roles.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import * as adminController from './admin.controller.js';

const router = Router();

// ENFORCE AUTHENTICATION & SUPER_ADMIN ROLE ON EVERY ADMIN ENDPOINT
router.use(authenticateToken);
router.use(requireSuperAdmin);

// 1. Dashboard Metrics & Analytics (aggregate-only)
router.get('/dashboard', adminController.getDashboardStats);

// 2. User Management (Privacy Restricted)
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserDetails);
router.patch('/users/:id/status', adminController.updateUserStatus);

// 3. Plan Management
router.get('/plans', adminController.listPlansAdmin);
router.post('/plans', validateRequest(planCreateSchema), adminController.createPlan);
router.put('/plans/:id', validateRequest(planUpdateSchema), adminController.updatePlan);
router.patch('/plans/:id/toggle', adminController.togglePlan);
router.delete('/plans/:id', adminController.deletePlan);

// 4. Subscription Management & Manual Overrides
router.get('/subscriptions', adminController.listSubscriptions);
router.post(
  '/subscriptions/:id/adjust',
  validateRequest(subscriptionManualAdjustSchema),
  adminController.adjustSubscription
);
router.get('/payments', adminController.listPaymentsAdmin);

// 5. Template Management (System Templates)
router.get('/templates', adminController.listSystemTemplates);
router.post('/templates', adminController.createSystemTemplate);
router.put('/templates/:id', adminController.updateSystemTemplate);
router.patch('/templates/:id/toggle', adminController.toggleSystemTemplate);

// 6. Support Management
router.get('/support/tickets', adminController.listSupportTickets);
router.patch(
  '/support/tickets/:id',
  validateRequest(supportTicketUpdateSchema),
  adminController.updateSupportTicket
);

// 7. System Settings
router.get('/settings', adminController.getSettings);
router.put(
  '/settings',
  validateRequest(systemSettingsUpdateSchema),
  adminController.updateSettings
);

// 8. Audit Logs
router.get('/audit-logs', adminController.listAuditLogs);

export default router;
