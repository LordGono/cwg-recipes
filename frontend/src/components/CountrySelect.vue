<template>
  <div>
    <!-- Selected country pills -->
    <div v-if="modelValue.length > 0" class="flex flex-wrap gap-2 mb-2">
      <span
        v-for="c in modelValue"
        :key="c"
        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium
               bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400"
      >
        <span v-if="getCountryCode(c)" class="fi" :class="`fi-${getCountryCode(c)}`"></span>
        {{ c }}
        <button
          type="button"
          @click="remove(c)"
          class="ml-0.5 text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-200"
          :aria-label="`Remove ${c}`"
        >✕</button>
      </span>
    </div>

    <!-- Search input + dropdown -->
    <div class="relative" ref="containerRef">
      <input
        v-model="search"
        type="text"
        class="input"
        placeholder="Add country..."
        @focus="open = true"
        @blur="onBlur"
        @keydown.escape="open = false"
        :disabled="modelValue.length >= MAX"
      />
      <ul
        v-if="open && filtered.length > 0"
        class="absolute z-20 w-full mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-300 dark:border-gray-600
               bg-white dark:bg-gray-800 shadow-lg"
      >
        <li
          v-for="name in filtered"
          :key="name"
          @mousedown.prevent="add(name)"
          class="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm
                 text-gray-900 dark:text-gray-100
                 hover:bg-primary-50 dark:hover:bg-primary-900/20"
        >
          <span v-if="getCountryCode(name)" class="fi" :class="`fi-${getCountryCode(name)}`"></span>
          {{ name }}
          <span v-if="modelValue.map(v => v.toLowerCase()).includes(name.toLowerCase())"
                class="ml-auto text-primary-500 text-xs">✓</span>
        </li>
      </ul>
    </div>
    <p v-if="modelValue.length >= MAX" class="mt-1 text-xs text-amber-600 dark:text-amber-400">
      Maximum {{ MAX }} countries reached.
    </p>
    <p v-else class="mt-1 text-xs text-gray-500 dark:text-gray-400">
      Optional — each country is also added as a tag for filtering.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { COUNTRY_NAMES, getCountryCode } from '@/utils/countryFlag';

const MAX = 5;

const props = withDefaults(defineProps<{ modelValue?: string[] }>(), { modelValue: () => [] });
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();

const search = ref('');
const open = ref(false);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return COUNTRY_NAMES.filter((name) =>
    !q || name.toLowerCase().includes(q)
  );
});

function add(name: string) {
  if (props.modelValue.length >= MAX) return;
  if (!props.modelValue.map(v => v.toLowerCase()).includes(name.toLowerCase())) {
    emit('update:modelValue', [...props.modelValue, name]);
  }
  search.value = '';
  open.value = false;
}

function remove(name: string) {
  emit('update:modelValue', props.modelValue.filter((c) => c !== name));
}

function onBlur() {
  // Delay so mousedown.prevent on list items fires first
  setTimeout(() => { open.value = false; }, 150);
}
</script>
