<template>
  <div class="card">
    <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Nutrition per Serving</h3>

    <div class="flex items-center gap-8">
      <!-- SVG Donut Chart -->
      <div class="relative flex-shrink-0">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <!-- Rotate so segments start from 12 o'clock -->
          <g transform="rotate(-90 70 70)">
            <!-- Background ring -->
            <circle
              cx="70" cy="70" r="52"
              fill="none"
              class="stroke-gray-200 dark:stroke-gray-700"
              stroke-width="22"
            />
            <!-- Protein segment (blue) -->
            <circle
              v-if="proteinLen > 0"
              cx="70" cy="70" r="52"
              fill="none"
              stroke="#3b82f6"
              stroke-width="22"
              :stroke-dasharray="`${proteinLen} ${C}`"
              :stroke-dashoffset="C"
            />
            <!-- Carbs segment (amber) -->
            <circle
              v-if="carbsLen > 0"
              cx="70" cy="70" r="52"
              fill="none"
              stroke="#f59e0b"
              stroke-width="22"
              :stroke-dasharray="`${carbsLen} ${C}`"
              :stroke-dashoffset="C - proteinLen"
            />
            <!-- Fat segment (red) -->
            <circle
              v-if="fatLen > 0"
              cx="70" cy="70" r="52"
              fill="none"
              stroke="#ef4444"
              stroke-width="22"
              :stroke-dasharray="`${fatLen} ${C}`"
              :stroke-dashoffset="C - proteinLen - carbsLen"
            />
          </g>
          <!-- Calories label in center -->
          <text
            x="70" y="63"
            text-anchor="middle"
            class="fill-gray-900 dark:fill-gray-100"
            font-size="22"
            font-weight="700"
            font-family="inherit"
          >{{ macros.calories }}</text>
          <text
            x="70" y="80"
            text-anchor="middle"
            class="fill-gray-500 dark:fill-gray-400"
            font-size="12"
            font-family="inherit"
          >kcal</text>
        </svg>
      </div>

      <!-- Legend -->
      <div class="flex-1 space-y-2.5 text-sm min-w-0">
        <div class="flex items-center gap-2.5">
          <span class="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
          <span class="text-gray-600 dark:text-gray-400 flex-1">Protein</span>
          <span class="font-semibold text-gray-900 dark:text-gray-100">{{ macros.protein }}g</span>
        </div>
        <div class="flex items-center gap-2.5">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
          <span class="text-gray-600 dark:text-gray-400 flex-1">Carbs</span>
          <span class="font-semibold text-gray-900 dark:text-gray-100">{{ macros.carbs }}g</span>
        </div>
        <div class="flex items-center gap-2.5">
          <span class="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
          <span class="text-gray-600 dark:text-gray-400 flex-1">Fat</span>
          <span class="font-semibold text-gray-900 dark:text-gray-100">{{ macros.fat }}g</span>
        </div>
        <div v-if="macros.fiber != null" class="flex items-center gap-2.5">
          <span class="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
          <span class="text-gray-600 dark:text-gray-400 flex-1">Fiber</span>
          <span class="font-semibold text-gray-900 dark:text-gray-100">{{ macros.fiber }}g</span>
        </div>
      </div>
    </div>

    <p class="text-xs text-gray-400 dark:text-gray-500 mt-4">AI estimate — values are approximate.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MacroData } from '@/types';

const props = defineProps<{ macros: MacroData }>();

// Circumference for r=52
const C = 2 * Math.PI * 52;

// Pie slices are proportional to caloric contribution:
// protein = 4 cal/g, carbs = 4 cal/g, fat = 9 cal/g
const proteinCals = computed(() => props.macros.protein * 4);
const carbsCals = computed(() => props.macros.carbs * 4);
const fatCals = computed(() => props.macros.fat * 9);
const totalMacroCals = computed(() => proteinCals.value + carbsCals.value + fatCals.value);

const proteinLen = computed(() =>
  totalMacroCals.value ? (proteinCals.value / totalMacroCals.value) * C : 0
);
const carbsLen = computed(() =>
  totalMacroCals.value ? (carbsCals.value / totalMacroCals.value) * C : 0
);
const fatLen = computed(() =>
  totalMacroCals.value ? (fatCals.value / totalMacroCals.value) * C : 0
);
</script>
