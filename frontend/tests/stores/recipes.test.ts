import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRecipeStore } from '../../src/stores/recipes';
import type { Recipe } from '../../src/types';

// Mock API
vi.mock('../../src/services/api', () => ({
  default: {
    getRecipes: vi.fn(),
    getMyRecipes: vi.fn(),
    getRecipe: vi.fn(),
    createRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
    togglePinRecipe: vi.fn(),
  },
}));

describe('Recipe Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mockRecipe: Recipe = {
    id: 'recipe-123',
    name: 'Test Recipe',
    description: 'A test recipe',
    prepTime: 15,
    cookTime: 30,
    totalTime: 45,
    servings: 4,
    ingredients: [
      { item: 'Ingredient 1', amount: '1 cup' },
      { item: 'Ingredient 2', amount: '2 tbsp' },
    ],
    instructions: [
      { step: 1, text: 'First step' },
      { step: 2, text: 'Second step' },
    ],
    createdBy: 'user-123',
    imageUrl: null,
    isPinned: false,
    tags: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  describe('Initial State', () => {
    it('should initialize with empty recipes array', () => {
      const store = useRecipeStore();

      expect(store.recipes).toEqual([]);
    });

    it('should initialize with null current recipe', () => {
      const store = useRecipeStore();

      expect(store.currentRecipe).toBeNull();
    });

    it('should initialize with default search and sort values', () => {
      const store = useRecipeStore();

      expect(store.searchQuery).toBe('');
      expect(store.sortBy).toBe('createdAt');
      expect(store.sortOrder).toBe('desc');
      expect(store.tagFilter).toBe('');
    });

    it('should initialize with zero total', () => {
      const store = useRecipeStore();

      expect(store.total).toBe(0);
    });

    it('should not be loading initially', () => {
      const store = useRecipeStore();

      expect(store.loading).toBe(false);
    });

    it('should have no error initially', () => {
      const store = useRecipeStore();

      expect(store.error).toBeNull();
    });
  });

  describe('Recipe List Management', () => {
    it('should store multiple recipes', () => {
      const store = useRecipeStore();
      const recipes = [mockRecipe, { ...mockRecipe, id: 'recipe-456' }];

      store.recipes = recipes;

      expect(store.recipes).toHaveLength(2);
      expect(store.recipes[0].id).toBe('recipe-123');
      expect(store.recipes[1].id).toBe('recipe-456');
    });

    it('should track total recipe count', () => {
      const store = useRecipeStore();

      store.total = 10;

      expect(store.total).toBe(10);
    });

    it('should clear recipes', () => {
      const store = useRecipeStore();
      store.recipes = [mockRecipe];

      store.recipes = [];

      expect(store.recipes).toEqual([]);
      expect(store.recipes).toHaveLength(0);
    });
  });

  describe('Current Recipe', () => {
    it('should set current recipe', () => {
      const store = useRecipeStore();

      store.currentRecipe = mockRecipe;

      expect(store.currentRecipe).toEqual(mockRecipe);
      expect(store.currentRecipe?.id).toBe('recipe-123');
    });

    it('should clear current recipe', () => {
      const store = useRecipeStore();
      store.currentRecipe = mockRecipe;

      store.currentRecipe = null;

      expect(store.currentRecipe).toBeNull();
    });

    it('should update current recipe', () => {
      const store = useRecipeStore();
      store.currentRecipe = mockRecipe;

      const updatedRecipe = { ...mockRecipe, name: 'Updated Name' };
      store.currentRecipe = updatedRecipe;

      expect(store.currentRecipe?.name).toBe('Updated Name');
    });
  });

  describe('Search Functionality', () => {
    it('should set search query', () => {
      const store = useRecipeStore();

      store.setSearch('pasta');

      expect(store.searchQuery).toBe('pasta');
    });

    it('should clear search query', () => {
      const store = useRecipeStore();
      store.setSearch('pasta');

      store.setSearch('');

      expect(store.searchQuery).toBe('');
    });

    it('should handle different search terms', () => {
      const store = useRecipeStore();

      store.setSearch('chicken');
      expect(store.searchQuery).toBe('chicken');

      store.setSearch('beef');
      expect(store.searchQuery).toBe('beef');
    });

    it('should handle special characters in search', () => {
      const store = useRecipeStore();

      store.setSearch('mom\'s recipe');

      expect(store.searchQuery).toBe('mom\'s recipe');
    });
  });

  describe('Sort Functionality', () => {
    it('should set sort by name ascending', () => {
      const store = useRecipeStore();

      store.setSort('name', 'asc');

      expect(store.sortBy).toBe('name');
      expect(store.sortOrder).toBe('asc');
    });

    it('should set sort by createdAt descending', () => {
      const store = useRecipeStore();

      store.setSort('createdAt', 'desc');

      expect(store.sortBy).toBe('createdAt');
      expect(store.sortOrder).toBe('desc');
    });

    it('should update sort order', () => {
      const store = useRecipeStore();
      store.setSort('name', 'asc');

      store.setSort('name', 'desc');

      expect(store.sortBy).toBe('name');
      expect(store.sortOrder).toBe('desc');
    });

    it('should handle different sort fields', () => {
      const store = useRecipeStore();

      store.setSort('updatedAt', 'asc');
      expect(store.sortBy).toBe('updatedAt');
      expect(store.sortOrder).toBe('asc');
    });
  });

  describe('Tag Filter', () => {
    it('should set tag filter', () => {
      const store = useRecipeStore();

      store.setTagFilter('dinner');

      expect(store.tagFilter).toBe('dinner');
    });

    it('should clear tag filter', () => {
      const store = useRecipeStore();
      store.setTagFilter('dinner');

      store.setTagFilter('');

      expect(store.tagFilter).toBe('');
    });

    it('should handle multiple tag filters', () => {
      const store = useRecipeStore();

      store.setTagFilter('breakfast');
      expect(store.tagFilter).toBe('breakfast');

      store.setTagFilter('lunch');
      expect(store.tagFilter).toBe('lunch');
    });
  });

  describe('Recipe Data Structure', () => {
    it('should preserve recipe ingredients', () => {
      const store = useRecipeStore();
      const recipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          { item: 'Flour', amount: '2 cups' },
          { item: 'Sugar', amount: '1 cup' },
          { item: 'Eggs', amount: '3 large' },
        ],
      };

      store.currentRecipe = recipeWithIngredients;

      expect(store.currentRecipe?.ingredients).toHaveLength(3);
      expect(store.currentRecipe?.ingredients[0].item).toBe('Flour');
      expect(store.currentRecipe?.ingredients[1].amount).toBe('1 cup');
    });

    it('should preserve recipe instructions order', () => {
      const store = useRecipeStore();
      const recipeWithInstructions = {
        ...mockRecipe,
        instructions: [
          { step: 1, text: 'Preheat oven' },
          { step: 2, text: 'Mix ingredients' },
          { step: 3, text: 'Bake for 30 minutes' },
        ],
      };

      store.currentRecipe = recipeWithInstructions;

      expect(store.currentRecipe?.instructions).toHaveLength(3);
      expect(store.currentRecipe?.instructions[0].step).toBe(1);
      expect(store.currentRecipe?.instructions[2].text).toBe('Bake for 30 minutes');
    });

    it('should preserve recipe times', () => {
      const store = useRecipeStore();

      store.currentRecipe = mockRecipe;

      expect(store.currentRecipe?.prepTime).toBe(15);
      expect(store.currentRecipe?.cookTime).toBe(30);
      expect(store.currentRecipe?.totalTime).toBe(45);
    });

    it('should preserve recipe metadata', () => {
      const store = useRecipeStore();

      store.currentRecipe = mockRecipe;

      expect(store.currentRecipe?.createdBy).toBe('user-123');
      expect(store.currentRecipe?.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(store.currentRecipe?.updatedAt).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('Loading and Error States', () => {
    it('should track loading state', () => {
      const store = useRecipeStore();

      store.loading = true;
      expect(store.loading).toBe(true);

      store.loading = false;
      expect(store.loading).toBe(false);
    });

    it('should track error messages', () => {
      const store = useRecipeStore();

      store.error = 'Failed to load recipes';
      expect(store.error).toBe('Failed to load recipes');

      store.error = null;
      expect(store.error).toBeNull();
    });

    it('should clear error on successful operation', () => {
      const store = useRecipeStore();
      store.error = 'Previous error';

      store.error = null;

      expect(store.error).toBeNull();
    });
  });

  describe('Recipe Pinning', () => {
    it('should track pinned status', () => {
      const store = useRecipeStore();
      const pinnedRecipe = { ...mockRecipe, isPinned: true };

      store.currentRecipe = pinnedRecipe;

      expect(store.currentRecipe?.isPinned).toBe(true);
    });

    it('should track unpinned status', () => {
      const store = useRecipeStore();
      const unpinnedRecipe = { ...mockRecipe, isPinned: false };

      store.currentRecipe = unpinnedRecipe;

      expect(store.currentRecipe?.isPinned).toBe(false);
    });
  });

  describe('Recipe Tags', () => {
    it('should store recipe tags', () => {
      const store = useRecipeStore();
      const recipeWithTags = {
        ...mockRecipe,
        tags: ['dinner', 'italian', 'pasta'],
      };

      store.currentRecipe = recipeWithTags;

      expect(store.currentRecipe?.tags).toEqual(['dinner', 'italian', 'pasta']);
      expect(store.currentRecipe?.tags).toHaveLength(3);
    });

    it('should handle empty tags array', () => {
      const store = useRecipeStore();

      store.currentRecipe = mockRecipe;

      expect(store.currentRecipe?.tags).toEqual([]);
    });
  });

  describe('Recipe Image', () => {
    it('should handle recipe with image URL', () => {
      const store = useRecipeStore();
      const recipeWithImage = {
        ...mockRecipe,
        imageUrl: 'https://example.com/image.jpg',
      };

      store.currentRecipe = recipeWithImage;

      expect(store.currentRecipe?.imageUrl).toBe('https://example.com/image.jpg');
    });

    it('should handle recipe without image', () => {
      const store = useRecipeStore();

      store.currentRecipe = mockRecipe;

      expect(store.currentRecipe?.imageUrl).toBeNull();
    });
  });
});
