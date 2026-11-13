import { Router } from 'express';
import multer from 'multer';
import {
  guestCreateSchema,
  guestUpdateSchema,
  guestBulkDeleteSchema,
  guestImportConfirmSchema
} from '@smart-invitation/shared';
import { authenticateToken } from '../../middlewares/auth.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import * as guestController from './guest.controller.js';

const router = Router();

// Configure multer for memory storage Excel uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.toLowerCase().endsWith('.xlsx')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Please upload a valid Microsoft Excel (.xlsx) file.'));
    }
  }
});

// All guest operations require authentication
router.use(authenticateToken);

// Excel template & export
router.get('/template', guestController.downloadTemplate);
router.get('/export', guestController.exportGuests);

// Excel import preview & confirm
router.post('/import/preview', upload.single('file'), guestController.previewImport);
router.post('/import/confirm', validateRequest(guestImportConfirmSchema), guestController.confirmImport);

// Bulk actions
router.post('/bulk-delete', validateRequest(guestBulkDeleteSchema), guestController.bulkDeleteGuests);

// CRUD operations
router.get('/', guestController.listGuests);
router.get('/:id', guestController.getGuest);
router.post('/', validateRequest(guestCreateSchema), guestController.createGuest);
router.put('/:id', validateRequest(guestUpdateSchema), guestController.updateGuest);
router.delete('/:id', guestController.deleteGuest);

export default router;
