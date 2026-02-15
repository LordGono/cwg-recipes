<template>
  <div class="max-w-md mx-auto">
    <div class="card">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
        {{ isLogin ? 'Login' : 'Register' }}
      </h1>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div v-if="!isLogin">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email *
          </label>
          <input
            v-model="email"
            type="email"
            required
            class="input"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Username *
          </label>
          <input
            v-model="username"
            type="text"
            required
            class="input"
            placeholder="username"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password *
          </label>
          <input
            v-model="password"
            type="password"
            required
            class="input"
            placeholder="••••••••"
          />
          <p v-if="!isLogin" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Minimum 8 characters, with uppercase, lowercase, and number
          </p>
        </div>

        <!-- Error message -->
        <div
          v-if="authStore.error"
          class="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded text-sm"
        >
          {{ authStore.error }}
        </div>

        <!-- Submit button -->
        <button
          type="submit"
          :disabled="authStore.loading"
          class="btn-primary w-full"
        >
          {{ authStore.loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register') }}
        </button>
      </form>

      <!-- Toggle login/register -->
      <div class="mt-6 text-center text-sm">
        <button
          @click="toggleMode"
          class="text-primary-600 hover:text-primary-700 font-medium"
        >
          {{ isLogin ? 'Need an account? Register' : 'Already have an account? Login' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isLogin = ref(true);
const username = ref('');
const email = ref('');
const password = ref('');

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  authStore.error = null;
};

const handleSubmit = async () => {
  try {
    if (isLogin.value) {
      await authStore.login({ username: username.value, password: password.value });
    } else {
      await authStore.register({
        username: username.value,
        email: email.value,
        password: password.value,
      });
    }

    // Redirect to original destination or home
    const redirect = route.query.redirect as string || '/';
    router.push(redirect);
  } catch (error) {
    // Error is handled by the store
  }
};
</script>
