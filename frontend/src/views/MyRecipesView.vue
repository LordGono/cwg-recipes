<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">My Recipes</h1>

      <!-- Sort options -->
      <div class="flex items-center space-x-2">
        <label class="text-sm text-gray-600 dark:text-gray-400">Sort by:</label>
        <select
          v-model="sortBy"
          @change="handleSortChange"
          class="input px-3 py-1 text-sm"
        >
          <option value="createdAt">Date Created</option>
          <option value="updatedAt">Date Updated</option>
          <option value="name">Name</option>
        </select>
        <button
          @click="toggleSortOrder"
          class="btn-secondary py-1 px-3 text-sm"
        >
          {{ sortOrder === 'desc' ? '↓' : '↑' }}
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="recipeStore.loading" class="text-center py-12">
      <p class="text-gray-600 dark:text-gray-400">Loading recipes...</p>
    </div>

    <!-- Error state -->
    <div
      v-else-if="recipeStore.error"
      class="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded"
    >
      {{ recipeStore.error }}
    </div>

    <!-- Empty state -->
    <div
      v-else-if="recipeStore.recipes.length === 0"
      class="text-center py-12"
    >
      <p class="text-gray-600 dark:text-gray-400 mb-4">
        {{ recipeStore.searchQuery ? 'No recipes found.' : "You haven't created any recipes yet." }}
      </p>
      <RouterLink
        v-if="!recipeStore.searchQuery"
        to="/recipes/new"
        class="btn-primary inline-block"
      >
        + Create Recipe
      </RouterLink>
    </div>

    <!-- Recipe grid -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <RecipeCard
        v-for="recipe in recipeStore.recipes"
        :key="recipe.id"
        :recipe="recipe"
        @delete="handleDelete"
        @toggle-pin="handleTogglePin"
      />
    </div>

    <!-- Results summary -->
    <div v-if="recipeStore.recipes.length > 0" class="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
      {{ recipeStore.recipes.length }} recipe{{ recipeStore.recipes.length === 1 ? '' : 's' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useRecipeStore } from '@/stores/recipes';
import RecipeCard from '@/components/RecipeCard.vue';

const recipeStore = useRecipeStore();

const sortBy = ref(recipeStore.sortBy);
const sortOrder = ref<'asc' | 'desc'>(recipeStore.sortOrder);

onMounted(() => {
  recipeStore.fetchMyRecipes();
});

const handleSortChange = () => {
  recipeStore.setSort(sortBy.value, sortOrder.value);
  recipeStore.fetchMyRecipes();
};

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  handleSortChange();
};

const handleDelete = async (id: string) => {
  try {
    await recipeStore.deleteRecipe(id);
  } catch (error) {
    console.error('Failed to delete recipe:', error);
  }
};

const handleTogglePin = async (id: string) => {
  try {
    await recipeStore.togglePinRecipe(id);
    // Re-fetch my recipes after pin toggle
    await recipeStore.fetchMyRecipes();
  } catch (error) {
    console.error('Failed to toggle pin:', error);
  }
};
</script>
