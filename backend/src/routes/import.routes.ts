import { Router } from 'express';
import multer from 'multer';
import {
  importFromURL,
  importFromPDF,
  importFromVideo,
  importFromVideoURL,
  importFromText,
  importFromJSON,
  getUsageStats,
  importValidation,
} from '../controllers/import.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Memory-storage multer for PDF imports
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

// Memory-storage multer for video file uploads (Gemini processes on their end)
const videoUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are supported'));
    }
  },
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
});

// All import routes require authentication
router.post('/url', authenticate, importValidation, importFromURL);
router.post('/pdf', authenticate, pdfUpload.single('pdf'), importFromPDF);
router.post('/text', authenticate, importFromText);
router.post('/json', authenticate, importFromJSON);
router.post('/video', authenticate, videoUpload.single('video'), importFromVideo);
router.post('/video-url', authenticate, importFromVideoURL);
router.get('/usage', getUsageStats); // Public - shows global usage stats

export default router;
