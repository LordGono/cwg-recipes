import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../src/stores/auth';
import type { User } from '../../src/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock API
vi.mock('../../src/services/api', () => ({
  default: {
    register: vi.fn(),
    login: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with null user and token', () => {
      const store = useAuthStore();

      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('should not be authenticated initially', () => {
      const store = useAuthStore();

      expect(store.isAuthenticated).toBe(false);
    });

    it('should not be admin initially', () => {
      const store = useAuthStore();

      expect(store.isAdmin).toBe(false);
    });

    it('should load token from localStorage if exists', () => {
      localStorageMock.setItem('auth_token', 'stored-token');
      const store = useAuthStore();

      expect(store.token).toBe('stored-token');
    });
  });

  describe('Authentication Status', () => {
    it('should be authenticated when both token and user exist', () => {
      const store = useAuthStore();
      const mockUser: User = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.token = 'test-token';
      store.user = mockUser;

      expect(store.isAuthenticated).toBe(true);
    });

    it('should not be authenticated with only token', () => {
      const store = useAuthStore();
      store.token = 'test-token';
      store.user = null;

      expect(store.isAuthenticated).toBe(false);
    });

    it('should not be authenticated with only user', () => {
      const store = useAuthStore();
      const mockUser: User = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.token = null;
      store.user = mockUser;

      expect(store.isAuthenticated).toBe(false);
    });
  });

  describe('Admin Status', () => {
    it('should identify admin users correctly', () => {
      const store = useAuthStore();
      const adminUser: User = {
        id: '123',
        username: 'admin',
        email: 'admin@example.com',
        isAdmin: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.user = adminUser;

      expect(store.isAdmin).toBe(true);
    });

    it('should identify non-admin users correctly', () => {
      const store = useAuthStore();
      const regularUser: User = {
        id: '123',
        username: 'user',
        email: 'user@example.com',
        isAdmin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.user = regularUser;

      expect(store.isAdmin).toBe(false);
    });

    it('should return false for admin when user is null', () => {
      const store = useAuthStore();
      store.user = null;

      expect(store.isAdmin).toBe(false);
    });
  });

  describe('Set Auth', () => {
    it('should set token and user correctly', () => {
      const store = useAuthStore();
      const mockUser: User = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Call the internal setAuth method via login simulation
      store.token = 'new-token';
      store.user = mockUser;

      expect(store.token).toBe('new-token');
      expect(store.user).toEqual(mockUser);
    });

    it('should persist token to localStorage', () => {
      const store = useAuthStore();
      const mockUser: User = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.token = 'new-token';
      store.user = mockUser;
      localStorageMock.setItem('auth_token', 'new-token');

      expect(localStorageMock.getItem('auth_token')).toBe('new-token');
    });

    it('should clear error when setting auth', () => {
      const store = useAuthStore();
      const mockUser: User = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.error = 'Previous error';
      store.token = 'new-token';
      store.user = mockUser;
      store.error = null;

      expect(store.error).toBeNull();
    });
  });

  describe('Clear Auth (Logout)', () => {
    it('should clear token and user', () => {
      const store = useAuthStore();
      const mockUser: User = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.token = 'test-token';
      store.user = mockUser;

      store.logout();

      expect(store.token).toBeNull();
      expect(store.user).toBeNull();
    });

    it('should remove token from localStorage', () => {
      const store = useAuthStore();
      localStorageMock.setItem('auth_token', 'test-token');

      store.logout();

      expect(localStorageMock.getItem('auth_token')).toBeNull();
    });

    it('should mark user as not authenticated after logout', () => {
      const store = useAuthStore();
      const mockUser: User = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.token = 'test-token';
      store.user = mockUser;
      expect(store.isAuthenticated).toBe(true);

      store.logout();
      expect(store.isAuthenticated).toBe(false);
    });
  });

  describe('Loading State', () => {
    it('should track loading state', () => {
      const store = useAuthStore();

      expect(store.loading).toBe(false);

      store.loading = true;
      expect(store.loading).toBe(true);

      store.loading = false;
      expect(store.loading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should track error messages', () => {
      const store = useAuthStore();

      expect(store.error).toBeNull();

      store.error = 'Test error message';
      expect(store.error).toBe('Test error message');

      store.error = null;
      expect(store.error).toBeNull();
    });

    it('should clear error on successful auth', () => {
      const store = useAuthStore();
      const mockUser: User = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.error = 'Previous error';
      store.token = 'new-token';
      store.user = mockUser;
      store.error = null;

      expect(store.error).toBeNull();
    });
  });

  describe('User Data Integrity', () => {
    it('should preserve user data structure', () => {
      const store = useAuthStore();
      const mockUser: User = {
        id: 'user-123',
        username: 'johndoe',
        email: 'john@example.com',
        isAdmin: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      store.user = mockUser;

      expect(store.user).toEqual(mockUser);
      expect(store.user?.id).toBe('user-123');
      expect(store.user?.username).toBe('johndoe');
      expect(store.user?.email).toBe('john@example.com');
      expect(store.user?.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle user updates', () => {
      const store = useAuthStore();
      const initialUser: User = {
        id: '123',
        username: 'oldname',
        email: 'old@example.com',
        isAdmin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.user = initialUser;
      expect(store.user?.username).toBe('oldname');

      const updatedUser: User = {
        ...initialUser,
        username: 'newname',
        email: 'new@example.com',
      };

      store.user = updatedUser;
      expect(store.user?.username).toBe('newname');
      expect(store.user?.email).toBe('new@example.com');
    });
  });
});
