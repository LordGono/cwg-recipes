import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  RecipeInput,
  RecipeListResponse,
  RecipeResponse,
  SuggestTagsResponse,
  CountryCountsResponse,
  ShoppingListsResponse,
  ShoppingListResponse,
  ShoppingListItemResponse,
  TagListResponse,
  MacroData,
  User,
} from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle response errors
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/register', credentials);
    return response.data;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  }

  async getCurrentUser(): Promise<{ success: boolean; data: { user: User } }> {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  // Recipe endpoints
  async getRecipes(params?: {
    search?: string;
    sortBy?: string;
    order?: string;
    limit?: number;
    offset?: number;
    tag?: string;
  }): Promise<RecipeListResponse> {
    const response = await this.api.get<RecipeListResponse>('/recipes', { params });
    return response.data;
  }

  async getMyRecipes(params?: {
    search?: string;
    sortBy?: string;
    order?: string;
  }): Promise<RecipeListResponse> {
    const response = await this.api.get<RecipeListResponse>('/recipes/my-recipes', { params });
    return response.data;
  }

  async getRecipe(id: string): Promise<RecipeResponse> {
    const response = await this.api.get<RecipeResponse>(`/recipes/${id}`);
    return response.data;
  }

  async createRecipe(recipe: RecipeInput, image?: File): Promise<RecipeResponse> {
    if (image) {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('name', recipe.name);
      if (recipe.description) formData.append('description', recipe.description);
      if (recipe.prepTime != null) formData.append('prepTime', String(recipe.prepTime));
      if (recipe.cookTime != null) formData.append('cookTime', String(recipe.cookTime));
      if (recipe.totalTime != null) formData.append('totalTime', String(recipe.totalTime));
      if (recipe.servings != null) formData.append('servings', String(recipe.servings));
      formData.append('ingredients', JSON.stringify(recipe.ingredients));
      formData.append('instructions', JSON.stringify(recipe.instructions));
      if (recipe.tags) formData.append('tags', JSON.stringify(recipe.tags));
      formData.append('countries', JSON.stringify(recipe.countries ?? []));
      if (recipe.videoUrl != null) formData.append('videoUrl', recipe.videoUrl);

      const response = await this.api.post<RecipeResponse>('/recipes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }

    const response = await this.api.post<RecipeResponse>('/recipes', recipe);
    return response.data;
  }

  async updateRecipe(id: string, recipe: RecipeInput, image?: File): Promise<RecipeResponse> {
    if (image) {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('name', recipe.name);
      if (recipe.description) formData.append('description', recipe.description);
      if (recipe.prepTime != null) formData.append('prepTime', String(recipe.prepTime));
      if (recipe.cookTime != null) formData.append('cookTime', String(recipe.cookTime));
      if (recipe.totalTime != null) formData.append('totalTime', String(recipe.totalTime));
      if (recipe.servings != null) formData.append('servings', String(recipe.servings));
      formData.append('ingredients', JSON.stringify(recipe.ingredients));
      formData.append('instructions', JSON.stringify(recipe.instructions));
      if (recipe.tags) formData.append('tags', JSON.stringify(recipe.tags));
      formData.append('countries', JSON.stringify(recipe.countries ?? []));
      if (recipe.videoUrl != null) formData.append('videoUrl', recipe.videoUrl);

      const response = await this.api.put<RecipeResponse>(`/recipes/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }

    const response = await this.api.put<RecipeResponse>(`/recipes/${id}`, recipe);
    return response.data;
  }

  async deleteRecipe(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete(`/recipes/${id}`);
    return response.data;
  }

  async togglePinRecipe(id: string): Promise<RecipeResponse> {
    const response = await this.api.patch<RecipeResponse>(`/recipes/${id}/pin`);
    return response.data;
  }

  async calculateMacros(id: string): Promise<{ success: boolean; data: { macros: MacroData } }> {
    const response = await this.api.post(`/recipes/${id}/macros`);
    return response.data;
  }

  async suggestTags(id: string): Promise<SuggestTagsResponse> {
    const response = await this.api.post<SuggestTagsResponse>(`/recipes/${id}/suggest-tags`);
    return response.data;
  }

  async addTags(id: string, tags: string[]): Promise<RecipeResponse> {
    const response = await this.api.patch<RecipeResponse>(`/recipes/${id}/tags`, { tags });
    return response.data;
  }

  async getCountryCounts(): Promise<CountryCountsResponse> {
    const response = await this.api.get<CountryCountsResponse>('/recipes/countries');
    return response.data;
  }

  // Tag endpoints
  async getTags(): Promise<TagListResponse> {
    const response = await this.api.get<TagListResponse>('/tags');
    return response.data;
  }

  async createTag(name: string): Promise<{ success: boolean; data: { tag: { id: string; name: string } } }> {
    const response = await this.api.post('/tags', { name });
    return response.data;
  }

  // Import endpoints
  async importFromURL(url: string): Promise<{
    success: boolean;
    method: 'structured' | 'gemini';
    message: string;
    data: { recipe: RecipeInput };
    usage?: { rpd: { used: number; remaining: number } };
  }> {
    const response = await this.api.post('/import/url', { url });
    return response.data;
  }

  async importFromPDF(file: File): Promise<{
    success: boolean;
    method: 'gemini';
    message: string;
    data: { recipe: RecipeInput };
  }> {
    const formData = new FormData();
    formData.append('pdf', file);
    const response = await this.api.post('/import/pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async importFromText(text: string): Promise<{
    success: boolean;
    method: 'gemini';
    message: string;
    data: { recipe: RecipeInput };
  }> {
    const response = await this.api.post('/import/text', { text });
    return response.data;
  }

  async importFromJSON(json: unknown): Promise<{
    success: boolean;
    method: 'json';
    message: string;
    data: { recipe: RecipeInput };
  }> {
    const response = await this.api.post('/import/json', json);
    return response.data;
  }

  async exportRecipes(mine = false): Promise<Blob> {
    const response = await this.api.get('/recipes/export', {
      params: mine ? { mine: 'true' } : {},
      responseType: 'blob',
    });
    return response.data;
  }

  // ── Shopping Lists ──────────────────────────────────────────────────────

  async getShoppingLists(): Promise<ShoppingListsResponse> {
    const response = await this.api.get('/shopping-lists');
    return response.data;
  }

  async createShoppingList(name: string): Promise<ShoppingListResponse> {
    const response = await this.api.post('/shopping-lists', { name });
    return response.data;
  }

  async getShoppingList(id: string): Promise<ShoppingListResponse> {
    const response = await this.api.get(`/shopping-lists/${id}`);
    return response.data;
  }

  async renameShoppingList(id: string, name: string): Promise<ShoppingListResponse> {
    const response = await this.api.patch(`/shopping-lists/${id}`, { name });
    return response.data;
  }

  async deleteShoppingList(id: string): Promise<void> {
    await this.api.delete(`/shopping-lists/${id}`);
  }

  async addShoppingListItem(
    listId: string,
    name: string,
    amount?: string
  ): Promise<ShoppingListItemResponse> {
    const response = await this.api.post(`/shopping-lists/${listId}/items`, { name, amount });
    return response.data;
  }

  async addRecipeToShoppingList(listId: string, recipeId: string): Promise<ShoppingListResponse> {
    const response = await this.api.post(`/shopping-lists/${listId}/recipes/${recipeId}`);
    return response.data;
  }

  async updateShoppingListItem(
    listId: string,
    itemId: string,
    patch: { checked?: boolean; name?: string; amount?: string }
  ): Promise<ShoppingListItemResponse> {
    const response = await this.api.patch(`/shopping-lists/${listId}/items/${itemId}`, patch);
    return response.data;
  }

  async deleteShoppingListItem(listId: string, itemId: string): Promise<void> {
    await this.api.delete(`/shopping-lists/${listId}/items/${itemId}`);
  }

  async clearCheckedItems(listId: string): Promise<{ success: boolean; data: { removed: number } }> {
    const response = await this.api.delete(`/shopping-lists/${listId}/items`);
    return response.data;
  }

  async getImportUsageStats(): Promise<{
    success: boolean;
    data: {
      rpm: { used: number; limit: number; remaining: number };
      rpd: { used: number; limit: number; remaining: number };
      tpm?: { used: number; limit: number; remaining: number };
    };
  }> {
    const response = await this.api.get('/import/usage');
    return response.data;
  }
}

export default new ApiService();
