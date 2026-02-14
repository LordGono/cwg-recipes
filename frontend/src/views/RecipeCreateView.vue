<template>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900 mb-6">Create New Recipe</h1>

    <div class="card">
      <RecipeForm
        :loading="recipeStore.loading"
        :error="recipeStore.error"
        submit-label="Create Recipe"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useRecipeStore } from '@/stores/recipes';
import RecipeForm from '@/components/RecipeForm.vue';
import type { RecipeInput } from '@/types';

const router = useRouter();
const recipeStore = useRecipeStore();

const handleSubmit = async (data: RecipeInput) => {
  try {
    const recipe = await recipeStore.createRecipe(data);
    router.push(`/recipes/${recipe.id}`);
  } catch (error) {
    console.error('Failed to create recipe:', error);
  }
};

const handleCancel = () => {
  router.push('/');
};
</script>
