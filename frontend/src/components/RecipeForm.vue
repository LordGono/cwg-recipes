<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Basic info -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Recipe Name *
      </label>
      <input
        v-model="formData.name"
        type="text"
        required
        class="input"
        placeholder="e.g., Chocolate Chip Cookies"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Description
      </label>
      <textarea
        v-model="formData.description"
        rows="3"
        class="input"
        placeholder="Brief description of the recipe..."
      />
    </div>

    <!-- Time and servings -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Prep Time (min)
        </label>
        <input
          v-model.number="formData.prepTime"
          type="number"
          min="0"
          class="input"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Cook Time (min)
        </label>
        <input
          v-model.number="formData.cookTime"
          type="number"
          min="0"
          class="input"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Total Time (min)
        </label>
        <input
          v-model.number="formData.totalTime"
          type="number"
          min="0"
          class="input"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Servings
        </label>
        <input
          v-model.number="formData.servings"
          type="number"
          min="1"
          class="input"
        />
      </div>
    </div>

    <!-- Ingredients -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Ingredients *
      </label>
      <div class="space-y-2">
        <div
          v-for="(ingredient, index) in formData.ingredients"
          :key="index"
          class="flex space-x-2"
        >
          <input
            v-model="ingredient.amount"
            type="text"
            placeholder="Amount (e.g., 2 cups)"
            required
            class="input flex-1"
          />
          <input
            v-model="ingredient.item"
            type="text"
            placeholder="Ingredient (e.g., flour)"
            required
            class="input flex-1"
          />
          <button
            type="button"
            @click="removeIngredient(index)"
            class="btn-danger"
          >
            Remove
          </button>
        </div>
      </div>
      <button
        type="button"
        @click="addIngredient"
        class="btn-secondary mt-2"
      >
        + Add Ingredient
      </button>
    </div>

    <!-- Instructions -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Instructions *
      </label>
      <div class="space-y-2">
        <div
          v-for="(instruction, index) in formData.instructions"
          :key="index"
          class="flex space-x-2"
        >
          <span class="text-gray-500 font-medium mt-2">{{ index + 1 }}.</span>
          <textarea
            v-model="instruction.text"
            rows="2"
            placeholder="Instruction step..."
            required
            class="input flex-1"
          />
          <button
            type="button"
            @click="removeInstruction(index)"
            class="btn-danger"
          >
            Remove
          </button>
        </div>
      </div>
      <button
        type="button"
        @click="addInstruction"
        class="btn-secondary mt-2"
      >
        + Add Step
      </button>
    </div>

    <!-- Error message -->
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
      {{ error }}
    </div>

    <!-- Submit buttons -->
    <div class="flex space-x-4">
      <button
        type="submit"
        :disabled="loading"
        class="btn-primary flex-1"
      >
        {{ loading ? 'Saving...' : submitLabel }}
      </button>
      <button
        type="button"
        @click="$emit('cancel')"
        class="btn-secondary flex-1"
      >
        Cancel
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Recipe, RecipeInput } from '@/types';

interface Props {
  initialData?: Recipe | null;
  loading?: boolean;
  error?: string | null;
  submitLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  submitLabel: 'Save Recipe',
});

const emit = defineEmits<{
  submit: [data: RecipeInput];
  cancel: [];
}>();

const formData = ref<RecipeInput>({
  name: '',
  description: '',
  prepTime: undefined,
  cookTime: undefined,
  totalTime: undefined,
  servings: undefined,
  ingredients: [{ item: '', amount: '' }],
  instructions: [{ step: 1, text: '' }],
});

// Initialize form with existing data if editing
if (props.initialData) {
  formData.value = {
    name: props.initialData.name,
    description: props.initialData.description || '',
    prepTime: props.initialData.prepTime,
    cookTime: props.initialData.cookTime,
    totalTime: props.initialData.totalTime,
    servings: props.initialData.servings,
    ingredients: [...props.initialData.ingredients],
    instructions: [...props.initialData.instructions],
  };
}

const addIngredient = () => {
  formData.value.ingredients.push({ item: '', amount: '' });
};

const removeIngredient = (index: number) => {
  if (formData.value.ingredients.length > 1) {
    formData.value.ingredients.splice(index, 1);
  }
};

const addInstruction = () => {
  const nextStep = formData.value.instructions.length + 1;
  formData.value.instructions.push({ step: nextStep, text: '' });
};

const removeInstruction = (index: number) => {
  if (formData.value.instructions.length > 1) {
    formData.value.instructions.splice(index, 1);
    // Renumber steps
    formData.value.instructions.forEach((instruction, i) => {
      instruction.step = i + 1;
    });
  }
};

const handleSubmit = () => {
  // Update step numbers before submitting
  formData.value.instructions.forEach((instruction, i) => {
    instruction.step = i + 1;
  });

  emit('submit', formData.value);
};
</script>
