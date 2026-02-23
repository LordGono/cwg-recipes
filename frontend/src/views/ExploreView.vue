<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Explore by Country</h1>
    <p class="text-gray-500 dark:text-gray-400 mb-6">
      Click a country on the map to browse its recipes.
    </p>

    <!-- Map -->
    <div class="card mb-8 p-4">
      <div v-if="mapLoading" class="flex justify-center items-center h-48">
        <span class="text-gray-400">Loading map data...</span>
      </div>
      <WorldMap
        v-else
        :country-counts="countryCounts"
        :selected-country="selectedCountry"
        @select="handleCountrySelect"
      />
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-3 mb-6 text-sm text-gray-500 dark:text-gray-400">
      <span class="flex items-center gap-1">
        <span class="inline-block w-4 h-4 rounded" style="background:#d1d5db"></span> No recipes
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-4 h-4 rounded" style="background:#86efac"></span> Some recipes
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-4 h-4 rounded" style="background:#15803d"></span> Many recipes
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-4 h-4 rounded" style="background:#2563eb"></span> Selected
      </span>
    </div>

    <!-- Recipe list -->
    <template v-if="selectedCountry">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
          Recipes from {{ titleCase(selectedCountry) }}
          <span v-if="!recipesLoading" class="text-gray-400 font-normal text-base ml-1">({{ filteredRecipes.length }})</span>
        </h2>
        <button @click="clearFilter" class="btn-secondary text-sm">
          Clear filter
        </button>
      </div>

      <div v-if="recipesLoading" class="flex justify-center items-center h-32">
        <span class="text-gray-400">Loading recipes...</span>
      </div>
      <div v-else-if="filteredRecipes.length === 0" class="text-center py-12 text-gray-400">
        No recipes found for {{ titleCase(selectedCountry) }}.
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RecipeCard
          v-for="recipe in filteredRecipes"
          :key="recipe.id"
          :recipe="recipe"
          @delete="handleDelete"
          @toggle-pin="handleTogglePin"
        />
      </div>
    </template>

    <div v-else class="text-center py-12 text-gray-400">
      <p class="text-lg">Click a highlighted country on the map to see its recipes.</p>
      <p v-if="countryCounts.length > 0" class="mt-1 text-sm">
        {{ countryCounts.length }} {{ countryCounts.length === 1 ? 'country' : 'countries' }} with recipes
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import WorldMap from '@/components/WorldMap.vue';
import RecipeCard from '@/components/RecipeCard.vue';
import api from '@/services/api';
import type { CountryCount, Recipe } from '@/types';

const countryCounts = ref<CountryCount[]>([]);
const mapLoading = ref(true);

const selectedCountry = ref('');
const filteredRecipes = ref<Recipe[]>([]);
const recipesLoading = ref(false);

const titleCase = (s: string) =>
  s.replace(/\b\w/g, (c) => c.toUpperCase());

onMounted(async () => {
  try {
    const res = await api.getCountryCounts();
    countryCounts.value = res.data.countries;
  } catch {
    // non-fatal — map just shows all gray
  } finally {
    mapLoading.value = false;
  }
});

const handleCountrySelect = async (countryName: string) => {
  // Toggle off if clicking the same country
  if (selectedCountry.value.toLowerCase() === countryName.toLowerCase()) {
    clearFilter();
    return;
  }

  selectedCountry.value = countryName;
  recipesLoading.value = true;
  filteredRecipes.value = [];

  try {
    const res = await api.getRecipes({ tag: countryName.toLowerCase() });
    filteredRecipes.value = res.data.recipes;
  } catch {
    filteredRecipes.value = [];
  } finally {
    recipesLoading.value = false;
  }
};

const clearFilter = () => {
  selectedCountry.value = '';
  filteredRecipes.value = [];
};

const handleDelete = async (id: string) => {
  try {
    await api.deleteRecipe(id);
    filteredRecipes.value = filteredRecipes.value.filter((r) => r.id !== id);
    // Refresh country counts
    const res = await api.getCountryCounts();
    countryCounts.value = res.data.countries;
  } catch {
    // silently ignore
  }
};

const handleTogglePin = async (id: string) => {
  try {
    const res = await api.togglePinRecipe(id);
    const idx = filteredRecipes.value.findIndex((r) => r.id === id);
    if (idx !== -1) filteredRecipes.value[idx] = res.data.recipe;
  } catch {
    // silently ignore
  }
};
</script>
