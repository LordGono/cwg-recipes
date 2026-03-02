import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import { createError } from '../middleware/errorHandler';

const GEMINI_MODEL = config.geminiModel || 'gemini-2.0-flash';

// Lazy-initialize so the server starts even without a key configured
let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    if (!config.geminiApiKey) {
      throw createError(503, 'Gemini API key is not configured');
    }
    _ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return _ai;
}

interface RecipeData {
  name: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: number;
  ingredients: Array<{ item: string; amount: string }>;
  instructions: Array<{ step: number; text: string }>;
  tags?: string[];
  countries?: string[];
}

interface ExtractionResult {
  recipe: RecipeData;
  tokensUsed?: number;
}

const RECIPE_EXTRACTION_PROMPT = `
You are a recipe extraction assistant. Analyze the provided content and extract recipe information.

Return ONLY valid JSON in this exact format (no markdown, no code blocks, just JSON):
{
  "name": "Recipe name",
  "description": "Brief description of the dish",
  "prepTime": 15,
  "cookTime": 30,
  "totalTime": 45,
  "servings": 4,
  "ingredients": [
    {"item": "all-purpose flour", "amount": "2 cups"},
    {"item": "sugar", "amount": "1 cup"}
  ],
  "instructions": [
    {"step": 1, "text": "Preheat oven to 350°F"},
    {"step": 2, "text": "Mix dry ingredients together"}
  ],
  "tags": ["dessert", "baking", "easy"],
  "countries": ["Italy"]
}

Rules:
- Times are in minutes (integers)
- Ingredient amounts should be specific with units
- Instructions should be clear, sequential steps
- Tags should be lowercase, single words or hyphenated phrases (e.g. "comfort-food")
- countries: infer the country or region of origin for the cuisine (e.g. ["Italy"], ["Mexico"], ["Japan"], ["United States"]). Use full country names. Include multiple if the dish is genuinely multi-cultural. Omit if the origin is unclear.
- If a field is not available, omit it (except name, ingredients, instructions which are required)
- Extract exactly what's in the recipe, don't add or infer information

Analyze this content and extract the recipe:
`;

function cleanAndParseResponse(text: string): RecipeData {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\n/, '').replace(/\n```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\n/, '').replace(/\n```$/, '');
  }
  const recipe: RecipeData = JSON.parse(cleaned);
  if (!recipe.name || !recipe.ingredients || !recipe.instructions) {
    throw createError(400, 'Extracted recipe is missing required fields');
  }
  return recipe;
}

function handleGeminiError(error: any): never {
  if (error.statusCode) throw error;

  const msg: string = error.message || '';
  console.error('[Gemini] API error:', msg);

  if (msg.includes('API key') || msg.includes('API_KEY')) {
    throw createError(500, 'Invalid Gemini API key');
  }
  if (msg.includes('quota') || msg.includes('429') || error.status === 429) {
    throw createError(429, 'Gemini API quota exceeded. Please try again shortly.');
  }
  if (error instanceof SyntaxError) {
    throw createError(500, 'Failed to parse recipe data from AI response');
  }
  throw createError(500, `Recipe extraction failed: ${msg}`);
}

/**
 * Extract recipe from HTML content using Gemini API
 */
export async function extractRecipeFromHTML(htmlContent: string): Promise<ExtractionResult> {
  if (!config.geminiApiKey) {
    throw createError(500, 'Gemini API key not configured');
  }

  try {
    const response = await getAI().models.generateContent({
      model: GEMINI_MODEL,
      contents: `${RECIPE_EXTRACTION_PROMPT}\n\nRecipe page content:\n${htmlContent}`,
    });

    const recipe = cleanAndParseResponse(response.text ?? '');
    const tokensUsed = response.usageMetadata?.totalTokenCount;
    return { recipe, tokensUsed };
  } catch (error: any) {
    handleGeminiError(error);
  }
}

/**
 * Extract recipe from PDF content using Gemini API
 */
export async function extractRecipeFromPDF(pdfBuffer: Buffer): Promise<ExtractionResult> {
  if (!config.geminiApiKey) {
    throw createError(500, 'Gemini API key not configured');
  }

  try {
    const response = await getAI().models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: pdfBuffer.toString('base64'),
              },
            },
            { text: RECIPE_EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const recipe = cleanAndParseResponse(response.text ?? '');
    const tokensUsed = response.usageMetadata?.totalTokenCount;
    return { recipe, tokensUsed };
  } catch (error: any) {
    handleGeminiError(error);
  }
}

