import eventService from '../../services/event.service.js';
import rsvpService from '../../services/rsvp.service.js';

export async function listEvents(req, res, next) {
  try {
    const { search, eventType, page, limit } = req.query;
    const result = await eventService.listEvents(req.user.id, {
      search,
      eventType,
      page,
      limit
    });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function getEvent(req, res, next) {
  try {
    const event = await eventService.getEventById(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      event
    });
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req, res, next) {
  try {
    const event = await eventService.createEvent(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      event,
      message: 'Event created successfully.'
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(req, res, next) {
  try {
    const event = await eventService.updateEvent(req.user.id, req.params.id, req.body);
    return res.status(200).json({
      success: true,
      event,
      message: 'Event updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteEvent(req, res, next) {
  try {
    const result = await eventService.deleteEvent(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// Event-wise Guest Management
export async function listEventGuests(req, res, next) {
  try {
    const { search, page, limit } = req.query;
    const result = await eventService.listEventGuests(req.user.id, req.params.id, {
      search,
      page,
      limit
    });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function addExistingGuests(req, res, next) {
  try {
    const { guestIds } = req.body;
    const result = await eventService.addExistingGuestsToEvent(req.user.id, req.params.id, guestIds);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function addNewGuest(req, res, next) {
  try {
    const result = await eventService.addNewGuestToEvent(req.user.id, req.params.id, req.body);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function removeEventGuest(req, res, next) {
  try {
    const result = await eventService.removeGuestFromEvent(
      req.user.id,
      req.params.id,
      req.params.eventGuestId
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// ==========================================
// AGGREGATE RSVP TRACKING (Phase 5)
// ==========================================

export async function getEventRsvpSummary(req, res, next) {
  try {
    const summary = await rsvpService.getEventRsvpSummary(req.user.id, req.params.id);
    return res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
}

export async function getOverallRsvpSummary(req, res, next) {
  try {
    const summary = await rsvpService.getOverallRsvpSummary(req.user.id);
    return res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
}

