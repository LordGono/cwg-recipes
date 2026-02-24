import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import path from 'path';
import fs from 'fs';
import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import { calculateMacros, suggestTags } from '../services/gemini';

// Helper to include tags in recipe queries
const recipeInclude = {
  user: {
    select: {
      id: true,
      username: true,
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
};

// Helper to parse multipart body fields (strings when sent via FormData)
const parseMultipartBody = (req: Request) => {
  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');
  if (!isMultipart) return req.body;

  const body = { ...req.body };
  if (typeof body.ingredients === 'string') body.ingredients = JSON.parse(body.ingredients);
  if (typeof body.instructions === 'string') body.instructions = JSON.parse(body.instructions);
  if (typeof body.tags === 'string') body.tags = JSON.parse(body.tags);
  if (typeof body.countries === 'string') body.countries = JSON.parse(body.countries);
  if (typeof body.prepTime === 'string') body.prepTime = body.prepTime ? parseInt(body.prepTime) : undefined;
  if (typeof body.cookTime === 'string') body.cookTime = body.cookTime ? parseInt(body.cookTime) : undefined;
  if (typeof body.totalTime === 'string') body.totalTime = body.totalTime ? parseInt(body.totalTime) : undefined;
  if (typeof body.servings === 'string') body.servings = body.servings ? parseInt(body.servings) : undefined;
  return body;
};

// Helper to find-or-create tags and connect them to a recipe
const syncRecipeTags = async (recipeId: string, tagNames: string[]) => {
  // Delete existing recipe-tag relations
  await prisma.recipeTag.deleteMany({ where: { recipeId } });

  if (!tagNames || tagNames.length === 0) return;

  for (const name of tagNames) {
    const normalizedName = name.trim().toLowerCase();
    if (!normalizedName) continue;

    // Find or create the tag
    let tag = await prisma.tag.findUnique({ where: { name: normalizedName } });
    if (!tag) {
      tag = await prisma.tag.create({ data: { name: normalizedName } });
    }

    // Create the relation
    await prisma.recipeTag.create({
      data: { recipeId, tagId: tag.id },
    });
  }
};

// Helper to delete an image file
const deleteImageFile = (imageUrl: string | null) => {
  if (!imageUrl) return;
  const filePath = path.join(__dirname, '../../', imageUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

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
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('countries')
    .optional()
    .isArray()
    .withMessage('Countries must be an array'),
  body('countries.*')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Each country must be less than 100 characters'),
  body('videoUrl')
    .optional({ nullable: true })
    .trim()
    .custom((val) => {
      if (!val) return true;
      try {
        const u = new URL(val);
        const isYouTube =
          u.hostname === 'youtu.be' ||
          u.hostname === 'www.youtube.com' ||
          u.hostname === 'youtube.com' ||
          u.hostname === 'm.youtube.com';
        if (!isYouTube) throw new Error();
        return true;
      } catch {
        throw new Error('Video URL must be a valid YouTube link');
      }
    }),
];

// Find recipe IDs whose ingredients contain the search string (case-insensitive)
const findRecipeIdsByIngredient = async (search: string): Promise<string[]> => {
  const pattern = `%${search}%`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM recipes WHERE ingredients::text ILIKE ${pattern}
  `;
  return rows.map((r) => r.id);
};

// Multipart-aware validation middleware (skips body validation when FormData)
export const recipeMultipartValidation = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');
  if (isMultipart) {
    // Parse string fields before validation
    const parsed = parseMultipartBody(req);
    req.body = parsed;
  }
  next();
};

// Get all recipes with search and filtering
export const getAllRecipes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, sortBy = 'createdAt', order = 'desc', limit, offset, tag } = req.query;

    const where: any = {};

    // Search functionality (name, description, and ingredients)
    if (search && typeof search === 'string') {
      const ingredientIds = await findRecipeIdsByIngredient(search);
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        ...(ingredientIds.length > 0 ? [{ id: { in: ingredientIds } }] : []),
      ];
    }

    // Tag filter
    if (tag && typeof tag === 'string') {
      where.tags = {
        some: {
          tag: { name: tag.toLowerCase() },
        },
      };
    }

    // Build orderBy - pinned recipes always first
    const orderByField: any = {};
    if (sortBy === 'name' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
      orderByField[sortBy] = order === 'asc' ? 'asc' : 'desc';
    } else {
      orderByField.createdAt = 'desc';
    }

    const orderBy = [
      { isPinned: 'desc' as const },
      orderByField,
    ];

    const recipes = await prisma.recipe.findMany({
      where,
      orderBy,
      take: limit ? parseInt(limit as string) : undefined,
      skip: offset ? parseInt(offset as string) : undefined,
      include: recipeInclude,
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

// Get current user's recipes
export const getMyRecipes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createError(401, 'Authentication required');
    }

    const { search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const where: any = { createdBy: req.user.userId };

    if (search && typeof search === 'string') {
      const ingredientIds = await findRecipeIdsByIngredient(search);
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            ...(ingredientIds.length > 0 ? [{ id: { in: ingredientIds } }] : []),
          ],
        },
      ];
    }

    const orderByField: any = {};
    if (sortBy === 'name' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
      orderByField[sortBy] = order === 'asc' ? 'asc' : 'desc';
    } else {
      orderByField.createdAt = 'desc';
    }

    const orderBy = [
      { isPinned: 'desc' as const },
      orderByField,
    ];

    const recipes = await prisma.recipe.findMany({
      where,
      orderBy,
      include: recipeInclude,
    });

    const total = await prisma.recipe.count({ where });

    return res.json({
      success: true,
      data: {
        recipes,
        total,
        limit: recipes.length,
        offset: 0,
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
      include: recipeInclude,
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
      tags,
      countries,
      videoUrl,
    } = req.body;

    // Handle image upload
    const imageUrl = req.file ? `uploads/${req.file.filename}` : undefined;

    const countriesArray: string[] = Array.isArray(countries) ? countries.map((c: string) => c.trim()).filter(Boolean) : [];

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
        imageUrl,
        countries: countriesArray as object,
        videoUrl: videoUrl || null,
        createdBy: req.user.userId,
      },
      include: recipeInclude,
    });

    // Build effective tag list — auto-inject each country as a tag
    const effectiveTags: string[] = [...(Array.isArray(tags) ? tags : [])];
    for (const c of countriesArray) {
      const t = c.toLowerCase();
      if (t && !effectiveTags.map((x) => x.toLowerCase()).includes(t)) {
        effectiveTags.push(t);
      }
    }

    // Handle tags
    if (effectiveTags.length > 0) {
      await syncRecipeTags(recipe.id, effectiveTags);
      // Re-fetch with tags
      const updatedRecipe = await prisma.recipe.findUnique({
        where: { id: recipe.id },
        include: recipeInclude,
      });
      return res.status(201).json({
        success: true,
        message: 'Recipe created successfully',
        data: { recipe: updatedRecipe },
      }) as any;
    }

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
      tags,
      countries,
      videoUrl,
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

    // Handle image upload
    let imageUrl = existingRecipe.imageUrl;
    if (req.file) {
      // Delete old image if replacing
      deleteImageFile(existingRecipe.imageUrl);
      imageUrl = `uploads/${req.file.filename}`;
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
        imageUrl,
        countries: countries !== undefined
          ? (Array.isArray(countries) ? countries.map((c: string) => c.trim()).filter(Boolean) : []) as object
          : existingRecipe.countries as object,
        videoUrl: videoUrl !== undefined ? (videoUrl || null) : existingRecipe.videoUrl,
      },
      include: recipeInclude,
    });

    // Build effective tag list — auto-inject each country as a tag
    if (tags && Array.isArray(tags)) {
      const resolvedCountries = countries !== undefined
        ? (Array.isArray(countries) ? countries.map((c: string) => c.trim()).filter(Boolean) : [])
        : (existingRecipe.countries as string[] || []);
      const effectiveTags: string[] = [...tags];
      for (const c of resolvedCountries) {
        const t = c.toLowerCase();
        if (t && !effectiveTags.map((x) => x.toLowerCase()).includes(t)) {
          effectiveTags.push(t);
        }
      }
      await syncRecipeTags(recipe.id, effectiveTags);
    }

    // Re-fetch with updated tags
    const updatedRecipe = await prisma.recipe.findUnique({
      where: { id: recipe.id },
      include: recipeInclude,
    });

    return res.json({
      success: true,
      message: 'Recipe updated successfully',
      data: { recipe: updatedRecipe },
    }) as any;
  } catch (error) {
    return next(error);
  }
};

// Toggle pin status
export const togglePinRecipe = async (
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

    const existingRecipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!existingRecipe) {
      throw createError(404, 'Recipe not found');
    }

    // Check ownership or admin
    if (existingRecipe.createdBy !== req.user.userId && !req.user.isAdmin) {
      throw createError(403, 'You do not have permission to pin this recipe');
    }

    const recipe = await prisma.recipe.update({
      where: { id: recipeId },
      data: { isPinned: !existingRecipe.isPinned },
      include: recipeInclude,
    });

    return res.json({
      success: true,
      message: recipe.isPinned ? 'Recipe pinned' : 'Recipe unpinned',
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

    // Delete image file if exists
    deleteImageFile(existingRecipe.imageUrl);

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

// Calculate and persist macros for a recipe
export const calculateRecipeMacros = async (
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

    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) {
      throw createError(404, 'Recipe not found');
    }

    if (recipe.createdBy !== req.user.userId && !req.user.isAdmin) {
      throw createError(403, 'You do not have permission to update this recipe');
    }

    const ingredients = recipe.ingredients as Array<{ item: string; amount: string }>;
    const macros = await calculateMacros(ingredients, recipe.servings);

    await prisma.recipe.update({
      where: { id: recipeId },
      data: { macros: macros as object },
    });

    return res.json({
      success: true,
      data: { macros },
    }) as any;
  } catch (error) {
    return next(error);
  }
};

// Suggest tags for a recipe using Gemini AI
export const suggestTagsForRecipe = async (
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

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: recipeInclude,
    });
    if (!recipe) {
      throw createError(404, 'Recipe not found');
    }

    if (recipe.createdBy !== req.user.userId && !req.user.isAdmin) {
      throw createError(403, 'You do not have permission to suggest tags for this recipe');
    }

    const allTags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    const existingTagNames = allTags.map((t) => t.name);
    const currentTagNames = recipe.tags.map((rt) => rt.tag.name);

    const recipeData = {
      name: recipe.name,
      description: recipe.description ?? undefined,
      ingredients: recipe.ingredients as Array<{ item: string; amount: string }>,
      instructions: recipe.instructions as Array<{ step: number; text: string }>,
    };

    const suggestions = await suggestTags(recipeData, existingTagNames, currentTagNames);
    const filtered = suggestions.filter((s) => !currentTagNames.includes(s));

    return res.json({
      success: true,
      data: { suggestions: filtered },
    }) as any;
  } catch (error) {
    return next(error);
  }
};

// Add tags to a recipe (additive — does not remove existing tags)
export const addTagsToRecipe = async (
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
    const { tags: newTags } = req.body;

    if (!Array.isArray(newTags)) {
      throw createError(400, 'tags must be an array');
    }

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: recipeInclude,
    });
    if (!recipe) {
      throw createError(404, 'Recipe not found');
    }

    if (recipe.createdBy !== req.user.userId && !req.user.isAdmin) {
      throw createError(403, 'You do not have permission to update this recipe');
    }

    const currentTagNames = recipe.tags.map((rt) => rt.tag.name);
    const merged = [
      ...new Set([
        ...currentTagNames,
        ...newTags.map((t: string) => t.trim().toLowerCase()).filter(Boolean),
      ]),
    ];

    await syncRecipeTags(recipeId, merged);

    const updatedRecipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: recipeInclude,
    });

    return res.json({
      success: true,
      data: { recipe: updatedRecipe },
    }) as any;
  } catch (error) {
    return next(error);
  }
};

// Export all recipes as JSON download
export const exportRecipes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const where = req.query['mine'] === 'true' && req.user
      ? { createdBy: req.user.userId as string }
      : {};

    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        user: { select: { username: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const exported = recipes.map((r) => ({
      name: r.name,
      description: r.description,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      totalTime: r.totalTime,
      servings: r.servings,
      ingredients: r.ingredients,
      instructions: r.instructions,
      countries: r.countries,
      videoUrl: r.videoUrl,
      tags: r.tags.map((rt) => rt.tag.name),
      createdBy: r.user.username,
      createdAt: r.createdAt,
    }));

    const filename = `cwg-recipes-export-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json({ exportedAt: new Date().toISOString(), count: exported.length, recipes: exported });
  } catch (error) {
    next(error);
  }
};

// Get recipe counts per country
export const getCountryCounts = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const rows = await prisma.$queryRaw<{ country: string; count: bigint }[]>`
      SELECT country_name AS country, COUNT(*)::bigint AS count
      FROM recipes, jsonb_array_elements_text(countries) AS country_name
      WHERE country_name != ''
      GROUP BY country_name
      ORDER BY count DESC
    `;
    const data = rows.map((r) => ({ country: r.country, count: Number(r.count) }));
    return res.json({ success: true, data: { countries: data } }) as any;
  } catch (error) {
    return next(error);
  }
};
