<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />
    <main class="flex-1 container mx-auto px-4 py-8">
      <RouterView />
    </main>
    <footer class="bg-gray-800 text-white py-4 mt-8 dark:bg-gray-950">
      <div class="container mx-auto px-4 text-center">
        <p>&copy; 2026 CWG Recipes. Open source recipe management.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Navbar from '@/components/Navbar.vue';

const router = useRouter();
const authStore = useAuthStore();

/**
 * Web Share Target Level 1 handler.
 * When installed as a PWA, the OS share sheet can open the app with
 * /?share&url=<video-or-recipe-url>&title=<title>
 * We redirect to the Create Recipe page with the URL as a query param so the
 * ImportRecipeModal can open pre-filled on the Video or URL tab.
 */
onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('share')) return;

  const sharedUrl = params.get('url') || params.get('text') || '';
  if (!sharedUrl) return;

  // Clear the share params from the address bar without navigating
  const clean = window.location.pathname;
  window.history.replaceState({}, '', clean);

  // Navigate to the create page with the shared URL
  if (authStore.isAuthenticated) {
    router.push({ name: 'recipe-create', query: { importUrl: sharedUrl } });
  } else {
    // Not logged in — send to login, then redirect back to create with the URL
    router.push({
      name: 'login',
      query: { redirect: `/recipes/new?importUrl=${encodeURIComponent(sharedUrl)}` },
    });
  }
});
</script>
