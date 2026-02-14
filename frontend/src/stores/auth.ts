import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import type { User, LoginCredentials, RegisterCredentials } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('auth_token'));
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.isAdmin || false);

  const setAuth = (newToken: string, newUser: User) => {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem('auth_token', newToken);
    error.value = null;
  };

  const clearAuth = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem('auth_token');
  };

  const register = async (credentials: RegisterCredentials) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.register(credentials);
      setAuth(response.data.token, response.data.user);
      return true;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Registration failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const login = async (credentials: LoginCredentials) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.login(credentials);
      setAuth(response.data.token, response.data.user);
      return true;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    clearAuth();
  };

  const fetchCurrentUser = async () => {
    if (!token.value) return;

    loading.value = true;
    try {
      const response = await api.getCurrentUser();
      user.value = response.data.user;
    } catch (err) {
      clearAuth();
    } finally {
      loading.value = false;
    }
  };

  // Auto-fetch user on store init if token exists
  if (token.value && !user.value) {
    fetchCurrentUser();
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    register,
    login,
    logout,
    fetchCurrentUser,
  };
});
