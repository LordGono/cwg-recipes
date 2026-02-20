import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import { createError } from '../middleware/errorHandler';

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: config.geminiApiKey || '' });
const GEMINI_MODEL = config.geminiModel || 'gemini-3-flash-preview';

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
  "tags": ["dessert", "baking", "easy"]
}

Rules:
- Times are in minutes (integers)
- Ingredient amounts should be specific with units
- Instructions should be clear, sequential steps
- Tags should be lowercase, single words or hyphenated phrases
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
    const response = await ai.models.generateContent({
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
    const response = await ai.models.generateContent({
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
 * Extract recipe from video file using Gemini API
 * (Future implementation when video import is added)
 */
export async function extractRecipeFromVideo(
  _videoPath: string
): Promise<ExtractionResult> {
  if (!config.geminiApiKey) {
    throw createError(500, 'Gemini API key not configured');
  }

  throw createError(501, 'Video import not yet implemented');
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
    const response = await ai.models.generateContent({
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

/**
 * Test Gemini API connection
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    if (!config.geminiApiKey) {
      return false;
    }
    await ai.models.generateContent({ model: GEMINI_MODEL, contents: 'Test' });
    return true;
  } catch {
    return false;
  }
}
