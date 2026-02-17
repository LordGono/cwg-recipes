<template>
  <div class="max-w-4xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Create New Recipe</h1>

      <!-- Import Button -->
      <button
        @click="showImportModal = true"
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Import from URL
      </button>
    </div>

    <div class="card">
      <RecipeForm
        :initial-data="importedData"
        :loading="recipeStore.loading"
        :error="recipeStore.error"
        submit-label="Create Recipe"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>

    <!-- Import Modal -->
    <ImportRecipeModal
      :is-open="showImportModal"
      @close="showImportModal = false"
      @imported="handleImported"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useRecipeStore } from '@/stores/recipes';
import RecipeForm from '@/components/RecipeForm.vue';
import ImportRecipeModal from '@/components/ImportRecipeModal.vue';
import type { RecipeInput } from '@/types';

const router = useRouter();
const recipeStore = useRecipeStore();

const showImportModal = ref(false);
const importedData = ref<RecipeInput | undefined>(undefined);

const handleSubmit = async (data: RecipeInput, image?: File) => {
  try {
    const recipe = await recipeStore.createRecipe(data, image);
    router.push(`/recipes/${recipe.id}`);
  } catch (error) {
    console.error('Failed to create recipe:', error);
  }
};

const handleCancel = () => {
  router.push('/');
};

const handleImported = (recipe: RecipeInput) => {
  importedData.value = recipe;
};
</script>
