<template>
  <div class="container mx-auto px-4 py-8 max-w-2xl">
    <!-- Header skeleton -->
    <div v-if="loading" class="flex justify-center py-16">
      <span class="text-gray-400">Loading...</span>
    </div>

    <template v-else-if="list">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <RouterLink to="/shopping-lists" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </RouterLink>

        <!-- Editable name -->
        <template v-if="renaming">
          <form @submit.prevent="submitRename" class="flex-1 flex gap-2">
            <input v-model="renameValue" ref="renameInput" class="input flex-1" maxlength="100" />
            <button type="submit" class="btn-primary text-sm">Save</button>
            <button type="button" @click="renaming = false" class="btn-secondary text-sm">Cancel</button>
          </form>
        </template>
        <template v-else>
          <h1
            class="flex-1 text-2xl font-bold text-gray-900 dark:text-gray-100 cursor-pointer hover:opacity-70 transition-opacity"
            title="Click to rename"
            @click="startRename"
          >{{ list.name }}</h1>
        </template>
      </div>

      <!-- Action bar -->
      <div class="flex flex-wrap gap-2 mb-6">
        <button
          v-if="checkedCount > 0"
          @click="handleClearChecked"
          class="btn-secondary text-sm"
        >
          Clear checked ({{ checkedCount }})
        </button>
        <span class="text-sm text-gray-400 self-center ml-auto">
          {{ uncheckedCount }} / {{ list.items.length }} remaining
        </span>
      </div>

      <!-- Add item form -->
      <div class="card mb-6 p-4">
        <form @submit.prevent="handleAddItem" class="flex gap-2">
          <input
            v-model="newItemName"
            type="text"
            placeholder="Add item..."
            class="input flex-1"
            maxlength="200"
          />
          <input
            v-model="newItemAmount"
            type="text"
            placeholder="Amount"
            class="input w-28"
            maxlength="100"
          />
          <button type="submit" class="btn-primary" :disabled="!newItemName.trim()">Add</button>
        </form>
        <p v-if="addError" class="text-red-500 text-sm mt-2">{{ addError }}</p>
      </div>

      <!-- Items grouped: unchecked then checked -->
      <div v-if="list.items.length === 0" class="text-center py-12 text-gray-400">
        No items yet. Add one above.
      </div>

      <ul v-else class="space-y-2">
        <!-- Unchecked items -->
        <li
          v-for="item in uncheckedItems"
          :key="item.id"
          class="flex items-center gap-3 card px-4 py-3"
        >
          <button
            @click="toggleItem(item.id, true)"
            class="shrink-0 w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600
                   hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
            title="Mark as done"
          />
          <span class="flex-1 text-gray-900 dark:text-gray-100">{{ item.name }}</span>
          <span v-if="item.amount" class="text-sm text-gray-500 dark:text-gray-400 shrink-0">
            {{ item.amount }}
          </span>
          <button
            @click="handleDeleteItem(item.id)"
            class="shrink-0 p-1 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </li>

        <!-- Divider before checked items -->
        <li v-if="checkedCount > 0 && uncheckedCount > 0" class="pt-2 pb-1">
          <hr class="border-gray-200 dark:border-gray-700" />
        </li>

        <!-- Checked items -->
        <li
          v-for="item in checkedItems"
          :key="item.id"
          class="flex items-center gap-3 card px-4 py-3 opacity-50"
        >
          <button
            @click="toggleItem(item.id, false)"
            class="shrink-0 w-5 h-5 rounded border-2 border-primary-500 bg-primary-500 dark:bg-primary-600
                   flex items-center justify-center transition-colors"
            title="Unmark"
          >
            <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <span class="flex-1 line-through text-gray-500 dark:text-gray-400">{{ item.name }}</span>
          <span v-if="item.amount" class="text-sm text-gray-400 shrink-0">{{ item.amount }}</span>
          <button
            @click="handleDeleteItem(item.id)"
            class="shrink-0 p-1 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </li>
      </ul>
    </template>

    <div v-else class="text-center py-16 text-gray-400">List not found.</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '@/services/api';
import type { ShoppingList } from '@/types';

const route = useRoute();
const listId = route.params['id'] as string;

const list = ref<ShoppingList | null>(null);
const loading = ref(true);

const uncheckedItems = computed(() =>
  list.value?.items.filter((i) => !i.checked) ?? []
);
const checkedItems = computed(() =>
  list.value?.items.filter((i) => i.checked) ?? []
);
const uncheckedCount = computed(() => uncheckedItems.value.length);
const checkedCount = computed(() => checkedItems.value.length);

// Add item
const newItemName = ref('');
const newItemAmount = ref('');
const addError = ref('');

// Rename
const renaming = ref(false);
const renameValue = ref('');
const renameInput = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  try {
    const res = await api.getShoppingList(listId);
    list.value = res.data.list;
  } finally {
    loading.value = false;
  }
});

async function handleAddItem() {
  const name = newItemName.value.trim();
  if (!name || !list.value) return;
  addError.value = '';
  try {
    const res = await api.addShoppingListItem(listId, name, newItemAmount.value.trim() || undefined);
    list.value.items.push(res.data.item);
    newItemName.value = '';
    newItemAmount.value = '';
  } catch {
    addError.value = 'Failed to add item.';
  }
}

async function toggleItem(itemId: string, checked: boolean) {
  if (!list.value) return;
  try {
    const res = await api.updateShoppingListItem(listId, itemId, { checked });
    const idx = list.value.items.findIndex((i) => i.id === itemId);
    if (idx !== -1) list.value.items[idx] = res.data.item;
  } catch {
    // silently ignore
  }
}

async function handleDeleteItem(itemId: string) {
  if (!list.value) return;
  try {
    await api.deleteShoppingListItem(listId, itemId);
    list.value.items = list.value.items.filter((i) => i.id !== itemId);
  } catch {
    // silently ignore
  }
}

async function handleClearChecked() {
  if (!list.value) return;
  try {
    await api.clearCheckedItems(listId);
    list.value.items = list.value.items.filter((i) => !i.checked);
  } catch {
    // silently ignore
  }
}

function startRename() {
  renameValue.value = list.value?.name ?? '';
  renaming.value = true;
  nextTick(() => renameInput.value?.select());
}

async function submitRename() {
  const name = renameValue.value.trim();
  if (!name || !list.value) return;
  try {
    const res = await api.renameShoppingList(listId, name);
    list.value.name = res.data.list.name;
  } finally {
    renaming.value = false;
  }
}
</script>
