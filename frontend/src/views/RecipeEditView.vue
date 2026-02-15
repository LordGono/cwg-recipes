<template>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Edit Recipe</h1>

    <!-- Loading state -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-600 dark:text-gray-400">Loading recipe...</p>
    </div>

    <!-- Error state -->
    <div
      v-else-if="loadError"
      class="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded"
    >
      {{ loadError }}
    </div>

    <!-- Form -->
    <div v-else-if="recipe" class="card">
      <RecipeForm
        :initial-data="recipe"
        :loading="recipeStore.loading"
        :error="recipeStore.error"
        submit-label="Update Recipe"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRecipeStore } from '@/stores/recipes';
import RecipeForm from '@/components/RecipeForm.vue';
import type { Recipe, RecipeInput } from '@/types';

const route = useRoute();
const router = useRouter();
const recipeStore = useRecipeStore();

const recipe = ref<Recipe | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);

onMounted(async () => {
  try {
    const id = route.params.id as string;
    recipe.value = await recipeStore.fetchRecipe(id);
  } catch (err: any) {
    loadError.value = err.response?.data?.message || 'Failed to load recipe';
  } finally {
    loading.value = false;
  }
});

const handleSubmit = async (data: RecipeInput, image?: File) => {
  if (!recipe.value) return;

  try {
    await recipeStore.updateRecipe(recipe.value.id, data, image);
    router.push(`/recipes/${recipe.value.id}`);
  } catch (error) {
    console.error('Failed to update recipe:', error);
  }
};

const handleCancel = () => {
  if (recipe.value) {
    router.push(`/recipes/${recipe.value.id}`);
  } else {
    router.push('/');
  }
};
</script>
