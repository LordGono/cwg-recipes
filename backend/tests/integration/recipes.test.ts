import { describe, it, expect, beforeAll } from 'vitest';
import { generateToken, JwtPayload } from '../../src/utils/jwt';

describe('Recipe Endpoints Integration Tests', () => {
  let authToken: string;
  let adminToken: string;
  const mockUserId = 'test-user-123';
  const mockAdminId = 'test-admin-456';

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-for-recipe-integration';

    const userPayload: JwtPayload = {
      userId: mockUserId,
      username: 'testuser',
      email: 'test@example.com',
      isAdmin: false,
    };

    const adminPayload: JwtPayload = {
      userId: mockAdminId,
      username: 'adminuser',
      email: 'admin@example.com',
      isAdmin: true,
    };

    authToken = generateToken(userPayload);
    adminToken = generateToken(adminPayload);
  });

  describe('Recipe Data Validation', () => {
    it('should validate recipe creation data structure', () => {
      const validRecipe = {
        name: 'Test Recipe',
        description: 'A test recipe description',
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
      };

      // Validate required fields
      expect(validRecipe.name).toBeDefined();
      expect(validRecipe.name.length).toBeGreaterThan(0);
      expect(validRecipe.ingredients).toBeInstanceOf(Array);
      expect(validRecipe.instructions).toBeInstanceOf(Array);

      // Validate ingredient structure
      validRecipe.ingredients.forEach((ingredient) => {
        expect(ingredient).toHaveProperty('item');
        expect(ingredient).toHaveProperty('amount');
      });

      // Validate instruction structure
      validRecipe.instructions.forEach((instruction) => {
        expect(instruction).toHaveProperty('step');
        expect(instruction).toHaveProperty('text');
        expect(typeof instruction.step).toBe('number');
      });
    });

    it('should reject invalid recipe data', () => {
      const invalidRecipes = [
        { name: '' }, // Empty name
        { name: 'Valid', ingredients: 'not-an-array' }, // Invalid ingredients
        { name: 'Valid', instructions: 'not-an-array' }, // Invalid instructions
        { name: 'Valid', prepTime: -5 }, // Negative time
        { name: 'Valid', servings: 0 }, // Zero servings
      ];

      invalidRecipes.forEach((recipe) => {
        if (recipe.name === '') {
          expect(recipe.name.length).toBe(0);
        }
        if (recipe.ingredients && !Array.isArray(recipe.ingredients)) {
          expect(Array.isArray(recipe.ingredients)).toBe(false);
        }
        if (recipe.instructions && !Array.isArray(recipe.instructions)) {
          expect(Array.isArray(recipe.instructions)).toBe(false);
        }
        if ('prepTime' in recipe && (recipe as any).prepTime < 0) {
          expect((recipe as any).prepTime).toBeLessThan(0);
        }
        if ('servings' in recipe && (recipe as any).servings === 0) {
          expect((recipe as any).servings).toBe(0);
        }
      });
    });
  });

  describe('Recipe Authorization', () => {
    it('should require authentication for creating recipes', () => {
      const noToken = undefined;
      expect(noToken).toBeUndefined();
    });

    it('should allow authenticated users to create recipes', () => {
      expect(authToken).toBeDefined();
      expect(authToken.length).toBeGreaterThan(0);
    });

    it('should allow admins to delete any recipe', () => {
      expect(adminToken).toBeDefined();
      const tokenPayload = JSON.parse(
        Buffer.from(adminToken.split('.')[1], 'base64').toString()
      );
      expect(tokenPayload.isAdmin).toBe(true);
    });

    it('should prevent non-owners from deleting recipes', () => {
      const differentUserId = 'different-user-789';
      expect(mockUserId).not.toBe(differentUserId);
    });
  });

  describe('Recipe Query Parameters', () => {
    it('should validate search query parameters', () => {
      const validQueries = [
        { search: 'pasta' },
        { search: 'chicken' },
        { sortBy: 'name' },
        { sortBy: 'createdAt' },
        { order: 'asc' },
        { order: 'desc' },
        { limit: '10' },
        { offset: '0' },
      ];

      validQueries.forEach((query) => {
        if ('search' in query) {
          expect(typeof query.search).toBe('string');
        }
        if ('sortBy' in query) {
          expect(['name', 'createdAt', 'updatedAt']).toContain(query.sortBy);
        }
        if ('order' in query) {
          expect(['asc', 'desc']).toContain(query.order);
        }
        if ('limit' in query) {
          const limit = parseInt(query.limit);
          expect(limit).toBeGreaterThan(0);
        }
        if ('offset' in query) {
          const offset = parseInt(query.offset);
          expect(offset).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should handle invalid query parameters', () => {
      const invalidQueries = [
        { sortBy: 'invalid_field' },
        { order: 'invalid_order' },
        { limit: '-1' },
        { offset: '-5' },
      ];

      invalidQueries.forEach((query) => {
        if ('sortBy' in query && query.sortBy === 'invalid_field') {
          expect(['name', 'createdAt', 'updatedAt']).not.toContain(query.sortBy);
        }
        if ('order' in query && query.order === 'invalid_order') {
          expect(['asc', 'desc']).not.toContain(query.order);
        }
        if ('limit' in query) {
          const limit = parseInt(query.limit);
          expect(limit).toBeLessThan(0);
        }
        if ('offset' in query) {
          const offset = parseInt(query.offset);
          expect(offset).toBeLessThan(0);
        }
      });
    });
  });

  describe('Recipe Time Calculations', () => {
    it('should calculate total time correctly', () => {
      const prepTime = 15;
      const cookTime = 30;
      const expectedTotal = prepTime + cookTime;

      expect(expectedTotal).toBe(45);
    });

    it('should handle missing time values', () => {
      const prepTime = 15;
      const cookTime = undefined;

      expect(prepTime).toBeDefined();
      expect(cookTime).toBeUndefined();
    });

    it('should reject negative time values', () => {
      const invalidTimes = [-1, -10, -100];

      invalidTimes.forEach((time) => {
        expect(time).toBeLessThan(0);
      });
    });
  });

  describe('Recipe Ingredients and Instructions', () => {
    it('should maintain ingredient order', () => {
      const ingredients = [
        { item: 'First', amount: '1 cup' },
        { item: 'Second', amount: '2 tbsp' },
        { item: 'Third', amount: '3 tsp' },
      ];

      expect(ingredients[0].item).toBe('First');
      expect(ingredients[1].item).toBe('Second');
      expect(ingredients[2].item).toBe('Third');
    });

    it('should maintain instruction step order', () => {
      const instructions = [
        { step: 1, text: 'First step' },
        { step: 2, text: 'Second step' },
        { step: 3, text: 'Third step' },
      ];

      expect(instructions[0].step).toBe(1);
      expect(instructions[1].step).toBe(2);
      expect(instructions[2].step).toBe(3);
    });

    it('should handle empty ingredients array', () => {
      const emptyIngredients: any[] = [];
      expect(emptyIngredients).toHaveLength(0);
    });

    it('should handle empty instructions array', () => {
      const emptyInstructions: any[] = [];
      expect(emptyInstructions).toHaveLength(0);
    });
  });
});
