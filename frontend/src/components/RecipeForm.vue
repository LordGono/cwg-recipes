<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Image upload -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Recipe Image
      </label>
      <div class="flex items-center space-x-4">
        <img
          v-if="imagePreview"
          :src="imagePreview"
          alt="Preview"
          class="w-24 h-24 object-cover rounded-lg"
        />
        <div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            @change="handleImageChange"
            class="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
              file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700
              dark:file:bg-primary-900/30 dark:file:text-primary-400
              hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">JPEG, PNG, GIF, or WebP. Max 5MB.</p>
        </div>
      </div>
    </div>

    <!-- Basic info -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Description
      </label>
      <textarea
        v-model="formData.description"
        rows="3"
        class="input"
        placeholder="Brief description of the recipe..."
      />
    </div>

    <!-- Video URL -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        YouTube Video URL
      </label>
      <input
        v-model="formData.videoUrl"
        type="url"
        class="input"
        placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
      />
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Optional — paste a YouTube link to embed the video on the recipe page.</p>
    </div>

    <!-- Tags -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Tags
      </label>
      <div v-if="formData.tags && formData.tags.length > 0" class="flex flex-wrap gap-2 mb-2">
        <span
          v-for="(tag, index) in formData.tags"
          :key="index"
          class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400"
        >
          {{ tag }}
          <button
            type="button"
            @click="removeTag(index)"
            class="ml-1.5 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
          >
            x
          </button>
        </span>
      </div>
      <div class="flex space-x-2">
        <input
          v-model="newTag"
          type="text"
          placeholder="Add a tag..."
          class="input flex-1"
          @keydown.enter.prevent="addTag"
        />
        <button type="button" @click="addTag" class="btn-secondary">
          Add
        </button>
      </div>
    </div>

    <!-- Time and servings -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Instructions *
      </label>
      <div class="space-y-2">
        <div
          v-for="(instruction, index) in formData.instructions"
          :key="index"
          class="flex space-x-2"
        >
          <span class="text-gray-500 dark:text-gray-400 font-medium mt-2">{{ index + 1 }}.</span>
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
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded">
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
import { ref, watch } from 'vue';
import type { Recipe, RecipeInput } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Props {
  initialData?: Recipe | RecipeInput | null;
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
  submit: [data: RecipeInput, image?: File];
  cancel: [];
}>();

const selectedImage = ref<File | undefined>(undefined);
const imagePreview = ref<string | null>(null);
const newTag = ref('');

const formData = ref<RecipeInput>({
  name: '',
  description: '',
  prepTime: undefined,
  cookTime: undefined,
  totalTime: undefined,
  servings: undefined,
  ingredients: [{ item: '', amount: '' }],
  instructions: [{ step: 1, text: '' }],
  tags: [],
  videoUrl: '',
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
    tags: props.initialData.tags?.map((rt: any) => (typeof rt === 'string' ? rt : rt.tag.name)) || [],
    videoUrl: ('videoUrl' in props.initialData ? props.initialData.videoUrl : undefined) || '',
  };

  // Show existing image
  if ('imageUrl' in props.initialData && props.initialData.imageUrl) {
    const baseUrl = API_URL.replace(/\/api$/, '');
    imagePreview.value = props.initialData.imageUrl.startsWith('http')
      ? props.initialData.imageUrl
      : `${baseUrl}/${props.initialData.imageUrl}`;
  }
}

const handleImageChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    selectedImage.value = file;
    imagePreview.value = URL.createObjectURL(file);
  }
};

const addTag = () => {
  const tag = newTag.value.trim().toLowerCase();
  if (tag && !formData.value.tags?.includes(tag)) {
    if (!formData.value.tags) formData.value.tags = [];
    formData.value.tags.push(tag);
  }
  newTag.value = '';
};

const removeTag = (index: number) => {
  formData.value.tags?.splice(index, 1);
};

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

// Watch for changes in initialData (e.g., when importing a recipe)
watch(
  () => props.initialData,
  (newData) => {
    if (newData) {
      formData.value = {
        name: newData.name,
        description: newData.description || '',
        prepTime: newData.prepTime,
        cookTime: newData.cookTime,
        totalTime: newData.totalTime,
        servings: newData.servings,
        ingredients: [...newData.ingredients],
        instructions: [...newData.instructions],
        tags: newData.tags?.map((rt: any) => (typeof rt === 'string' ? rt : rt.tag.name)) || [],
        videoUrl: ('videoUrl' in newData ? newData.videoUrl : undefined) || '',
      };

      // Show existing image if available
      if ('imageUrl' in newData && newData.imageUrl) {
        const baseUrl = API_URL.replace(/\/api$/, '');
        imagePreview.value = newData.imageUrl.startsWith('http')
          ? newData.imageUrl
          : `${baseUrl}/${newData.imageUrl}`;
      }
    }
  },
  { deep: true }
);

const handleSubmit = () => {
  // Update step numbers before submitting
  formData.value.instructions.forEach((instruction, i) => {
    instruction.step = i + 1;
  });

  emit('submit', formData.value, selectedImage.value);
};
</script>
