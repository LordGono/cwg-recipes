import { Router } from 'express';
import {
  getAllRecipes,
  getMyRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  togglePinRecipe,
  calculateRecipeMacros,
  suggestTagsForRecipe,
  addTagsToRecipe,
  getCountryCounts,
  recipeValidation,
  recipeMultipartValidation,
} from '../controllers/recipe.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Public routes
router.get('/', getAllRecipes);
router.get('/countries', getCountryCounts);

// Protected routes - must come BEFORE /:id
router.get('/my-recipes', authenticate, getMyRecipes);
router.post(
  '/',
  authenticate,
  upload.single('image'),
  recipeMultipartValidation,
  recipeValidation,
  createRecipe
);

// Parameterized routes
router.get('/:id', getRecipeById);
router.put(
  '/:id',
  authenticate,
  upload.single('image'),
  recipeMultipartValidation,
  recipeValidation,
  updateRecipe
);
router.patch('/:id/pin', authenticate, togglePinRecipe);
router.post('/:id/macros', authenticate, calculateRecipeMacros);
router.post('/:id/suggest-tags', authenticate, suggestTagsForRecipe);
router.patch('/:id/tags', authenticate, addTagsToRecipe);
router.delete('/:id', authenticate, deleteRecipe);

export default router;
