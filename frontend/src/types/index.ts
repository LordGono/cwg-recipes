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

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    msg: string;
    param: string;
  }>;
}