/**
 * Extract recipe from plain text (copy-pasted from a webpage, book, etc.)
 */
export async function extractRecipeFromText(text: string): Promise<ExtractionResult> {
  if (!config.geminiApiKey) {
    throw createError(500, 'Gemini API key not configured');
  }

  try {
    const response = await getAI().models.generateContent({
      model: GEMINI_MODEL,
      contents: `${RECIPE_EXTRACTION_PROMPT}\n\nRecipe text:\n${text}`,
    });

    const recipe = cleanAndParseResponse(response.text ?? '');
    const tokensUsed = response.usageMetadata?.totalTokenCount;
    return { recipe, tokensUsed };
  } catch (error: any) {
    handleGeminiError(error);
  }
}

// Maximum time to wait for Gemini to finish processing a video
const VIDEO_PROCESSING_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Upload a video Blob to the Gemini Files API, wait for ACTIVE state,
 * extract the recipe, then delete the remote file.
 */
async function extractRecipeFromVideoBlob(
  blob: Blob,
  mimeType: string
): Promise<ExtractionResult> {
  const ai = getAI();

  let uploadedFile = await ai.files.upload({
    file: blob,
    config: { mimeType, displayName: 'recipe-video' },
  });

  const deadline = Date.now() + VIDEO_PROCESSING_TIMEOUT_MS;
  try {
    while (uploadedFile.state === 'PROCESSING') {
      if (Date.now() > deadline) {
        throw createError(504, 'Video processing timed out. Try a shorter clip (under 5 minutes).');
      }
      await new Promise((r) => setTimeout(r, 3000));
      uploadedFile = await ai.files.get({ name: uploadedFile.name! });
    }

    if (uploadedFile.state === 'FAILED') {
      throw createError(500, 'Gemini could not process the video. Try a different format or a shorter clip.');
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          parts: [
            { fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType } },
            { text: RECIPE_EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const recipe = cleanAndParseResponse(response.text ?? '');
    const tokensUsed = response.usageMetadata?.totalTokenCount;
    return { recipe, tokensUsed };
  } finally {
    // Best-effort cleanup — don't fail the request if the delete call fails
    ai.files.delete({ name: uploadedFile.name! }).catch(() => {});
  }
}

/**
 * Extract recipe from an uploaded video file (Buffer from multer).
 */
export async function extractRecipeFromVideoFile(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  if (!config.geminiApiKey) throw createError(500, 'Gemini API key not configured');
  try {
    const blob = new Blob([buffer], { type: mimeType });
    return await extractRecipeFromVideoBlob(blob, mimeType);
  } catch (error: any) {
    handleGeminiError(error);
  }
}

/**
 * Download a video from a social-media URL using yt-dlp, then extract the recipe.
 * Supported platforms: YouTube (Shorts), TikTok, Instagram Reels, Facebook Reels.
 */
export async function extractRecipeFromVideoUrl(
  videoUrl: string
): Promise<ExtractionResult> {
  if (!config.geminiApiKey) throw createError(500, 'Gemini API key not configured');

  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const { mkdtemp, readdir, readFile, rm } = await import('fs/promises');
  const { tmpdir } = await import('os');
  const { join } = await import('path');
  const execFileAsync = promisify(execFile);

  const tmpDir = await mkdtemp(join(tmpdir(), 'recipe-video-'));
  try {
    const outputTemplate = join(tmpDir, '%(id)s.%(ext)s');

    await execFileAsync('yt-dlp', [
      '--format', 'best[ext=mp4][height<=480]/best[ext=mp4]/best[height<=480]/best',
      '--max-filesize', '200M',
      '--output', outputTemplate,
      '--no-playlist',
      '--match-filter', 'duration < 600',  // max 10 min
      '--restrict-filenames',
      videoUrl,
    ], { timeout: 120_000 });

    const files = await readdir(tmpDir);
    if (files.length === 0) throw createError(500, 'Video download produced no output file');

    const videoPath = join(tmpDir, files[0]);
    const ext = (files[0].split('.').pop() ?? 'mp4').toLowerCase();
    const mime = ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4';

    const buffer = await readFile(videoPath);
    const blob = new Blob([buffer], { type: mime });
    return await extractRecipeFromVideoBlob(blob, mime);
  } catch (error: any) {
    if (error.statusCode) throw error;
    const msg: string = error.message || '';
    if (msg.includes('ENOENT') || msg.includes('yt-dlp')) {
      throw createError(503, 'Video download service unavailable. Contact the administrator.');
    }
    if (msg.includes('match-filter') || msg.includes('duration')) {
      throw createError(400, 'Video is too long (max 10 minutes). Try a shorter clip.');
    }
    if (msg.includes('filesize') || msg.includes('max-filesize')) {
      throw createError(400, 'Video file is too large (max 200 MB).');
    }
    handleGeminiError(error);
  } finally {
    rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export interface MacroData {
  calories: number;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
  fiber?: number;  // grams
}

const MACRO_PROMPT = `You are a nutrition expert. Given the recipe ingredients below, estimate the macronutrients PER SERVING.

Return ONLY valid JSON (no markdown, no code blocks, just raw JSON):
{
  "calories": 450,
  "protein": 25,
  "carbs": 35,
  "fat": 18,
  "fiber": 5
}

Rules:
- All values are PER SERVING (divide total by number of servings)
- Calories in kcal, all others in grams
- Base estimates on USDA nutritional data
- Be realistic — round to whole numbers
- Include fiber if the recipe has significant fiber sources
- If servings count is unknown, assume 4 servings

Recipe:
`;

/**
 * Estimate macronutrients per serving for a recipe using Gemini AI
 */
export async function calculateMacros(
  ingredients: Array<{ item: string; amount: string }>,
  servings: number | null | undefined
): Promise<MacroData> {
  if (!config.geminiApiKey) {
    throw createError(500, 'Gemini API key not configured');
  }

  const ingredientList = ingredients
    .map((ing) => `- ${ing.amount} ${ing.item}`)
    .join('\n');

  const servingsLine = servings ? `Servings: ${servings}\n` : '';
  const prompt = `${MACRO_PROMPT}${servingsLine}Ingredients:\n${ingredientList}`;

  try {
    const response = await getAI().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    let text = (response.text ?? '').trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const data = JSON.parse(text) as MacroData;
    if (typeof data.calories !== 'number' || typeof data.protein !== 'number') {
      throw createError(500, 'Invalid macro data returned by AI');
    }

    return {
      calories: Math.round(data.calories),
      protein: Math.round(data.protein),
      carbs: Math.round(data.carbs),
      fat: Math.round(data.fat),
      fiber: data.fiber != null ? Math.round(data.fiber) : undefined,
    };
  } catch (error: any) {
    handleGeminiError(error);
  }
}

const TAG_SUGGESTION_PROMPT = `You are a recipe tagging assistant. Given a recipe and a list of existing tags, suggest 3 to 6 relevant tags.

Return ONLY a valid JSON array of lowercase strings (no markdown, no code blocks):
["tag1", "tag2", "tag3"]

Rules:
- Prefer tags from the existing tag pool when relevant
- You may suggest new tags if clearly appropriate and not in the pool
- Tags must be lowercase, single words or short hyphenated phrases (e.g. "comfort-food")
- Do NOT suggest tags already on the recipe (listed separately)
- Consider: cuisine type, meal type, dietary info, cooking method, main ingredient
`;

/**
 * Suggest relevant tags for a recipe using Gemini AI
 */
export async function suggestTags(
  recipe: RecipeData,
  existingTagNames: string[],
  currentTagNames: string[]
): Promise<string[]> {
  if (!config.geminiApiKey) {
    throw createError(503, 'Gemini API key not configured');
  }

  const ingredientList = recipe.ingredients
    .map((ing) => `- ${ing.amount} ${ing.item}`)
    .join('\n');

  const prompt =
    `${TAG_SUGGESTION_PROMPT}` +
    `Recipe name: ${recipe.name}\n` +
    (recipe.description ? `Description: ${recipe.description}\n` : '') +
    `Ingredients:\n${ingredientList}\n\n` +
    `Existing tag pool: ${existingTagNames.length > 0 ? existingTagNames.join(', ') : '(none yet)'}\n` +
    `Tags already on this recipe (do NOT suggest these): ${currentTagNames.length > 0 ? currentTagNames.join(', ') : '(none)'}`;

  try {
    const response = await getAI().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    let text = (response.text ?? '').trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const data = JSON.parse(text);
    if (!Array.isArray(data)) {
      throw createError(500, 'Invalid tag suggestions returned by AI');
    }
    return data.filter((t): t is string => typeof t === 'string').map((t) => t.toLowerCase().trim());
  } catch (error: any) {
    handleGeminiError(error);
  }
}

/**
 * Test Gemini API connection
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    if (!config.geminiApiKey) {
      return false;
    }
    await getAI().models.generateContent({ model: GEMINI_MODEL, contents: 'Test' });
    return true;
  } catch {
    return false;
  }
}
