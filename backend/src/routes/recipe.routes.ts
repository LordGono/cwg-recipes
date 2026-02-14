import { Router } from 'express';
import {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  recipeValidation,
} from '../controllers/recipe.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getAllRecipes);
router.get('/:id', getRecipeById);

// Protected routes (require authentication)
router.post('/', authenticate, recipeValidation, createRecipe);
router.put('/:id', authenticate, recipeValidation, updateRecipe);
router.delete('/:id', authenticate, deleteRecipe);

export default router;
