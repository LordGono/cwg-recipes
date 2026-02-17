<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closeModal">
    <div class="flex items-center justify-center min-h-screen px-4">
      <!-- Overlay -->
      <div class="fixed inset-0 bg-black opacity-50"></div>

      <!-- Modal -->
      <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Import Recipe</h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Tab Selector -->
        <div v-if="!loading && !error && !importedRecipe" class="flex mb-4 border-b border-gray-200 dark:border-gray-700">
          <button
            @click="activeTab = 'url'"
            :class="activeTab === 'url'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
            class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
          >
            From URL
          </button>
          <button
            @click="activeTab = 'pdf'"
            :class="activeTab === 'pdf'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
            class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
          >
            From PDF
          </button>
        </div>

        <!-- URL Tab Content -->
        <div v-if="!loading && !error && !importedRecipe && activeTab === 'url'">
          <p class="text-gray-600 dark:text-gray-300 mb-4">
            Paste a URL to a recipe website and we'll extract the recipe for you.
          </p>

          <!-- URL Input -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recipe URL
            </label>
            <input
              v-model="url"
              type="url"
              placeholder="https://example.com/recipe"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              @keyup.enter="importFromURL"
            />
          </div>

          <!-- Usage Stats -->
          <div v-if="usageStats" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p class="text-sm text-blue-800 dark:text-blue-200">
              <strong>AI Imports Today:</strong> {{ usageStats.rpd.used }}/{{ usageStats.rpd.limit }}
              <span class="text-xs">({{ usageStats.rpd.remaining }} remaining)</span>
            </p>
            <p class="text-xs text-blue-600 dark:text-blue-300 mt-1">
              Most recipes import for free using structured data. AI is used as fallback.
            </p>
          </div>

          <!-- Import Button -->
          <button
            @click="importFromURL"
            :disabled="!url"
            class="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Import Recipe
          </button>
        </div>

        <!-- PDF Tab Content -->
        <div v-if="!loading && !error && !importedRecipe && activeTab === 'pdf'">
          <p class="text-gray-600 dark:text-gray-300 mb-3">
            On the recipe page, open your browser menu and choose
            <strong>Print → Save as PDF</strong>, then upload that PDF here.
          </p>

          <!-- Drop Zone -->
          <div
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="onDrop"
            @click="fileInput?.click()"
            :class="dragging
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'"
            class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-4"
          >
            <input
              ref="fileInput"
              type="file"
              accept="application/pdf"
              class="hidden"
              @change="onFileChange"
            />
            <svg class="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p v-if="!pdfFile" class="text-sm text-gray-500 dark:text-gray-400">
              Drop PDF here or <span class="text-primary-600 dark:text-primary-400 font-medium">click to browse</span>
            </p>
            <p v-else class="text-sm text-gray-800 dark:text-gray-200 font-medium">
              {{ pdfFile.name }}
              <span class="text-gray-500 dark:text-gray-400 font-normal">({{ (pdfFile.size / 1024).toFixed(0) }} KB)</span>
            </p>
          </div>

          <!-- Usage Stats -->
          <div v-if="usageStats" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p class="text-sm text-blue-800 dark:text-blue-200">
              <strong>AI Imports Today:</strong> {{ usageStats.rpd.used }}/{{ usageStats.rpd.limit }}
              <span class="text-xs">({{ usageStats.rpd.remaining }} remaining)</span>
            </p>
          </div>

          <button
            @click="importFromPDF"
            :disabled="!pdfFile"
            class="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Extract Recipe from PDF
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-300">{{ loadingMessage }}</p>
        </div>

        <!-- Error State -->
        <div v-if="error" class="text-center py-4">
          <div
            :class="isQuotaError ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'"
            class="border rounded-lg p-4 mb-4"
          >
            <p :class="isQuotaError ? 'text-yellow-800 dark:text-yellow-200' : 'text-red-800 dark:text-red-200'" class="font-semibold">
              {{ isQuotaError ? '⏳ AI Quota Temporarily Exhausted' : '❌ Import Failed' }}
            </p>
            <p :class="isQuotaError ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300'" class="text-sm mt-1">
              {{ error }}
            </p>
          </div>
          <button
            @click="resetModal"
            class="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Try Again
          </button>
        </div>

        <!-- Success State -->
        <div v-if="importedRecipe" class="text-center py-4">
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <svg class="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <p class="text-green-800 dark:text-green-200 font-semibold mb-1">
              Recipe Imported Successfully!
            </p>
            <p class="text-sm text-green-600 dark:text-green-300">
              {{ successMessage }}
            </p>
          </div>
          <button
            @click="closeAndFillForm"
            class="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Review & Save Recipe
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import type { RecipeInput } from '@/types';

