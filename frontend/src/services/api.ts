import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  RecipeInput,
  RecipeListResponse,
  RecipeResponse,
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
  }): Promise<RecipeListResponse> {
    const response = await this.api.get<RecipeListResponse>('/recipes', { params });
    return response.data;
  }

  async getRecipe(id: string): Promise<RecipeResponse> {
    const response = await this.api.get<RecipeResponse>(`/recipes/${id}`);
    return response.data;
  }

  async createRecipe(recipe: RecipeInput): Promise<RecipeResponse> {
    const response = await this.api.post<RecipeResponse>('/recipes', recipe);
    return response.data;
  }

  async updateRecipe(id: string, recipe: RecipeInput): Promise<RecipeResponse> {
    const response = await this.api.put<RecipeResponse>(`/recipes/${id}`, recipe);
    return response.data;
  }

  async deleteRecipe(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete(`/recipes/${id}`);
    return response.data;
  }
}

export default new ApiService();
