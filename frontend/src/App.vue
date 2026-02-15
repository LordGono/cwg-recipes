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
import { RouterView } from 'vue-router';
import Navbar from '@/components/Navbar.vue';
</script>