// Props
interface Props {
  isOpen: boolean;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: 'close'): void;
  (e: 'imported', recipe: RecipeInput): void;
}

const emit = defineEmits<Emits>();

// State
const activeTab = ref<'url' | 'pdf'>('url');
const url = ref('');
const pdfFile = ref<File | null>(null);
const dragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const loading = ref(false);
const loadingMessage = ref('Fetching recipe...');
const error = ref('');
const isQuotaError = ref(false);
const importedRecipe = ref<RecipeInput | null>(null);
const successMessage = ref('');
const usageStats = ref<any>(null);

// Methods
const closeModal = () => {
  emit('close');
  resetModal();
};

const resetModal = () => {
  url.value = '';
  pdfFile.value = null;
  dragging.value = false;
  loading.value = false;
  error.value = '';
  isQuotaError.value = false;
  importedRecipe.value = null;
  successMessage.value = '';
};

const closeAndFillForm = () => {
  if (importedRecipe.value) {
    emit('imported', importedRecipe.value);
  }
  closeModal();
};

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files?.[0]) {
    pdfFile.value = input.files[0];
  }
};

const onDrop = (e: DragEvent) => {
  dragging.value = false;
  const file = e.dataTransfer?.files[0];
  if (file?.type === 'application/pdf') {
    pdfFile.value = file;
  }
};

const importFromURL = async () => {
  if (!url.value) return;

  loading.value = true;
  error.value = '';
  isQuotaError.value = false;
  loadingMessage.value = 'Fetching recipe...';

  try {
    const response = await api.importFromURL(url.value);

    importedRecipe.value = response.data.recipe;

    if (response.method === 'structured') {
      successMessage.value = 'Imported via structured data (free & instant!)';
    } else {
      successMessage.value = `Imported via AI (${response.usage?.rpd.remaining || 0} AI imports remaining today)`;
    }

    await fetchUsageStats();
  } catch (err: any) {
    const status = err.response?.status;
    const errorMessage = err.response?.data?.message || err.message || 'Failed to import recipe';
    isQuotaError.value = status === 429;
    error.value = errorMessage;
  } finally {
    loading.value = false;
  }
};

const importFromPDF = async () => {
  if (!pdfFile.value) return;

  loading.value = true;
  error.value = '';
  isQuotaError.value = false;
  loadingMessage.value = 'Reading PDF and extracting recipe...';

  try {
    const response = await api.importFromPDF(pdfFile.value);

    importedRecipe.value = response.data.recipe;
    successMessage.value = 'Extracted from PDF via AI';

    await fetchUsageStats();
  } catch (err: any) {
    const status = err.response?.status;
    const errorMessage = err.response?.data?.message || err.message || 'Failed to extract recipe from PDF';
    isQuotaError.value = status === 429;
    error.value = errorMessage;
  } finally {
    loading.value = false;
  }
};

const fetchUsageStats = async () => {
  try {
    const response = await api.getImportUsageStats();
    usageStats.value = response.data;
  } catch {
    // Silently fail - not critical
  }
};

// Load usage stats when modal opens
onMounted(() => {
  if (props.isOpen) {
    fetchUsageStats();
  }
});
</script>
