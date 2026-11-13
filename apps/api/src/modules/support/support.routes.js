import { Router } from 'express';
import { supportTicketCreateSchema } from '@smart-invitation/shared';
import { authenticateToken } from '../../middlewares/auth.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import * as supportController from './support.controller.js';

const router = Router();

router.use(authenticateToken);

router.post('/tickets', validateRequest(supportTicketCreateSchema), supportController.createTicket);
router.get('/tickets', supportController.listUserTickets);
router.get('/tickets/:id', supportController.getUserTicket);

export default router;
