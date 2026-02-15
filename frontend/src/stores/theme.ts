import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(true);

  function init(): void {
    const saved = localStorage.getItem('theme');
    isDark.value = saved ? saved === 'dark' : true;
    applyTheme();
  }

  function toggle(): void {
    isDark.value = !isDark.value;
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
    applyTheme();
  }

  function applyTheme(): void {
    if (isDark.value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  return { isDark, init, toggle };
});
