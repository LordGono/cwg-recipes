import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';

// Validation middleware
export const recipeValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Recipe name is required and must be less than 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('prepTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Prep time must be a positive number'),
  body('cookTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Cook time must be a positive number'),
  body('totalTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total time must be a positive number'),
  body('servings')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Servings must be at least 1'),
  body('ingredients')
    .isArray({ min: 1 })
    .withMessage('At least one ingredient is required'),
  body('ingredients.*.item')
    .trim()
    .notEmpty()
    .withMessage('Ingredient item is required'),
  body('ingredients.*.amount')
    .trim()
    .notEmpty()
    .withMessage('Ingredient amount is required'),
  body('instructions')
    .isArray({ min: 1 })
    .withMessage('At least one instruction step is required'),
  body('instructions.*.step')
    .isInt({ min: 1 })
    .withMessage('Step number must be a positive integer'),
  body('instructions.*.text')
    .trim()
    .notEmpty()
    .withMessage('Instruction text is required'),
];

// Get all recipes with search and filtering
export const getAllRecipes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, sortBy = 'createdAt', order = 'desc', limit, offset } = req.query;

    const where: any = {};

    // Search functionality
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy object
    const orderBy: any = {};
    if (sortBy === 'name' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
      orderBy[sortBy] = order === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const recipes = await prisma.recipe.findMany({
      where,
      orderBy,
      take: limit ? parseInt(limit as string) : undefined,
      skip: offset ? parseInt(offset as string) : undefined,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    const total = await prisma.recipe.count({ where });

    return res.json({
      success: true,
      data: {
        recipes,
        total,
        limit: limit ? parseInt(limit as string) : recipes.length,
        offset: offset ? parseInt(offset as string) : 0,
      },
    }) as any;
  } catch (error) {
    return next(error);
  }
};

// Get single recipe by ID
export const getRecipeById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const recipeId = Array.isArray(id) ? id[0] : id;

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!recipe) {
      throw createError(404, 'Recipe not found');
    }

    return res.json({
      success: true,
      data: { recipe },
    }) as any;
  } catch (error) {
    return next(error);
  }
};

// Create new recipe
export const createRecipe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    if (!req.user) {
      throw createError(401, 'Authentication required');
    }

    const {
      name,
      description,
      prepTime,
      cookTime,
      totalTime,
      servings,
      ingredients,
      instructions,
    } = req.body;

    const recipe = await prisma.recipe.create({
      data: {
        name,
        description,
        prepTime,
        cookTime,
        totalTime,
        servings,
        ingredients,
        instructions,
        createdBy: req.user.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Recipe created successfully',
      data: { recipe },
    }) as any;
  } catch (error) {
    return next(error);
  }
};

// Update recipe
export const updateRecipe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    if (!req.user) {
      throw createError(401, 'Authentication required');
    }

    const { id } = req.params;
    const recipeId = Array.isArray(id) ? id[0] : id;
    const {
      name,
      description,
      prepTime,
      cookTime,
      totalTime,
      servings,
      ingredients,
      instructions,
    } = req.body;

    // Check if recipe exists
    const existingRecipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!existingRecipe) {
      throw createError(404, 'Recipe not found');
    }

    // Check ownership or admin
    if (existingRecipe.createdBy !== req.user.userId && !req.user.isAdmin) {
      throw createError(403, 'You do not have permission to update this recipe');
    }

    const recipe = await prisma.recipe.update({
      where: { id: recipeId },
      data: {
        name,
        description,
        prepTime,
        cookTime,
        totalTime,
        servings,
        ingredients,
        instructions,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: 'Recipe updated successfully',
      data: { recipe },
    }) as any;
  } catch (error) {
    return next(error);
  }
};

// Delete recipe
export const deleteRecipe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createError(401, 'Authentication required');
    }

    const { id } = req.params;
    const recipeId = Array.isArray(id) ? id[0] : id;

    // Check if recipe exists
    const existingRecipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!existingRecipe) {
      throw createError(404, 'Recipe not found');
    }

    // Check ownership or admin
    if (existingRecipe.createdBy !== req.user.userId && !req.user.isAdmin) {
      throw createError(403, 'You do not have permission to delete this recipe');
    }

    await prisma.recipe.delete({
      where: { id: recipeId },
    });

    return res.json({
      success: true,
      message: 'Recipe deleted successfully',
    }) as any;
  } catch (error) {
    return next(error);
  }
};
