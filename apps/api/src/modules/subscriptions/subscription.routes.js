import { Router } from 'express';
import {
  createOrderSchema,
  verifyPaymentSchema,
  recordPaymentFailureSchema
} from '@smart-invitation/shared';
import { authenticateToken } from '../../middlewares/auth.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import * as subController from './subscription.controller.js';

const router = Router();

// Public routes (unauthenticated)
router.post('/webhook', subController.handleWebhook);
router.get('/plans', subController.getPlans);

// Protected routes (require user authentication)
router.use(authenticateToken);

router.get('/current', subController.getCurrentSubscription);
router.get('/history', subController.getSubscriptionHistory);
router.post('/create-order', validateRequest(createOrderSchema), subController.createOrder);
router.post('/verify-payment', validateRequest(verifyPaymentSchema), subController.verifyPayment);
router.post('/record-failure', validateRequest(recordPaymentFailureSchema), subController.recordPaymentFailure);
router.post('/cancel', subController.cancelSubscription);

export default router;
