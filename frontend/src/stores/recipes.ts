import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/api';
import type { Recipe, RecipeInput } from '@/types';

export const useRecipeStore = defineStore('recipes', () => {
  const recipes = ref<Recipe[]>([]);
  const currentRecipe = ref<Recipe | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);
  const searchQuery = ref('');
  const sortBy = ref('createdAt');
  const sortOrder = ref<'asc' | 'desc'>('desc');

  const fetchRecipes = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.getRecipes({
        search: searchQuery.value || undefined,
        sortBy: sortBy.value,
        order: sortOrder.value,
      });
      recipes.value = response.data.recipes;
      total.value = response.data.total;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch recipes';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchRecipe = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.getRecipe(id);
      currentRecipe.value = response.data.recipe;
      return response.data.recipe;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch recipe';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createRecipe = async (recipe: RecipeInput) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.createRecipe(recipe);
      recipes.value.unshift(response.data.recipe);
      total.value++;
      return response.data.recipe;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create recipe';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateRecipe = async (id: string, recipe: RecipeInput) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.updateRecipe(id, recipe);
      const index = recipes.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        recipes.value[index] = response.data.recipe;
      }
      if (currentRecipe.value?.id === id) {
        currentRecipe.value = response.data.recipe;
      }
      return response.data.recipe;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update recipe';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteRecipe = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      await api.deleteRecipe(id);
      recipes.value = recipes.value.filter((r) => r.id !== id);
      total.value--;
      if (currentRecipe.value?.id === id) {
        currentRecipe.value = null;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete recipe';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const setSearch = (query: string) => {
    searchQuery.value = query;
  };

  const setSort = (field: string, order: 'asc' | 'desc') => {
    sortBy.value = field;
    sortOrder.value = order;
  };

  return {
    recipes,
    currentRecipe,
    loading,
    error,
    total,
    searchQuery,
    sortBy,
    sortOrder,
    fetchRecipes,
    fetchRecipe,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    setSearch,
    setSort,
  };
});
