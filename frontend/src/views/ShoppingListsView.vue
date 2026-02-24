<template>
  <div class="container mx-auto px-4 py-8 max-w-2xl">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Shopping Lists</h1>
      <button @click="showCreate = true" class="btn-primary">+ New List</button>
    </div>

    <!-- Create list form -->
    <div v-if="showCreate" class="card mb-6 p-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">New Shopping List</h2>
      <form @submit.prevent="handleCreate" class="flex gap-2">
        <input
          v-model="newListName"
          ref="createInput"
          type="text"
          placeholder="List name..."
          class="input flex-1"
          maxlength="100"
          required
        />
        <button type="submit" class="btn-primary" :disabled="creating">
          {{ creating ? 'Creating...' : 'Create' }}
        </button>
        <button type="button" @click="showCreate = false; newListName = ''" class="btn-secondary">
          Cancel
        </button>
      </form>
      <p v-if="createError" class="text-red-500 text-sm mt-2">{{ createError }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <span class="text-gray-400">Loading...</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="lists.length === 0" class="text-center py-16 text-gray-400">
      <svg class="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p class="text-lg">No shopping lists yet.</p>
      <p class="text-sm mt-1">Create one above, or add ingredients from any recipe.</p>
    </div>

    <!-- Lists -->
    <ul v-else class="space-y-3">
      <li
        v-for="list in lists"
        :key="list.id"
        class="card p-4 flex items-center gap-4 hover:shadow-md dark:hover:shadow-black/30 transition-shadow cursor-pointer"
        @click="router.push(`/shopping-lists/${list.id}`)"
      >
        <!-- Icon -->
        <div class="shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-900 dark:text-gray-100 truncate">{{ list.name }}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            <span v-if="list.uncheckedItems > 0" class="text-primary-600 dark:text-primary-400 font-medium">
              {{ list.uncheckedItems }} remaining
            </span>
            <span v-else-if="list.totalItems > 0" class="text-green-600 dark:text-green-400 font-medium">
              All done ✓
            </span>
            <span v-else>Empty</span>
            <span v-if="list.totalItems > 0" class="ml-1 text-gray-400">
              ({{ list.totalItems }} total)
            </span>
          </p>
        </div>

        <!-- Delete -->
        <button
          @click.stop="handleDelete(list.id)"
          class="shrink-0 p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded"
          title="Delete list"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import type { ShoppingListSummary } from '@/types';

const router = useRouter();
const lists = ref<ShoppingListSummary[]>([]);
const loading = ref(true);

const showCreate = ref(false);
const newListName = ref('');
const creating = ref(false);
const createError = ref('');
const createInput = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  await load();
});

async function load() {
  try {
    const res = await api.getShoppingLists();
    lists.value = res.data.lists;
  } finally {
    loading.value = false;
  }
}

// Focus input when form opens
watch(showCreate, async (val) => {
  if (val) {
    await nextTick();
    createInput.value?.focus();
  }
});

async function handleCreate() {
  const name = newListName.value.trim();
  if (!name) return;
  creating.value = true;
  createError.value = '';
  try {
    const res = await api.createShoppingList(name);
    lists.value.unshift({
      id: res.data.list.id,
      name: res.data.list.name,
      totalItems: 0,
      uncheckedItems: 0,
      createdAt: res.data.list.createdAt,
      updatedAt: res.data.list.updatedAt,
    });
    newListName.value = '';
    showCreate.value = false;
    router.push(`/shopping-lists/${res.data.list.id}`);
  } catch {
    createError.value = 'Failed to create list.';
  } finally {
    creating.value = false;
  }
}

async function handleDelete(id: string) {
  if (!confirm('Delete this shopping list?')) return;
  try {
    await api.deleteShoppingList(id);
    lists.value = lists.value.filter((l) => l.id !== id);
  } catch {
    // silently ignore
  }
}
</script>
