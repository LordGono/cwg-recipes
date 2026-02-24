import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { createError } from '../middleware/errorHandler';
import { fetchHTML, extractStructuredData, cleanHTMLForGemini } from '../services/structuredDataExtractor';
import {
  extractRecipeFromHTML,
  extractRecipeFromPDF,
  extractRecipeFromText,
  extractRecipeFromVideoFile,
  extractRecipeFromVideoUrl,
} from '../services/gemini';
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
 * Import recipe from pasted plain text
 * POST /api/import/text
 */
export const importFromText = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw createError(401, 'Authentication required');

    const { text } = req.body as { text?: string };
    if (!text || text.trim().length < 20) {
      throw createError(400, 'Please paste at least some recipe text');
    }
    if (text.length > 50000) {
      throw createError(400, 'Text is too long (max 50,000 characters)');
    }

    await checkGeminiLimits();

    const { recipe, tokensUsed } = await extractRecipeFromText(text.trim());

    await recordGeminiUsage(req.user.userId, 'text', tokensUsed, true);

    return res.json({
      success: true,
      method: 'gemini',
      message: 'Recipe extracted from pasted text via AI',
      data: { recipe },
    }) as any;
  } catch (error: any) {
    if (error.statusCode === 429 && req.user) {
      await recordGeminiUsage(req.user.userId, 'text', undefined, false);
    }
    return next(error);
  }
};

/**
 * Import recipe from exported JSON
 * POST /api/import/json
 */
export const importFromJSON = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw createError(401, 'Authentication required');

    const body = req.body as Record<string, unknown>;

    // Accept either a single recipe object or an export file wrapping { recipes: [...] }
    const raw: unknown = Array.isArray(body.recipes)
      ? (body.recipes as unknown[])[0]   // use first recipe from an export file
      : body;

    if (!raw || typeof raw !== 'object') {
      throw createError(400, 'Invalid JSON — expected a recipe object');
    }

    const r = raw as Record<string, unknown>;

    if (!r['name'] || typeof r['name'] !== 'string') {
      throw createError(400, 'Recipe JSON must have a "name" field');
    }
    if (!Array.isArray(r['ingredients'])) {
      throw createError(400, 'Recipe JSON must have an "ingredients" array');
    }
    if (!Array.isArray(r['instructions'])) {
      throw createError(400, 'Recipe JSON must have an "instructions" array');
    }

    const recipe = {
      name: String(r['name']),
      description: r['description'] ? String(r['description']) : undefined,
      prepTime: typeof r['prepTime'] === 'number' ? r['prepTime'] : undefined,
      cookTime: typeof r['cookTime'] === 'number' ? r['cookTime'] : undefined,
      totalTime: typeof r['totalTime'] === 'number' ? r['totalTime'] : undefined,
      servings: typeof r['servings'] === 'number' ? r['servings'] : undefined,
      ingredients: r['ingredients'] as { item: string; amount: string }[],
      instructions: r['instructions'] as { step: number; text: string }[],
      tags: Array.isArray(r['tags']) ? (r['tags'] as string[]) : [],
      countries: Array.isArray(r['countries']) ? (r['countries'] as string[]) : [],
      videoUrl: r['videoUrl'] ? String(r['videoUrl']) : undefined,
    };

    return res.json({
      success: true,
      method: 'json',
      message: 'Recipe parsed from JSON',
      data: { recipe },
    }) as any;
  } catch (error) {
    return next(error);
  }
};

const SUPPORTED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/mpeg',
]);

const ALLOWED_VIDEO_DOMAINS = [
  'youtube.com', 'youtu.be', 'music.youtube.com',
  'tiktok.com', 'vm.tiktok.com',
  'instagram.com',
  'facebook.com', 'fb.watch', 'fb.com',
];

function validateVideoUrl(url: string): void {
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw createError(400, 'Invalid URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createError(400, 'Only HTTP/HTTPS URLs are supported');
  }
  const hostname = parsed.hostname.replace(/^www\./, '');
  const allowed = ALLOWED_VIDEO_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith('.' + d)
  );
  if (!allowed) {
    throw createError(400, 'Supported platforms: YouTube, TikTok, Instagram, Facebook');
  }
}

/**
 * Import recipe from uploaded video file
 * POST /api/import/video
 */
export const importFromVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw createError(401, 'Authentication required');
    if (!req.file) throw createError(400, 'Video file is required');

    const { mimetype, buffer } = req.file;
    if (!SUPPORTED_VIDEO_TYPES.has(mimetype)) {
      throw createError(400, `Unsupported video format. Supported: MP4, WebM, MOV, AVI, MKV`);
    }

    await checkGeminiLimits();
    const { recipe, tokensUsed } = await extractRecipeFromVideoFile(buffer, mimetype);
    await recordGeminiUsage(req.user.userId, 'video', tokensUsed, true);

    return res.json({
      success: true,
      method: 'gemini',
      message: 'Recipe extracted from video via AI',
      data: { recipe },
    }) as any;
  } catch (error: any) {
    if (error.statusCode === 429 && req.user) {
      await recordGeminiUsage(req.user.userId, 'video', undefined, false);
    }
    return next(error);
  }
};

/**
 * Import recipe from a social-media video URL (YouTube, TikTok, Reels)
 * POST /api/import/video-url
 */
export const importFromVideoURL = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw createError(401, 'Authentication required');

    const { url } = req.body as { url?: string };
    if (!url || !url.trim()) throw createError(400, 'Video URL is required');
    validateVideoUrl(url.trim());

    await checkGeminiLimits();
    const { recipe, tokensUsed } = await extractRecipeFromVideoUrl(url.trim());
    await recordGeminiUsage(req.user.userId, 'video', tokensUsed, true);

    return res.json({
      success: true,
      method: 'gemini',
      message: 'Recipe extracted from video URL via AI',
      data: { recipe },
    }) as any;
  } catch (error: any) {
    if (error.statusCode === 429 && req.user) {
      await recordGeminiUsage(req.user.userId, 'video', undefined, false);
    }
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
