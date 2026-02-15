<template>
  <div class="card hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden">
    <!-- Image -->
    <img
      v-if="recipe.imageUrl"
      :src="getImageUrl(recipe.imageUrl)"
      :alt="recipe.name"
      class="w-full h-48 object-cover -mt-6 -mx-6 mb-4"
      style="width: calc(100% + 3rem);"
    />

    <div @click="goToRecipe">
      <!-- Pin badge -->
      <div v-if="recipe.isPinned" class="flex items-center mb-2">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Pinned
        </span>
      </div>

      <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ recipe.name }}</h3>
      <p v-if="recipe.description" class="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {{ recipe.description }}
      </p>

      <!-- Tags -->
      <div v-if="recipe.tags && recipe.tags.length > 0" class="flex flex-wrap gap-1 mb-3">
        <span
          v-for="rt in recipe.tags"
          :key="rt.tagId"
          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400"
        >
          {{ rt.tag.name }}
        </span>
      </div>

      <!-- Time and servings info -->
      <div class="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <span v-if="recipe.totalTime" class="flex items-center">
          {{ recipe.totalTime }} min
        </span>
        <span v-if="recipe.servings" class="flex items-center">
          {{ recipe.servings }} servings
        </span>
      </div>

      <!-- Author and date -->
      <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span v-if="recipe.user">By {{ recipe.user.username }}</span>
        <span>{{ formatDate(recipe.createdAt) }}</span>
      </div>
    </div>

    <!-- Action buttons -->
    <div
      v-if="canEdit"
      class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex space-x-2"
    >
      <button @click="handlePin" class="btn-secondary flex-none px-3" :title="recipe.isPinned ? 'Unpin' : 'Pin'">
        {{ recipe.isPinned ? 'Unpin' : 'Pin' }}
      </button>
      <button @click="handleEdit" class="btn-secondary flex-1">
        Edit
      </button>
      <button @click="handleDelete" class="btn-danger flex-1">
        Delete
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import type { Recipe } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Props {
  recipe: Recipe;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  delete: [id: string];
  togglePin: [id: string];
}>();

const router = useRouter();
const authStore = useAuthStore();

const canEdit = computed(() => {
  if (!authStore.isAuthenticated) return false;
  return (
    authStore.user?.id === props.recipe.createdBy || authStore.isAdmin
  );
});

const getImageUrl = (imageUrl: string): string => {
  if (imageUrl.startsWith('http')) return imageUrl;
  const baseUrl = API_URL.replace(/\/api$/, '');
  return `${baseUrl}/${imageUrl}`;
};

const goToRecipe = () => {
  router.push(`/recipes/${props.recipe.id}`);
};

const handlePin = (e: Event) => {
  e.stopPropagation();
  emit('togglePin', props.recipe.id);
};

const handleEdit = (e: Event) => {
  e.stopPropagation();
  router.push(`/recipes/${props.recipe.id}/edit`);
};

const handleDelete = (e: Event) => {
  e.stopPropagation();
  if (confirm(`Are you sure you want to delete "${props.recipe.name}"?`)) {
    emit('delete', props.recipe.id);
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
