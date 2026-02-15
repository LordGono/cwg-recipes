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
          <span v-if="recipe.servings">Servings: {{ recipe.servings }}</span>
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
              v-for="(ingredient, index) in recipe.ingredients"
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
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useRecipeStore } from '@/stores/recipes';
import type { Recipe } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const recipeStore = useRecipeStore();

const recipe = ref<Recipe | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const canEdit = computed(() => {
  if (!authStore.isAuthenticated || !recipe.value) return false;
  return (
    authStore.user?.id === recipe.value.createdBy || authStore.isAdmin
  );
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
