import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { createError } from '../middleware/errorHandler';
import { fetchHTML, extractStructuredData, cleanHTMLForGemini } from '../services/structuredDataExtractor';
import { extractRecipeFromHTML, extractRecipeFromPDF } from '../services/gemini';
import {
  checkGeminiLimits,
  recordGeminiUsage,
  getGeminiUsageStats,
} from '../services/rateLimiter';

// Validation middleware
export const importValidation = [
  body('url')
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Valid URL is required'),
];

/**
 * Import recipe from URL
 * POST /api/import/url
 */
export const importFromURL = async (
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

    const { url } = req.body;

    // Fetch HTML content
    const html = await fetchHTML(url);

    // Step 1: Try structured data extraction (FREE, instant)
    const structuredRecipe = extractStructuredData(html);

    if (structuredRecipe) {
      return res.json({
        success: true,
        method: 'structured',
        message: 'Recipe imported via structured data (free)',
        data: { recipe: structuredRecipe },
      }) as any;
    }

    // Step 2: No structured data - use Gemini AI (rate-limited)

    // Check rate limits BEFORE calling API
    const usage = await checkGeminiLimits();

    // Clean HTML before sending to Gemini (strips scripts/ads/nav, truncates to ~30k chars)
    const cleanedContent = cleanHTMLForGemini(html);

    // Call Gemini API with cleaned content
    const { recipe, tokensUsed } = await extractRecipeFromHTML(cleanedContent);

    // Record usage
    await recordGeminiUsage(req.user.userId, 'url', tokensUsed, true);

    return res.json({
      success: true,
      method: 'gemini',
      message: 'Recipe extracted via AI',
      data: { recipe },
      usage: {
        rpd: { used: usage.rpd.used + 1, remaining: usage.rpd.remaining - 1 },
      },
    }) as any;
  } catch (error: any) {
    // Record failed attempt if it was rate limit or API error
    if (error.statusCode === 429 && req.user) {
      await recordGeminiUsage(req.user.userId, 'url', undefined, false);
    }

    return next(error);
  }
};

/**
 * Import recipe from PDF file
 * POST /api/import/pdf
 */
export const importFromPDF = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createError(401, 'Authentication required');
    }

    if (!req.file) {
      throw createError(400, 'PDF file is required');
    }

    if (req.file.mimetype !== 'application/pdf') {
      throw createError(400, 'Only PDF files are supported');
    }

    // Check rate limits before calling API
    await checkGeminiLimits();

    const { recipe, tokensUsed } = await extractRecipeFromPDF(req.file.buffer);

    await recordGeminiUsage(req.user.userId, 'pdf', tokensUsed, true);

    return res.json({
      success: true,
      method: 'gemini',
      message: 'Recipe extracted from PDF via AI',
      data: { recipe },
    }) as any;
  } catch (error: any) {
    if (error.statusCode === 429 && req.user) {
      await recordGeminiUsage(req.user.userId, 'pdf', undefined, false);
    }

    return next(error);
  }
};

/**
 * Import recipe from video file
 * POST /api/import/video
 * (Future implementation)
 */
export const importFromVideo = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createError(401, 'Authentication required');
    }

    // TODO: Implement video import
    // 1. Validate video file
    // 2. Check duration (max 5 minutes)
    // 3. Check rate limits
    // 4. Process with Gemini
    // 5. Record usage
    // 6. Return extracted recipe

    throw createError(501, 'Video import not yet implemented. Check back in a future update!');
  } catch (error) {
    return next(error);
  }
};

/**
 * Get current API usage statistics
 * GET /api/import/usage
 */
export const getUsageStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await getGeminiUsageStats();

    return res.json({
      success: true,
      data: stats,
    }) as any;
  } catch (error) {
    return next(error);
  }
};
