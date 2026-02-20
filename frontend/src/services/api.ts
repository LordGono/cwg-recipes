import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  RecipeInput,
  RecipeListResponse,
  RecipeResponse,
  TagListResponse,
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
