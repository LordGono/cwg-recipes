export interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    user: User;
    token: string;
  };
}

export interface Ingredient {
  item: string;
  amount: string;
}

export interface Instruction {
  step: number;
  text: string;
}

export interface MacroData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeTag {
  recipeId: string;
  tagId: string;
  tag: Tag;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: number;
  ingredients: Ingredient[];
  instructions: Instruction[];
  isPinned?: boolean;
  imageUrl?: string;
  videoUrl?: string;
  countries?: string[];
  macros?: MacroData;
  tags?: RecipeTag[];
  createdBy: string;
  user?: {
    id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RecipeInput {
  name: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: number;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags?: string[];
  countries?: string[];
  videoUrl?: string;
}

export interface RecipeListResponse {
  success: boolean;
  data: {
    recipes: Recipe[];
    total: number;
    limit: number;
    offset: number;
  };
}

export interface RecipeResponse {
  success: boolean;
  message?: string;
  data: {
    recipe: Recipe;
  };
}

export interface TagListResponse {
  success: boolean;
  data: {
    tags: (Tag & { _count: { recipes: number } })[];
  };
}

export interface CountryCount {
  country: string;
  count: number;
}

export interface CountryCountsResponse {
  success: boolean;
  data: { countries: CountryCount[] };
}

export interface SuggestTagsResponse {
  success: boolean;
  data: {
    suggestions: string[];
  };
}

// ── Shopping Lists ──────────────────────────────────────────────────────────

export interface ShoppingListItem {
  id: string;
  listId: string;
  name: string;
  amount?: string | null;
  checked: boolean;
  position: number;
  recipeId?: string | null;
  createdAt: string;
}

export interface ShoppingListSummary {
  id: string;
  name: string;
  totalItems: number;
  uncheckedItems: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  userId: string;
  items: ShoppingListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListsResponse {
  success: boolean;
  data: { lists: ShoppingListSummary[] };
}

export interface ShoppingListResponse {
  success: boolean;
  data: { list: ShoppingList };
}

export interface ShoppingListItemResponse {
  success: boolean;
  data: { item: ShoppingListItem };
}

export interface AdminUser extends User {
  dailyGeminiLimit?: number | null;
  dailyUsage?: number;
  _count: { recipes: number };
}

export interface AdminStats {
  users: number;
  recipes: number;
  gemini: {
    rpm: { used: number; limit: number; remaining: number };
    rpd: { used: number; limit: number; remaining: number };
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    msg: string;
    param: string;
  }>;
}
