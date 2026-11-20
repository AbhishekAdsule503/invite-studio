import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.js';
import { enforceTenant } from '../../middlewares/tenant.js';
import * as reminderController from './reminder.controller.js';

const router = Router();

router.use(authenticateToken);
router.use(enforceTenant);

router.get('/upcoming', reminderController.getUpcomingReminders);
router.get('/settings', reminderController.getReminderSettings);

export default router;
