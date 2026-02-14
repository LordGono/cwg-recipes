<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-600">Loading recipe...</p>
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
    >
      {{ error }}
    </div>

    <!-- Recipe detail -->
    <div v-else-if="recipe" class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-start justify-between mb-4">
          <h1 class="text-4xl font-bold text-gray-900">{{ recipe.name }}</h1>
          <div v-if="canEdit" class="flex space-x-2">
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

        <p v-if="recipe.description" class="text-lg text-gray-600 mb-4">
          {{ recipe.description }}
        </p>

        <!-- Meta info -->
        <div class="flex items-center space-x-6 text-gray-600">
          <span v-if="recipe.prepTime">⏱️ Prep: {{ recipe.prepTime }} min</span>
          <span v-if="recipe.cookTime">🍳 Cook: {{ recipe.cookTime }} min</span>
          <span v-if="recipe.totalTime">⏰ Total: {{ recipe.totalTime }} min</span>
          <span v-if="recipe.servings">👥 Servings: {{ recipe.servings }}</span>
        </div>

        <div class="mt-2 text-sm text-gray-500">
          <span v-if="recipe.user">By {{ recipe.user.username }}</span>
          <span class="mx-2">•</span>
          <span>{{ formatDate(recipe.createdAt) }}</span>
        </div>
      </div>

      <!-- Content grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Ingredients -->
        <div class="card">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Ingredients</h2>
          <ul class="space-y-2">
            <li
              v-for="(ingredient, index) in recipe.ingredients"
              :key="index"
              class="flex items-start"
            >
              <span class="text-primary-600 mr-2">•</span>
              <span>
                <strong>{{ ingredient.amount }}</strong> {{ ingredient.item }}
              </span>
            </li>
          </ul>
        </div>

        <!-- Instructions -->
        <div class="card">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Instructions</h2>
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
          ← Back to Recipes
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
