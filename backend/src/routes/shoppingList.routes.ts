import { Router } from 'express';
import {
  getLists,
  createList,
  getList,
  updateList,
  deleteList,
  addItem,
  addFromRecipe,
  updateItem,
  reorderItems,
  deleteItem,
  clearCheckedItems,
  listValidation,
  itemValidation,
} from '../controllers/shoppingList.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All shopping list routes require authentication
router.use(authenticate);

router.get('/', getLists);
router.post('/', listValidation, createList);

router.get('/:id', getList);
router.patch('/:id', listValidation, updateList);
router.delete('/:id', deleteList);

router.post('/:id/items', itemValidation, addItem);
router.post('/:id/recipes/:recipeId', addFromRecipe);
router.put('/:id/items/reorder', reorderItems);       // drag-to-reorder
router.patch('/:id/items/:itemId', updateItem);
router.delete('/:id/items', clearCheckedItems);        // clear checked
router.delete('/:id/items/:itemId', deleteItem);

export default router;
