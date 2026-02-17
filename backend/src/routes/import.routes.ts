import { Router } from 'express';
import multer from 'multer';
import {
  importFromURL,
  importFromPDF,
  importFromVideo,
  getUsageStats,
  importValidation,
} from '../controllers/import.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Memory-storage multer for PDF imports (no disk write needed)
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// All import routes require authentication
router.post('/url', authenticate, importValidation, importFromURL);
router.post('/pdf', authenticate, pdfUpload.single('pdf'), importFromPDF);
router.post('/video', authenticate, importFromVideo); // Future implementation
router.get('/usage', getUsageStats); // Public - shows global usage stats

export default router;
