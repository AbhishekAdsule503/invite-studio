import invitationService from '../../services/invitation.service.js';
import rsvpService from '../../services/rsvp.service.js';

export async function createInvitations(req, res, next) {
  try {
    const result = await invitationService.generateInvitations(req.user.id, req.body);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listInvitations(req, res, next) {
  try {
    const { eventId, search, status, page, limit } = req.query;
    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'eventId query parameter is required.'
      });
    }

    const origin = req.headers.origin || req.get('origin');
    const result = await invitationService.listInvitations(
      req.user.id,
      {
        eventId,
        search,
        status,
        page,
        limit
      },
      origin
    );

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function getInvitation(req, res, next) {
  try {
    const origin = req.headers.origin || req.get('origin');
    const invitation = await invitationService.getInvitationById(req.user.id, req.params.id, origin);
    return res.status(200).json({
      success: true,
      invitation
    });
  } catch (error) {
    next(error);
  }
}

export async function updateInvitation(req, res, next) {
  try {
    const updated = await invitationService.updateInvitation(req.user.id, req.params.id, req.body);
    return res.status(200).json({
      success: true,
      invitation: updated,
      message: 'Invitation details updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

export async function markInvitationSent(req, res, next) {
  try {
    const result = await invitationService.markInvitationSent(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteInvitation(req, res, next) {
  try {
    const result = await invitationService.deleteInvitation(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// Public Invitee Endpoint - NO AUTH REQUIRED!
export async function getPublicInvitation(req, res, next) {
  try {
    const { token } = req.params;
    const invitation = await invitationService.getPublicInvitation(token);
    return res.status(200).json(invitation);
  } catch (error) {
    next(error);
  }
}

// Public Invitee RSVP Submission - NO AUTH REQUIRED!
export async function submitPublicRsvp(req, res, next) {
  try {
    const { token } = req.params;
    const result = await rsvpService.submitPublicRsvp(token, req.body);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

