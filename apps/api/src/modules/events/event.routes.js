import { Router } from 'express';
import {
  eventCreateSchema,
  eventUpdateSchema,
  eventAddExistingGuestsSchema,
  eventAddNewGuestSchema
} from '@smart-invitation/shared';
import { authenticateToken } from '../../middlewares/auth.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import * as eventController from './event.controller.js';

const router = Router();

// All event operations require authentication
router.use(authenticateToken);

// Aggregate RSVP summaries (Phase 5)
// Defined before /:id routes so 'rsvp-summary' is not matched as an :id parameter
router.get('/rsvp-summary/overview', eventController.getOverallRsvpSummary);
router.get('/:id/rsvp-summary', eventController.getEventRsvpSummary);

// Event CRUD
router.get('/', eventController.listEvents);
router.get('/:id', eventController.getEvent);
router.post('/', validateRequest(eventCreateSchema), eventController.createEvent);
router.put('/:id', validateRequest(eventUpdateSchema), eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

// Event-wise Guest Management
router.get('/:id/guests', eventController.listEventGuests);
router.post('/:id/guests', validateRequest(eventAddExistingGuestsSchema), eventController.addExistingGuests);
router.post('/:id/guests/new', validateRequest(eventAddNewGuestSchema), eventController.addNewGuest);
router.delete('/:id/guests/:eventGuestId', eventController.removeEventGuest);

export default router;
