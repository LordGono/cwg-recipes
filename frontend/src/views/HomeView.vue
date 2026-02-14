<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-gray-900">All Recipes</h1>

      <!-- Sort options -->
      <div class="flex items-center space-x-2">
        <label class="text-sm text-gray-600">Sort by:</label>
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
      <p class="text-gray-600">Loading recipes...</p>
    </div>

    <!-- Error state -->
    <div
      v-else-if="recipeStore.error"
      class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
    >
      {{ recipeStore.error }}
    </div>

    <!-- Empty state -->
    <div
      v-else-if="recipeStore.recipes.length === 0"
      class="text-center py-12"
    >
      <p class="text-gray-600 mb-4">
        {{ recipeStore.searchQuery ? 'No recipes found.' : 'No recipes yet. Create your first recipe!' }}
      </p>
      <RouterLink
        v-if="authStore.isAuthenticated && !recipeStore.searchQuery"
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
      />
    </div>

    <!-- Results summary -->
    <div v-if="recipeStore.recipes.length > 0" class="mt-6 text-center text-sm text-gray-600">
      Showing {{ recipeStore.recipes.length }} of {{ recipeStore.total }} recipes
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useRecipeStore } from '@/stores/recipes';
import RecipeCard from '@/components/RecipeCard.vue';

const authStore = useAuthStore();
const recipeStore = useRecipeStore();

const sortBy = ref(recipeStore.sortBy);
const sortOrder = ref<'asc' | 'desc'>(recipeStore.sortOrder);

onMounted(() => {
  recipeStore.fetchRecipes();
});

const handleSortChange = () => {
  recipeStore.setSort(sortBy.value, sortOrder.value);
  recipeStore.fetchRecipes();
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
</script>
