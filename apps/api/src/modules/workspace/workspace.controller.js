import workspaceService from '../../services/workspace.service.js';

export async function getWorkspace(req, res, next) {
  try {
    const data = await workspaceService.getWorkspaceDetails(req.user.id);
    return res.status(200).json({
      success: true,
      ...data
    });
  } catch (error) {
    next(error);
  }
}

export async function inviteMember(req, res, next) {
  try {
    const invite = await workspaceService.inviteMember(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Family member invited successfully.',
      invite
    });
  } catch (error) {
    next(error);
  }
}

export async function listPendingInvites(req, res, next) {
  try {
    const invites = await workspaceService.listPendingInvitesForUser(req.user);
    return res.status(200).json({
      success: true,
      invites
    });
  } catch (error) {
    next(error);
  }
}

export async function acceptInvite(req, res, next) {
  try {
    const { id } = req.params;
    const result = await workspaceService.acceptInvite(id, req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function rejectInvite(req, res, next) {
  try {
    const { id } = req.params;
    const result = await workspaceService.rejectInvite(id, req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function removeMember(req, res, next) {
  try {
    const { id } = req.params;
    const result = await workspaceService.removeMember(req.user.id, id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
