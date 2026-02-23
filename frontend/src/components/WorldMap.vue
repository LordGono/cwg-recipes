<template>
  <div class="relative w-full select-none">
    <svg
      :viewBox="world.viewBox"
      class="w-full h-auto"
      xmlns="http://www.w3.org/2000/svg"
      @mouseleave="tooltip = null"
    >
      <path
        v-for="loc in world.locations"
        :key="loc.id"
        :d="loc.path"
        :fill="fillColor(loc.id)"
        :stroke="strokeColor(loc.id)"
        stroke-width="0.5"
        class="transition-opacity duration-100 cursor-pointer hover:opacity-80"
        @mouseenter="(e) => showTooltip(e, loc)"
        @mousemove="(e) => moveTooltip(e)"
        @click="handleClick(loc.id)"
      />
    </svg>

    <!-- Tooltip -->
    <div
      v-if="tooltip"
      class="pointer-events-none fixed z-50 px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap shadow-lg"
      :style="{ left: tooltip.x + 12 + 'px', top: tooltip.y - 28 + 'px' }"
    >
      {{ tooltip.name }}
      <span v-if="tooltip.count > 0" class="ml-1 text-green-300">({{ tooltip.count }})</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import world from '@svg-maps/world';
import { COUNTRY_CODES, codeToCountryName } from '@/utils/countryFlag';
import type { CountryCount } from '@/types';

interface Props {
  countryCounts: CountryCount[];
  selectedCountry?: string;
}

const props = withDefaults(defineProps<Props>(), {
  selectedCountry: '',
});

const emit = defineEmits<{
  select: [countryName: string];
}>();

// Build a map from ISO code (uppercase) → recipe count
const countMap = computed(() => {
  const m = new Map<string, number>();
  for (const { country, count } of props.countryCounts) {
    const code = COUNTRY_CODES[country.toLowerCase().trim()];
    if (code) m.set(code.toUpperCase(), count);
  }
  return m;
});

const maxCount = computed(() => {
  let max = 0;
  for (const v of countMap.value.values()) {
    if (v > max) max = v;
  }
  return max;
});

// ISO code → uppercase for lookup; location.id from @svg-maps/world is lowercase
const fillColor = (locationId: string): string => {
  const code = locationId.toUpperCase();

  // Selected country gets primary blue
  const countryName = codeToCountryName(code);
  if (
    props.selectedCountry &&
    countryName.toLowerCase() === props.selectedCountry.toLowerCase()
  ) {
    return '#2563eb';
  }

  const count = countMap.value.get(code);
  if (!count) return '#d1d5db'; // gray-300 (no recipes)

  // Scale green: light (#86efac = green-300) → dark (#15803d = green-700)
  const ratio = maxCount.value > 0 ? count / maxCount.value : 0;
  const r = Math.round(134 + (21 - 134) * ratio);   // 134→21
  const g = Math.round(239 + (128 - 239) * ratio);  // 239→128
  const b = Math.round(172 + (61 - 172) * ratio);   // 172→61
  return `rgb(${r},${g},${b})`;
};

const strokeColor = (locationId: string): string => {
  const code = locationId.toUpperCase();
  const countryName = codeToCountryName(code);
  if (
    props.selectedCountry &&
    countryName.toLowerCase() === props.selectedCountry.toLowerCase()
  ) {
    return '#1d4ed8'; // blue-700
  }
  return '#9ca3af'; // gray-400
};

// Tooltip state
interface TooltipState {
  x: number;
  y: number;
  name: string;
  count: number;
}

const tooltip = ref<TooltipState | null>(null);

const showTooltip = (e: MouseEvent, loc: { id: string; name: string }) => {
  const code = loc.id.toUpperCase();
  const count = countMap.value.get(code) ?? 0;
  tooltip.value = { x: e.clientX, y: e.clientY, name: loc.name, count };
};

const moveTooltip = (e: MouseEvent) => {
  if (tooltip.value) {
    tooltip.value.x = e.clientX;
    tooltip.value.y = e.clientY;
  }
};

const handleClick = (locationId: string) => {
  const name = codeToCountryName(locationId.toUpperCase());
  if (name) emit('select', name);
};
</script>
