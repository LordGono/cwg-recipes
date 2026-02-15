<template>
  <nav class="bg-white shadow-md dark:bg-gray-800 dark:shadow-lg dark:shadow-black/20">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <!-- Logo and brand -->
        <div class="flex items-center">
          <RouterLink to="/" class="text-2xl font-bold text-primary-600">
            CWG Recipes
          </RouterLink>
        </div>

        <!-- Search bar -->
        <div class="flex-1 max-w-md mx-8" v-if="route.name === 'home' || route.name === 'my-recipes'">
          <input
            v-model="searchQuery"
            @input="handleSearch"
            type="text"
            placeholder="Search recipes..."
            class="input"
          />
        </div>

        <!-- Navigation links -->
        <div class="flex items-center space-x-4">
          <!-- Theme toggle -->
          <button
            @click="themeStore.toggle()"
            class="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            :title="themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <svg v-if="themeStore.isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>

          <RouterLink
            v-if="authStore.isAuthenticated"
            to="/my-recipes"
            class="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
          >
            My Recipes
          </RouterLink>

          <RouterLink
            v-if="authStore.isAuthenticated"
            to="/recipes/new"
            class="btn-primary"
          >
            + New Recipe
          </RouterLink>

          <div v-if="authStore.isAuthenticated" class="flex items-center space-x-4">
            <span class="text-gray-700 dark:text-gray-300">{{ authStore.user?.username }}</span>
            <button @click="handleLogout" class="btn-secondary">
              Logout
            </button>
          </div>

          <RouterLink v-else to="/login" class="btn-primary">
            Login
          </RouterLink>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useRecipeStore } from '@/stores/recipes';
import { useThemeStore } from '@/stores/theme';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const recipeStore = useRecipeStore();
const themeStore = useThemeStore();

const searchQuery = ref(recipeStore.searchQuery);

const handleSearch = () => {
  recipeStore.setSearch(searchQuery.value);
  recipeStore.fetchRecipes();
};

const handleLogout = () => {
  authStore.logout();
  router.push('/');
};

// Watch for route changes to reset search if leaving home/my-recipes
watch(
  () => route.name,
  (newRoute) => {
    if (newRoute !== 'home' && newRoute !== 'my-recipes') {
      searchQuery.value = '';
    }
  }
);
</script>
