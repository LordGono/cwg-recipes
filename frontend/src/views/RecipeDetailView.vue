<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-600 dark:text-gray-400">Loading recipe...</p>
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded"
    >
      {{ error }}
    </div>

    <!-- Recipe detail -->
    <div v-else-if="recipe" class="max-w-4xl mx-auto">
      <!-- Image -->
      <img
        v-if="recipe.imageUrl"
        :src="getImageUrl(recipe.imageUrl)"
        :alt="recipe.name"
        class="w-full h-64 md:h-96 object-cover rounded-lg mb-6"
      />

      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-100">{{ recipe.name }}</h1>
            <span
              v-if="recipe.isPinned"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
            >
              Pinned
            </span>
          </div>
          <div v-if="canEdit" class="flex space-x-2">
            <button @click="handleTogglePin" class="btn-secondary">
              {{ recipe.isPinned ? 'Unpin' : 'Pin' }}
            </button>
            <RouterLink
              :to="`/recipes/${recipe.id}/edit`"
              class="btn-secondary"
            >
              Edit
            </RouterLink>
            <button @click="handleDelete" class="btn-danger">
              Delete
            </button>
          </div>
        </div>

        <p v-if="recipe.description" class="text-lg text-gray-600 dark:text-gray-400 mb-4">
          {{ recipe.description }}
        </p>

        <!-- Tags -->
        <div v-if="recipe.tags && recipe.tags.length > 0" class="flex flex-wrap gap-2 mb-4">
          <span
            v-for="rt in recipe.tags"
            :key="rt.tagId"
            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400"
          >
            {{ rt.tag.name }}
          </span>
        </div>

        <!-- Meta info -->
        <div class="flex items-center space-x-6 text-gray-600 dark:text-gray-400">
          <span v-if="recipe.prepTime">Prep: {{ recipe.prepTime }} min</span>
          <span v-if="recipe.cookTime">Cook: {{ recipe.cookTime }} min</span>
          <span v-if="recipe.totalTime">Total: {{ recipe.totalTime }} min</span>
          <!-- Serving scaler -->
          <div v-if="recipe.servings" class="flex items-center gap-2">
            <span>Servings:</span>
            <button
              @click="scaleServings = Math.max(1, scaleServings - 1)"
              class="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-bold leading-none"
            >−</button>
            <span class="w-6 text-center font-semibold text-gray-900 dark:text-gray-100">{{ scaleServings }}</span>
            <button
              @click="scaleServings++"
              class="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-bold leading-none"
            >+</button>
            <button
              v-if="scaleServings !== recipe.servings"
              @click="scaleServings = recipe.servings"
              class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >reset</button>
          </div>
        </div>

        <div class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          <span v-if="recipe.user">By {{ recipe.user.username }}</span>
          <span class="mx-2">&middot;</span>
          <span>{{ formatDate(recipe.createdAt) }}</span>
        </div>
      </div>

      <!-- Content grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Ingredients -->
        <div class="card">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Ingredients</h2>
          <ul class="space-y-2">
            <li
              v-for="(ingredient, index) in scaledIngredients"
              :key="index"
              class="flex items-start"
            >
              <span class="text-primary-600 mr-2">&bull;</span>
              <span>
                <strong>{{ ingredient.amount }}</strong> {{ ingredient.item }}
              </span>
            </li>
          </ul>
        </div>

        <!-- Instructions -->
        <div class="card">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Instructions</h2>
          <ol class="space-y-4">
            <li
              v-for="instruction in recipe.instructions"
              :key="instruction.step"
              class="flex"
            >
              <span class="text-primary-600 font-bold mr-3">
                {{ instruction.step }}.
              </span>
              <span class="flex-1">{{ instruction.text }}</span>
            </li>
          </ol>
        </div>
      </div>

      <!-- Nutrition / Macros -->
      <div class="mt-8">
        <MacroChart v-if="recipe.macros" :macros="recipe.macros" />
        <div v-else-if="canEdit" class="card flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark:text-gray-100">Nutrition Estimate</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Let AI calculate macros per serving from the ingredients.</p>
          </div>
          <button
            @click="handleCalculateMacros"
            :disabled="macrosLoading"
            class="btn-secondary flex-shrink-0 ml-4"
          >
            {{ macrosLoading ? 'Calculating...' : 'Calculate Nutrition' }}
          </button>
        </div>
        <p v-if="macrosError" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ macrosError }}</p>
      </div>

      <!-- YouTube embed -->
      <div v-if="youtubeEmbedUrl" class="mt-8">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Video</h2>
        <div class="relative w-full" style="padding-bottom: 56.25%;">
          <iframe
            :src="youtubeEmbedUrl"
            class="absolute inset-0 w-full h-full rounded-lg"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          />
        </div>
      </div>

      <!-- Back button -->
      <div class="mt-8">
        <RouterLink to="/" class="btn-secondary">
          &larr; Back to Recipes
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useRecipeStore } from '@/stores/recipes';
import api from '@/services/api';
import MacroChart from '@/components/MacroChart.vue';
import type { Recipe } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const recipeStore = useRecipeStore();

