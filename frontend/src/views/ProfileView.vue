<template>
  <div class="max-w-lg mx-auto space-y-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>

    <!-- User info summary -->
    <div class="card flex items-center gap-4">
      <div class="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-2xl font-bold text-green-700 dark:text-green-300 select-none">
        {{ authStore.user?.username?.charAt(0).toUpperCase() }}
      </div>
      <div>
        <p class="font-semibold text-gray-900 dark:text-gray-100 text-lg">{{ authStore.user?.username }}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ authStore.user?.email }}</p>
        <span v-if="authStore.isAdmin" class="inline-block mt-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">Admin</span>
      </div>
    </div>

    <!-- Change Email -->
    <div class="card">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Email</h2>
      <form @submit.prevent="handleUpdateProfile" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Email</label>
          <input
            v-model="profileForm.email"
            type="email"
            required
            class="input w-full"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
          <input
            v-model="profileForm.currentPassword"
            type="password"
            required
            class="input w-full"
            placeholder="Confirm with your current password"
          />
        </div>

        <div v-if="profileError" class="text-sm text-red-600 dark:text-red-400">{{ profileError }}</div>
        <div v-if="profileSuccess" class="text-sm text-green-600 dark:text-green-400">{{ profileSuccess }}</div>

        <button type="submit" :disabled="profileLoading" class="btn-primary w-full">
          {{ profileLoading ? 'Saving...' : 'Update Email' }}
        </button>
      </form>
    </div>

    <!-- Change Password -->
    <div class="card">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Password</h2>
      <form @submit.prevent="handleChangePassword" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
          <input
            v-model="passwordForm.currentPassword"
            type="password"
            required
            class="input w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
          <input
            v-model="passwordForm.newPassword"
            type="password"
            required
            minlength="8"
            class="input w-full"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Min 8 characters, must include uppercase, lowercase, and a number.</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
          <input
            v-model="passwordForm.confirmPassword"
            type="password"
            required
            class="input w-full"
          />
        </div>

        <div v-if="passwordError" class="text-sm text-red-600 dark:text-red-400">{{ passwordError }}</div>
        <div v-if="passwordSuccess" class="text-sm text-green-600 dark:text-green-400">{{ passwordSuccess }}</div>

        <button type="submit" :disabled="passwordLoading" class="btn-primary w-full">
          {{ passwordLoading ? 'Saving...' : 'Change Password' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';

const authStore = useAuthStore();

const profileForm = ref({ email: authStore.user?.email ?? '', currentPassword: '' });
const profileLoading = ref(false);
const profileError = ref('');
const profileSuccess = ref('');

const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' });
const passwordLoading = ref(false);
const passwordError = ref('');
const passwordSuccess = ref('');

const handleUpdateProfile = async () => {
  profileError.value = '';
  profileSuccess.value = '';
  profileLoading.value = true;
  try {
    const res = await api.updateProfile(profileForm.value.email, profileForm.value.currentPassword);
    // Update store with new token + user
    authStore.setAuth(res.data.token, res.data.user);
    profileForm.value.currentPassword = '';
    profileSuccess.value = 'Email updated successfully.';
  } catch (err: any) {
    profileError.value = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to update email.';
  } finally {
    profileLoading.value = false;
  }
};

const handleChangePassword = async () => {
  passwordError.value = '';
  passwordSuccess.value = '';

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = 'New passwords do not match.';
    return;
  }

  passwordLoading.value = true;
  try {
    await api.changePassword(passwordForm.value.currentPassword, passwordForm.value.newPassword);
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
    passwordSuccess.value = 'Password changed successfully.';
  } catch (err: any) {
    passwordError.value = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to change password.';
  } finally {
    passwordLoading.value = false;
  }
};
</script>
