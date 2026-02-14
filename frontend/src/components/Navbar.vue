<template>
  <nav class="bg-white shadow-md">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <!-- Logo and brand -->
        <div class="flex items-center">
          <RouterLink to="/" class="text-2xl font-bold text-primary-600">
            🍳 CWG Recipes
          </RouterLink>
        </div>

        <!-- Search bar -->
        <div class="flex-1 max-w-md mx-8" v-if="route.name === 'home'">
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
          <RouterLink
            v-if="authStore.isAuthenticated"
            to="/recipes/new"
            class="btn-primary"
          >
            + New Recipe
          </RouterLink>

          <div v-if="authStore.isAuthenticated" class="flex items-center space-x-4">
            <span class="text-gray-700">{{ authStore.user?.username }}</span>
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

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const recipeStore = useRecipeStore();

const searchQuery = ref(recipeStore.searchQuery);

const handleSearch = () => {
  recipeStore.setSearch(searchQuery.value);
  recipeStore.fetchRecipes();
};

const handleLogout = () => {
  authStore.logout();
  router.push('/');
};

// Watch for route changes to reset search if leaving home
watch(
  () => route.name,
  (newRoute) => {
    if (newRoute !== 'home') {
      searchQuery.value = '';
    }
  }
);
</script>
