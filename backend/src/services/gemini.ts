import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { createError } from '../middleware/errorHandler';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(config.geminiApiKey || '');

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

/**
 * Extract recipe from HTML content using Gemini API
 */
export async function extractRecipeFromHTML(htmlContent: string): Promise<ExtractionResult> {
  if (!config.geminiApiKey) {
    throw createError(500, 'Gemini API key not configured');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      RECIPE_EXTRACTION_PROMPT,
      `Recipe page content:\n${htmlContent}`,
    ]);

    const response = result.response;
    const text = response.text();

    // Clean up response (remove markdown code blocks if present)
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Parse JSON
    const recipe: RecipeData = JSON.parse(cleanedText);

    // Validate required fields
    if (!recipe.name || !recipe.ingredients || !recipe.instructions) {
      throw createError(400, 'Extracted recipe is missing required fields');
    }

    // Get token usage (if available)
    const tokensUsed = response.usageMetadata?.totalTokenCount;

    return {
      recipe,
      tokensUsed,
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error; // Re-throw our custom errors
    }

    // Handle Gemini API errors
    if (error.message?.includes('API key')) {
      throw createError(500, 'Invalid Gemini API key');
    }

    if (error.message?.includes('quota') || error.message?.includes('429')) {
      throw createError(429, 'Gemini API quota exceeded. This resets within 1-2 minutes. Please try again shortly.');
    }

    if (error instanceof SyntaxError) {
      throw createError(500, 'Failed to parse recipe data from AI response');
    }

    throw createError(500, `Recipe extraction failed: ${error.message}`);
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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBuffer.toString('base64'),
        },
      },
      RECIPE_EXTRACTION_PROMPT,
    ]);

    const response = result.response;
    const text = response.text();

    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const recipe: RecipeData = JSON.parse(cleanedText);

    if (!recipe.name || !recipe.ingredients || !recipe.instructions) {
      throw createError(400, 'Extracted recipe is missing required fields');
    }

    const tokensUsed = response.usageMetadata?.totalTokenCount;

    return { recipe, tokensUsed };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    if (error.message?.includes('API key')) {
      throw createError(500, 'Invalid Gemini API key');
    }

    if (error.message?.includes('quota') || error.message?.includes('429')) {
      throw createError(429, 'Gemini API quota exceeded. Please try again shortly.');
    }

    if (error instanceof SyntaxError) {
      throw createError(500, 'Failed to parse recipe data from AI response');
    }

    throw createError(500, `Recipe extraction failed: ${error.message}`);
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

  // TODO: Implement video processing
  // 1. Read video file
  // 2. Convert to Gemini-compatible format
  // 3. Send to Gemini with video analysis prompt
  // 4. Parse response

  throw createError(501, 'Video import not yet implemented');
}

/**
 * Test Gemini API connection
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    if (!config.geminiApiKey) {
      return false;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    await model.generateContent('Test');
    return true;
  } catch {
    return false;
  }
}
