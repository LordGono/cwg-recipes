import * as cheerio from 'cheerio';
import { createError } from '../middleware/errorHandler';

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

/**
 * Parse ISO 8601 duration (PT15M) to minutes
 */
function parseDuration(duration: string): number | undefined {
  if (!duration) return undefined;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');

  return hours * 60 + minutes;
}

/**
 * Extract recipe from JSON-LD structured data
 */
function extractFromJsonLd(jsonLd: any): RecipeData | null {
  try {
    // Handle arrays of JSON-LD objects
    const recipes = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    const recipeData = recipes.find((item: any) => item['@type'] === 'Recipe');

    if (!recipeData) return null;

    // Extract ingredients
    const rawIngredients = recipeData.recipeIngredient || [];
    const ingredients = rawIngredients.map((ing: string) => {
      // Try to split "2 cups flour" into amount and item
      const match = ing.match(/^([\d\s\/\-¼½¾⅓⅔⅛⅜⅝⅞.]+\s*[a-zA-Z]*)\s+(.+)$/);
      if (match) {
        return { amount: match[1].trim(), item: match[2].trim() };
      }
      // Fallback: treat whole string as item with "1" as amount
      return { amount: '1', item: ing };
    });

    // Extract instructions
    const rawInstructions = recipeData.recipeInstructions || [];
    let instructions: Array<{ step: number; text: string }> = [];

    if (Array.isArray(rawInstructions)) {
      instructions = rawInstructions.map((inst: any, index: number) => {
        const text = typeof inst === 'string' ? inst : inst.text || inst.description || '';
        return { step: index + 1, text };
      });
    } else if (typeof rawInstructions === 'string') {
      // Sometimes instructions are a single string
      const steps = rawInstructions.split(/\d+\.\s*/).filter(Boolean);
      instructions = steps.map((text: string, index: number) => ({
        step: index + 1,
        text: text.trim(),
      }));
    }

    // Extract category/tags
    const tags: string[] = [];
    if (recipeData.recipeCategory) {
      tags.push(
        ...(Array.isArray(recipeData.recipeCategory)
          ? recipeData.recipeCategory
          : [recipeData.recipeCategory]
        ).map((t: string) => t.toLowerCase())
      );
    }
    if (recipeData.recipeCuisine) {
      tags.push(
        ...(Array.isArray(recipeData.recipeCuisine)
          ? recipeData.recipeCuisine
          : [recipeData.recipeCuisine]
        ).map((t: string) => t.toLowerCase())
      );
    }
    if (recipeData.keywords) {
      const keywords = Array.isArray(recipeData.keywords)
        ? recipeData.keywords
        : recipeData.keywords.split(',');
      tags.push(...keywords.map((t: string) => t.trim().toLowerCase()));
    }

    // Parse servings (can be "4", "4 servings", or "Serves 4")
    let servings: number | undefined;
    if (recipeData.recipeYield) {
      const yieldMatch = recipeData.recipeYield.toString().match(/\d+/);
      servings = yieldMatch ? parseInt(yieldMatch[0]) : undefined;
    }

    return {
      name: recipeData.name,
      description: recipeData.description,
      prepTime: parseDuration(recipeData.prepTime),
      cookTime: parseDuration(recipeData.cookTime),
      totalTime: parseDuration(recipeData.totalTime),
      servings,
      ingredients,
      instructions,
      tags: tags.length > 0 ? [...new Set(tags)] : undefined, // Remove duplicates
    };
  } catch (error) {
    console.error('Error parsing JSON-LD:', error);
    return null;
  }
}

/**
 * Extract structured recipe data from HTML (JSON-LD, Microdata, etc.)
 * Returns null if no structured data found
 */
export function extractStructuredData(html: string): RecipeData | null {
  const $ = cheerio.load(html);

  // Try JSON-LD first (most common)
  const jsonLdScripts = $('script[type="application/ld+json"]');

  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const jsonContent = $(jsonLdScripts[i]).html();
      if (!jsonContent) continue;

      const jsonLd = JSON.parse(jsonContent);
      const recipe = extractFromJsonLd(jsonLd);

      if (recipe) {
        return recipe;
      }
    } catch (error) {
      // Continue to next script tag
      continue;
    }
  }

  // TODO: Add support for Microdata if needed
  // Many sites use JSON-LD, so this covers ~70% of cases

  return null;
}

/**
 * Strip HTML down to just readable text content for Gemini
 * Removes scripts, styles, nav, ads, etc. and truncates to stay within token limits
 */
export function cleanHTMLForGemini(html: string, maxChars = 30000): string {
  const $ = cheerio.load(html);

  // Remove elements that add noise and tokens but no recipe value
  $('script, style, noscript').remove();
  $('nav, header, footer, aside').remove();
  $('[class*="ad"], [class*="banner"], [class*="cookie"], [class*="popup"]').remove();
  $('[class*="sidebar"], [class*="social"], [class*="share"], [class*="comment"]').remove();
  $('[class*="newsletter"], [class*="subscribe"], [class*="promo"]').remove();
  $('[id*="ad"], [id*="banner"], [id*="cookie"], [id*="popup"]').remove();

  // Try to find the main content area to further reduce noise
  const mainSelectors = [
    '[class*="recipe"]',
    '[class*="article"]',
    '[class*="post-content"]',
    '[class*="entry-content"]',
    'article',
    'main',
  ];

  let content = '';
  for (const selector of mainSelectors) {
    const el = $(selector).first();
    if (el.length && el.text().trim().length > 500) {
      content = el.text();
      break;
    }
  }

  // Fall back to body text if no main section found
  if (!content) {
    content = $('body').text();
  }

  // Collapse excessive whitespace
  content = content.replace(/\s+/g, ' ').trim();

  // Truncate to stay within Gemini's token limits
  if (content.length > maxChars) {
    content = content.substring(0, maxChars) + '... [content truncated]';
  }

  return content;
}

/**
 * Detect if a response page is a bot-block / Cloudflare challenge
 */
function isBotBlock(html: string, status: number): boolean {
  if (status === 403 || status === 429) return true;
  // Cloudflare and similar challenges return 200 but with challenge HTML
  const lower = html.toLowerCase();
  return (
    (lower.includes('cf-browser-verification') ||
      lower.includes('checking your browser') ||
      lower.includes('enable javascript') ||
      lower.includes('ddos-guard') ||
      lower.includes('just a moment')) &&
    html.length < 20000 // Real recipe pages are large
  );
}

/**
 * Fetch HTML from URL
 */
export async function fetchHTML(url: string): Promise<string> {
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw createError(400, 'Invalid URL protocol. Only HTTP and HTTPS are supported.');
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (response.status === 403 || response.status === 429) {
      throw createError(
        400,
        `This site (${parsedUrl.hostname}) blocks automated access. Try a different recipe site or enter the recipe manually.`
      );
    }

    if (!response.ok) {
      throw createError(400, `Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    if (isBotBlock(html, response.status)) {
      throw createError(
        400,
        `This site (${parsedUrl.hostname}) requires browser verification and can't be imported automatically. Try a different recipe site or enter the recipe manually.`
      );
    }

    return html;
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw createError(
        408,
        'The site took too long to respond. It may be blocking automated access. Try a different recipe site or enter the recipe manually.'
      );
    }

    if (error.statusCode) {
      throw error; // Re-throw our custom errors
    }

    throw createError(400, `Failed to fetch URL: ${error.message}`);
  }
}
