<template>
  <div class="max-w-4xl mx-auto space-y-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Panel</h1>

    <!-- Stats cards -->
    <div v-if="stats" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card text-center">
        <p class="text-3xl font-bold text-green-600 dark:text-green-400">{{ stats.users }}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Users</p>
      </div>
      <div class="card text-center">
        <p class="text-3xl font-bold text-green-600 dark:text-green-400">{{ stats.recipes }}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Recipes</p>
      </div>
      <div class="card text-center">
        <p class="text-3xl font-bold text-blue-600 dark:text-blue-400">{{ stats.gemini.rpd.used }}/{{ stats.gemini.rpd.limit }}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Gemini RPD</p>
      </div>
      <div class="card text-center">
        <p class="text-3xl font-bold text-blue-600 dark:text-blue-400">{{ stats.gemini.rpm.used }}/{{ stats.gemini.rpm.limit }}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Gemini RPM</p>
      </div>
    </div>

    <!-- Error banner -->
    <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
      {{ error }}
    </div>

    <!-- User table -->
    <div class="card">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Users</h2>

      <div v-if="loading" class="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
              <th class="pb-2 pr-4 font-medium">Username</th>
              <th class="pb-2 pr-4 font-medium">Email</th>
              <th class="pb-2 pr-4 font-medium">Recipes</th>
              <th class="pb-2 pr-4 font-medium" title="AI imports used today / daily cap (∞ = unlimited)">AI Today</th>
              <th class="pb-2 pr-4 font-medium">Joined</th>
              <th class="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in users"
              :key="u.id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td class="py-3 pr-4">
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ u.username }}</span>
                <span v-if="u.isAdmin" class="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">Admin</span>
                <span v-if="u.id === authStore.user?.id" class="ml-2 text-xs text-gray-400 dark:text-gray-500">(you)</span>
              </td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-400">{{ u.email }}</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-400">{{ u._count.recipes }}</td>
              <!-- Daily AI limit column -->
              <td class="py-3 pr-4">
                <div v-if="editingLimitId !== u.id" class="flex items-center gap-1.5">
                  <span
                    class="text-sm tabular-nums"
                    :class="u.dailyGeminiLimit != null && (u.dailyUsage ?? 0) >= u.dailyGeminiLimit
                      ? 'text-red-600 dark:text-red-400 font-semibold'
                      : 'text-gray-600 dark:text-gray-400'"
                  >
                    {{ u.dailyUsage ?? 0 }}/{{ u.dailyGeminiLimit ?? '∞' }}
                  </span>
                  <button
                    @click="startEditLimit(u)"
                    class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div v-else class="flex items-center gap-1">
                  <input
                    v-model.number="editingLimitValue"
                    type="number"
                    min="1"
                    placeholder="∞"
                    class="w-16 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    @keydown.enter="saveLimit(u)"
                    @keydown.escape="cancelEditLimit"
                  />
                  <button @click="saveLimit(u)" class="text-xs text-green-600 dark:text-green-400 hover:underline" title="Save limit">Set</button>
                  <button @click="clearLimit(u)" class="text-xs text-gray-500 dark:text-gray-400 hover:underline" title="Remove limit (unlimited)">∞</button>
                  <button @click="cancelEditLimit" class="text-xs text-gray-400 dark:text-gray-500" title="Cancel">✕</button>
                </div>
              </td>
              <td class="py-3 pr-4 text-gray-500 dark:text-gray-500">{{ formatDate(u.createdAt) }}</td>
              <td class="py-3">
                <div v-if="u.id !== authStore.user?.id" class="flex items-center gap-2">
                  <button
                    @click="handleToggleAdmin(u)"
                    class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    {{ u.isAdmin ? 'Remove Admin' : 'Make Admin' }}
                  </button>
                  <button
                    @click="confirmDelete(u)"
                    class="text-xs px-2 py-1 rounded border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div
      v-if="userToDelete"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="userToDelete = null"
    >
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete User</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Delete <strong>{{ userToDelete.username }}</strong> and all their {{ userToDelete._count.recipes }} recipe(s)? This cannot be undone.
        </p>
        <div class="flex gap-3 justify-end">
          <button @click="userToDelete = null" class="btn-secondary">Cancel</button>
          <button @click="handleDeleteUser" :disabled="deleting" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';
import type { AdminUser, AdminStats } from '@/types';

const authStore = useAuthStore();

const users = ref<AdminUser[]>([]);
const stats = ref<AdminStats | null>(null);
const loading = ref(true);
const error = ref('');
const userToDelete = ref<AdminUser | null>(null);
const deleting = ref(false);

// Per-user AI limit editing
const editingLimitId = ref<string | null>(null);
const editingLimitValue = ref<number | ''>('');

onMounted(async () => {
  await Promise.all([loadUsers(), loadStats()]);
});

const loadUsers = async () => {
  loading.value = true;
  try {
    const res = await api.getAdminUsers();
    users.value = res.data.users;
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load users.';
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    const res = await api.getAdminStats();
    stats.value = res.data;
  } catch {
    // Stats are non-critical
  }
};

const handleToggleAdmin = async (u: AdminUser) => {
  try {
    const res = await api.toggleAdminUser(u.id);
    const idx = users.value.findIndex(x => x.id === u.id);
    if (idx !== -1) users.value[idx].isAdmin = res.data.user.isAdmin;
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to update user.';
  }
};

const confirmDelete = (u: AdminUser) => {
  userToDelete.value = u;
};

const handleDeleteUser = async () => {
  if (!userToDelete.value) return;
  deleting.value = true;
  try {
    await api.deleteAdminUser(userToDelete.value.id);
    users.value = users.value.filter(u => u.id !== userToDelete.value!.id);
    if (stats.value) {
      stats.value.users--;
      stats.value.recipes -= userToDelete.value._count.recipes;
    }
    userToDelete.value = null;
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to delete user.';
  } finally {
    deleting.value = false;
  }
};

const startEditLimit = (u: AdminUser) => {
  editingLimitId.value = u.id;
  editingLimitValue.value = u.dailyGeminiLimit ?? '';
};

const cancelEditLimit = () => {
  editingLimitId.value = null;
  editingLimitValue.value = '';
};

const saveLimit = async (u: AdminUser) => {
  const limit = editingLimitValue.value === '' ? null : Number(editingLimitValue.value);
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) {
    error.value = 'Limit must be a positive whole number.';
    return;
  }
  try {
    await api.setUserGeminiLimit(u.id, limit);
    const idx = users.value.findIndex(x => x.id === u.id);
    if (idx !== -1) users.value[idx].dailyGeminiLimit = limit;
    cancelEditLimit();
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to update limit.';
  }
};

const clearLimit = async (u: AdminUser) => {
  try {
    await api.setUserGeminiLimit(u.id, null);
    const idx = users.value.findIndex(x => x.id === u.id);
    if (idx !== -1) users.value[idx].dailyGeminiLimit = null;
    cancelEditLimit();
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to clear limit.';
  }
};

const formatDate = (iso: string | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
</script>
