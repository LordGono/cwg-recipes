# Recipe Import Feature - Setup Guide

## Overview

The Recipe Import feature allows users to import recipes from URLs using:
1. **Structured Data Extraction** (Free, instant) - Works with 70% of major recipe sites
2. **Gemini AI** (Free tier, rate-limited) - Fallback for sites without structured data

**Future:** Video import support (5-minute limit, same Gemini API)

---

## Installation Steps

### 1. Install Backend Dependencies

```bash
cd backend
npm install @google/generative-ai cheerio
```

**Required packages:**
- `@google/generative-ai` - Google Gemini API client
- `cheerio` - HTML parsing for structured data extraction

### 2. Run Database Migration

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

This creates the `gemini_usage` table for rate limiting.

### 3. Get Gemini API Key (Optional but Recommended)

1. Go to https://ai.google.dev/
2. Click "Get API key in Google AI Studio"
3. Create new API key (free tier available)
4. Copy the API key (starts with `AIzaSy...`)

**Free Tier Limits:**
- 15 requests per minute
- 1,500 requests per day
- More than enough for family use!

### 4. Configure Environment Variables

Add to your `.env` file:

```env
# Optional: Gemini AI for recipe import
GEMINI_API_KEY=your_actual_api_key_here
```

**Without API key:** Structured data extraction still works (free, instant)
**With API key:** AI fallback available for sites without structured data

### 5. Rebuild Docker Containers

**Option A: Update (quick, ~30 seconds)**
```bash
./deploy-to-nas.sh --update
```

**Option B: Full rebuild (clean, ~2-3 minutes)**
```bash
./deploy-to-nas.sh --rebuild
```

---

## How It Works

### User Flow

1. User clicks "Import from URL" on Create Recipe page
2. Pastes recipe URL (e.g., from AllRecipes, Food Network, NYT Cooking)
3. System tries **structured data extraction first** (free, instant)
   - If successful → Recipe imported immediately
   - If failed → Falls back to **Gemini AI** (checks rate limits first)
4. Imported recipe data pre-fills the form
5. User reviews, edits if needed, and saves

### Backend Flow

```
POST /api/import/url
  ↓
Fetch HTML from URL
  ↓
Try structured data extraction (JSON-LD)
  ↓
  ✓ Found → Return immediately (free)
  ✗ Not found → Check Gemini rate limits
    ↓
    ✓ Within limits → Call Gemini API
    ✗ Limit exceeded → Return error with reset time
```

### Rate Limiting

Gemini free tier limits are enforced at three levels:

1. **Application level** (database tracking):
   - Checks usage before calling API
   - Blocks requests that would exceed limits
   - Shows clear error messages with reset times

2. **Per-minute limit:** 15 requests/minute
3. **Per-day limit:** 1,500 requests/day

**Usage is tracked in `gemini_usage` table.**

---

## API Endpoints

### Import from URL

```http
POST /api/import/url
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://example.com/recipe"
}
```

**Success Response (Structured Data):**
```json
{
  "success": true,
  "method": "structured",
  "message": "Recipe imported via structured data (free)",
  "data": {
    "recipe": {
      "name": "Chocolate Chip Cookies",
      "ingredients": [...],
      "instructions": [...],
      ...
    }
  }
}
```

**Success Response (Gemini AI):**
```json
{
  "success": true,
  "method": "gemini",
  "message": "Recipe extracted via AI",
  "data": { "recipe": {...} },
  "usage": {
    "rpd": { "used": 42, "remaining": 1458 }
  }
}
```

**Error Response (Rate Limit):**
```json
{
  "success": false,
  "message": "Daily AI limit reached (1,500/1,500). Resets in 8 hours at 2026-02-17T00:00:00.000Z."
}
```

### Get Usage Stats

```http
GET /api/import/usage
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rpm": { "used": 3, "limit": 15, "remaining": 12 },
    "rpd": { "used": 45, "limit": 1500, "remaining": 1455 },
    "tpm": { "used": 12450, "limit": 1000000, "remaining": 987550 }
  }
}
```

---

## Future: Video Import

**Coming Soon:** Import recipes from TikTok/Reels/YouTube Shorts

### Video Constraints

- **Maximum duration:** 5 minutes
- **Supported formats:** MP4, MOV, AVI, WebM
- **Processing:** Same Gemini API (native video understanding)
- **Rate limits:** Same as URL import (shared quota)

### Implementation Checklist

- [ ] Add ffmpeg to Docker image (video duration check)
- [ ] Update import controller with video endpoint
- [ ] Implement Gemini video analysis
- [ ] Add video upload UI to Android app
- [ ] Test with various cooking video formats

---

## Troubleshooting

### "Gemini API key not configured"

**Cause:** `GEMINI_API_KEY` not set in `.env`

**Solution:**
1. Get API key from https://ai.google.dev/
2. Add to `.env`: `GEMINI_API_KEY=your_key`
3. Rebuild containers: `./deploy-to-nas.sh --update`

### "Rate limit exceeded"

**Cause:** Exceeded 15 requests/minute or 1,500/day

**Solution:** Wait for reset (1 minute or next day UTC)

**Prevention:** Most imports use free structured data extraction, only fallback to AI when needed

### "Failed to parse recipe data"

**Cause:** Gemini returned invalid JSON or missing required fields

**Solution:**
- Try importing from a different URL
- Report issue with URL for investigation
- Manually enter recipe

### Import succeeds but data looks wrong

**Cause:** AI misunderstood recipe format

**Solution:**
- Edit imported data before saving
- Structured data extraction is more reliable when available

---

## Cost Analysis

**Assumptions:**
- 4 family members
- 10 URL imports per person per month = 40 total
- 70% have structured data (free)

**Math:**
- Structured data: 28/month → **FREE**
- Gemini AI: 12/month → **FREE** (well under 1,500/day limit)

**Cost: $0/month** 🎉

**To exceed free tier:**
- Would need 50+ imports per day
- Not realistic for family use

---

## Testing

### Test URLs (Known to Work)

**Structured Data (instant, free):**
- AllRecipes: https://www.allrecipes.com/
- Food Network: https://www.foodnetwork.com/
- NYT Cooking: https://cooking.nytimes.com/
- Serious Eats: https://www.seriouseats.com/
- Bon Appétit: https://www.bonappetit.com/

**No Structured Data (uses Gemini):**
- Random food blogs
- Plain text recipes
- Old recipe websites

### Manual Testing

1. **Test structured data:**
   ```
   Import from: https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/
   Expected: Instant import, "free" message
   ```

2. **Test Gemini fallback:**
   ```
   Import from: [blog without structured data]
   Expected: 2-3 second delay, "AI" message, usage stats shown
   ```

3. **Test rate limiting:**
   ```
   Make 16 imports within 1 minute
   Expected: 16th request fails with "Rate limit exceeded" error
   ```

---

## Security Notes

- ✅ API key stored server-side only (never exposed to frontend)
- ✅ Rate limiting prevents abuse
- ✅ URL validation prevents SSRF attacks
- ✅ User authentication required for all imports
- ✅ Usage tracked per-user for accountability

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Run migrations
3. ✅ Get Gemini API key (optional)
4. ✅ Configure `.env`
5. ✅ Rebuild containers
6. ✅ Test with various recipe URLs
7. ⏳ Future: Add video import for Android app

---

## Support

**Issues:** https://github.com/yourusername/cwg-recipes/issues

**Questions:** Check CLAUDE.md for development guidelines
