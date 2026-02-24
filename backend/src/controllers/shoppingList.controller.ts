import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';

// ── Validation ────────────────────────────────────────────────────────────────

export const listValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
];

export const itemValidation = [
  body('name').trim().notEmpty().withMessage('Item name is required').isLength({ max: 200 }),
  body('amount').optional().trim().isLength({ max: 100 }),
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract user id from JWT payload */
const uid = (req: Request): string => req.user!.userId as string;

/** Extract route param as plain string */
const param = (req: Request, key: string): string => String(req.params[key]);

async function ownerOrThrow(listId: string, userId: string) {
  const list = await prisma.shoppingList.findUnique({ where: { id: listId } });
  if (!list) throw createError(404, 'Shopping list not found');
  if (list.userId !== userId) throw createError(403, 'Forbidden');
  return list;
}

// ── Controllers ───────────────────────────────────────────────────────────────

/** GET /api/shopping-lists */
export const getLists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    const lists = await prisma.shoppingList.findMany({
      where: { userId },
      include: {
        _count: { select: { items: true } },
        items: { where: { checked: false }, select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        lists: lists.map((l) => ({
          id: l.id,
          name: l.name,
          totalItems: l._count.items,
          uncheckedItems: l.items.length,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/shopping-lists */
export const createList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw createError(400, errors.array()[0].msg as string);

    const list = await prisma.shoppingList.create({
      data: { name: (req.body as { name: string }).name, userId: uid(req) },
      include: { items: true },
    });

    res.status(201).json({ success: true, data: { list } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/shopping-lists/:id */
export const getList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id');
    const userId = uid(req);
    const list = await prisma.shoppingList.findUnique({
      where: { id },
      include: { items: { orderBy: [{ checked: 'asc' }, { createdAt: 'asc' }] } },
    });

    if (!list) throw createError(404, 'Shopping list not found');
    if (list.userId !== userId) throw createError(403, 'Forbidden');

    res.json({ success: true, data: { list } });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/shopping-lists/:id — rename */
export const updateList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw createError(400, errors.array()[0].msg as string);

    const id = param(req, 'id');
    await ownerOrThrow(id, uid(req));

    const list = await prisma.shoppingList.update({
      where: { id },
      data: { name: (req.body as { name: string }).name },
      include: { items: { orderBy: [{ checked: 'asc' }, { createdAt: 'asc' }] } },
    });

    res.json({ success: true, data: { list } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/shopping-lists/:id */
export const deleteList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id');
    await ownerOrThrow(id, uid(req));

    await prisma.shoppingList.delete({ where: { id } });
    res.json({ success: true, data: { message: 'Shopping list deleted' } });
  } catch (err) {
    next(err);
  }
};

/** POST /api/shopping-lists/:id/items — add a single item */
export const addItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw createError(400, errors.array()[0].msg as string);

    const listId = param(req, 'id');
    await ownerOrThrow(listId, uid(req));

    const { name, amount } = req.body as { name: string; amount?: string };
    const item = await prisma.shoppingListItem.create({
      data: { listId, name, amount: amount || null },
    });

    await prisma.shoppingList.update({ where: { id: listId }, data: { updatedAt: new Date() } });

    res.status(201).json({ success: true, data: { item } });
  } catch (err) {
    next(err);
  }
};

/** POST /api/shopping-lists/:id/recipes/:recipeId — bulk add from recipe */
export const addFromRecipe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listId = param(req, 'id');
    const recipeId = param(req, 'recipeId');
    await ownerOrThrow(listId, uid(req));

    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) throw createError(404, 'Recipe not found');

    const ingredients = recipe.ingredients as { item: string; amount: string }[];
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw createError(400, 'Recipe has no ingredients');
    }

    await prisma.shoppingListItem.createMany({
      data: ingredients.map((ing) => ({
        listId,
        name: ing.item,
        amount: ing.amount || null,
        recipeId,
      })),
    });

    await prisma.shoppingList.update({ where: { id: listId }, data: { updatedAt: new Date() } });

    const list = await prisma.shoppingList.findUnique({
      where: { id: listId },
      include: { items: { orderBy: [{ checked: 'asc' }, { createdAt: 'asc' }] } },
    });

    res.json({ success: true, data: { list, added: ingredients.length } });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/shopping-lists/:id/items/:itemId — toggle checked or update */
export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listId = param(req, 'id');
    const itemId = param(req, 'itemId');
    await ownerOrThrow(listId, uid(req));

    const item = await prisma.shoppingListItem.findUnique({ where: { id: itemId } });
    if (!item || item.listId !== listId) throw createError(404, 'Item not found');

    const { checked, name, amount } = req.body as {
      checked?: boolean;
      name?: string;
      amount?: string;
    };

    const updated = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: {
        ...(checked !== undefined && { checked }),
        ...(name !== undefined && { name }),
        ...(amount !== undefined && { amount: amount || null }),
      },
    });

    res.json({ success: true, data: { item: updated } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/shopping-lists/:id/items/:itemId */
export const deleteItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listId = param(req, 'id');
    const itemId = param(req, 'itemId');
    await ownerOrThrow(listId, uid(req));

    const item = await prisma.shoppingListItem.findUnique({ where: { id: itemId } });
    if (!item || item.listId !== listId) throw createError(404, 'Item not found');

    await prisma.shoppingListItem.delete({ where: { id: itemId } });
    res.json({ success: true, data: { message: 'Item removed' } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/shopping-lists/:id/items — clear checked items */
export const clearCheckedItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listId = param(req, 'id');
    await ownerOrThrow(listId, uid(req));

    const { count } = await prisma.shoppingListItem.deleteMany({
      where: { listId, checked: true },
    });

    res.json({ success: true, data: { removed: count } });
  } catch (err) {
    next(err);
  }
};
