<template>
  <div class="card hover:shadow-lg transition-shadow duration-200 cursor-pointer">
    <div @click="goToRecipe">
      <h3 class="text-xl font-bold text-gray-900 mb-2">{{ recipe.name }}</h3>
      <p v-if="recipe.description" class="text-gray-600 mb-4 line-clamp-2">
        {{ recipe.description }}
      </p>

      <!-- Time and servings info -->
      <div class="flex items-center space-x-4 text-sm text-gray-500 mb-4">
        <span v-if="recipe.totalTime" class="flex items-center">
          ⏱️ {{ recipe.totalTime }} min
        </span>
        <span v-if="recipe.servings" class="flex items-center">
          👥 {{ recipe.servings }} servings
        </span>
      </div>

      <!-- Author and date -->
      <div class="flex items-center justify-between text-sm text-gray-500">
        <span v-if="recipe.user">By {{ recipe.user.username }}</span>
        <span>{{ formatDate(recipe.createdAt) }}</span>
      </div>
    </div>

    <!-- Action buttons -->
    <div
      v-if="canEdit"
      class="mt-4 pt-4 border-t border-gray-200 flex space-x-2"
    >
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

interface Props {
  recipe: Recipe;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  delete: [id: string];
}>();

const router = useRouter();
const authStore = useAuthStore();

const canEdit = computed(() => {
  if (!authStore.isAuthenticated) return false;
  return (
    authStore.user?.id === props.recipe.createdBy || authStore.isAdmin
  );
});

const goToRecipe = () => {
  router.push(`/recipes/${props.recipe.id}`);
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
