import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  invitationCreateSchema,
  invitationUpdateSchema,
  rsvpSubmitSchema
} from '@smart-invitation/shared';
import { authenticateToken } from '../../middlewares/auth.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import * as invitationController from './invitation.controller.js';

const router = Router();

// Rate limiter for public RSVP submissions (prevents brute-force or spam submissions)
const publicRsvpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many RSVP requests. Please try again shortly.'
  }
});

// PUBLIC INVITATION ROUTES - Unauthenticated access for invitees
router.get('/public/:token', invitationController.getPublicInvitation);
router.post(
  '/public/:token/rsvp',
  publicRsvpLimiter,
  validateRequest(rsvpSubmitSchema),
  invitationController.submitPublicRsvp
);

// PROTECTED HOST INVITATION ROUTES - Require authentication
router.use(authenticateToken);

router.post('/', validateRequest(invitationCreateSchema), invitationController.createInvitations);
router.get('/', invitationController.listInvitations);
router.get('/:id', invitationController.getInvitation);
router.put('/:id', validateRequest(invitationUpdateSchema), invitationController.updateInvitation);
router.post('/:id/mark-sent', invitationController.markInvitationSent);
router.delete('/:id', invitationController.deleteInvitation);

export default router;
