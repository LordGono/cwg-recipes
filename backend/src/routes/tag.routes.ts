import { Router } from 'express';
import { getAllTags, createTag, deleteTag } from '../controllers/tag.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public
router.get('/', getAllTags);

// Protected
router.post('/', authenticate, createTag);
router.delete('/:id', authenticate, deleteTag);

export default router;