const recipe = ref<Recipe | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const macrosLoading = ref(false);
const macrosError = ref<string | null>(null);
const scaleServings = ref(1);

// Keep scaleServings in sync when recipe loads
watch(() => recipe.value?.servings, (s) => {
  if (s) scaleServings.value = s;
});

// --- Scaling helpers ---

const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75,
  '⅓': 1/3, '⅔': 2/3,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

function parseAmount(str: string): number | null {
  // Replace unicode fractions with decimal equivalents
  let s = str.trim();
  for (const [ch, val] of Object.entries(UNICODE_FRACTIONS)) {
    s = s.replace(ch, ` ${val}`);
  }
  s = s.trim();

  // Mixed number: "1 1/2" or "1 0.5"
  const mixed = s.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseFloat(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);

  // Simple fraction: "1/2"
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);

  // Plain number (possibly with decimal from unicode sub)
  const num = parseFloat(s);
  if (!isNaN(num)) return num;

  return null;
}

// Common fractions to snap to (denominator ≤ 8)
const FRACTIONS = [
  [1,8],[1,4],[1,3],[3,8],[1,2],[5,8],[2,3],[3,4],[7,8],
];

function formatAmount(value: number): string {
  if (value <= 0) return '0';

  const whole = Math.floor(value);
  const rem = value - whole;

  if (rem < 0.01) return whole === 0 ? '0' : String(whole);

  // Find closest simple fraction
  let bestFrac = '';
  let bestDiff = Infinity;
  for (const [n, d] of FRACTIONS) {
    const diff = Math.abs(rem - n / d);
    if (diff < bestDiff) { bestDiff = diff; bestFrac = `${n}/${d}`; }
  }

  // If close enough to a fraction, use it; otherwise 1 decimal place
  if (bestDiff < 0.04) {
    return whole > 0 ? `${whole} ${bestFrac}` : bestFrac;
  }

  const rounded = Math.round(value * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

const scaledIngredients = computed(() => {
  if (!recipe.value) return [];
  const originalServings = recipe.value.servings;
  if (!originalServings || scaleServings.value === originalServings) {
    return recipe.value.ingredients;
  }

  const factor = scaleServings.value / originalServings;

  return recipe.value.ingredients.map((ing) => {
    // Amount may be "2 cups" — split numeric prefix from unit suffix
    const match = ing.amount.match(/^([¼½¾⅓⅔⅛⅜⅝⅞\d\s\/\.]+)(.*)/u);
    if (!match) return ing;

    const numStr = match[1].trim();
    const unit = match[2].trim();
    const parsed = parseAmount(numStr);

    if (parsed === null) return ing; // "to taste", "pinch", etc.

    const scaled = formatAmount(parsed * factor);
    return { ...ing, amount: unit ? `${scaled} ${unit}` : scaled };
  });
});

const canEdit = computed(() => {
  if (!authStore.isAuthenticated || !recipe.value) return false;
  return (
    authStore.user?.id === recipe.value.createdBy || authStore.isAdmin
  );
});

const youtubeEmbedUrl = computed((): string | null => {
  const url = recipe.value?.videoUrl;
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let videoId: string | null = null;
    if (parsed.hostname === 'youtu.be') {
      videoId = parsed.pathname.slice(1).split('?')[0];
    } else if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v');
      } else if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/embed/')[1].split('?')[0];
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/shorts/')[1].split('?')[0];
      }
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
});

const getImageUrl = (imageUrl: string): string => {
  if (imageUrl.startsWith('http')) return imageUrl;
  const baseUrl = API_URL.replace(/\/api$/, '');
  return `${baseUrl}/${imageUrl}`;
};

onMounted(async () => {
  try {
    const id = route.params.id as string;
    recipe.value = await recipeStore.fetchRecipe(id);
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load recipe';
  } finally {
    loading.value = false;
  }
});

const handleCalculateMacros = async () => {
  if (!recipe.value) return;
  macrosLoading.value = true;
  macrosError.value = null;
  try {
    const response = await api.calculateMacros(recipe.value.id);
    recipe.value = { ...recipe.value, macros: response.data.macros };
  } catch (err: any) {
    macrosError.value = err.response?.data?.message || 'Failed to calculate nutrition';
  } finally {
    macrosLoading.value = false;
  }
};

const handleTogglePin = async () => {
  if (!recipe.value) return;
  try {
    await recipeStore.togglePinRecipe(recipe.value.id);
    recipe.value = recipeStore.currentRecipe;
  } catch (err) {
    error.value = 'Failed to toggle pin';
  }
};

const handleDelete = async () => {
  if (!recipe.value) return;

  if (confirm(`Are you sure you want to delete "${recipe.value.name}"?`)) {
    try {
      await recipeStore.deleteRecipe(recipe.value.id);
      router.push('/');
    } catch (err) {
      error.value = 'Failed to delete recipe';
    }
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
</script>
