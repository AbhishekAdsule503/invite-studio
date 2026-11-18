import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/roles.js';
import * as templateController from './template.controller.js';

// Memory storage keeps file buffers in memory for streaming to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      const err = new Error('Invalid image format. Allowed formats: JPG, PNG, WebP.');
      err.statusCode = 400;
      cb(err);
    }
  }
});

const router = Router();

// All template endpoints require user authentication and HOST/SUPER_ADMIN role
router.use(authenticateToken);
router.use(requireRole('HOST', 'SUPER_ADMIN'));

router.get('/', templateController.listTemplates);
router.post('/upload', upload.single('image'), templateController.uploadTemplateImage);
router.get('/:id', templateController.getTemplate);
router.post('/', upload.single('image'), templateController.createTemplate);

export default router;
