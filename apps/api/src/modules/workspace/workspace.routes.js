import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.js';
import * as workspaceController from './workspace.controller.js';

const router = Router();

// All workspace routes require authentication
router.use(authenticateToken);

router.get('/', workspaceController.getWorkspace);
router.post('/invite', workspaceController.inviteMember);
router.get('/pending-invites', workspaceController.listPendingInvites);
router.post('/invites/:id/accept', workspaceController.acceptInvite);
router.post('/invites/:id/reject', workspaceController.rejectInvite);
router.delete('/members/:id', workspaceController.removeMember);

export default router;
