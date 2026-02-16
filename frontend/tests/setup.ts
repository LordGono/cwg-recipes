import { beforeAll, afterAll } from 'vitest';

// Mock environment variables
beforeAll(() => {
  console.log('🧪 Starting frontend test suite...');

  // Mock import.meta.env for Vite
  (global as any).import = {
    meta: {
      env: {
        VITE_API_URL: 'http://localhost:3000/api',
        MODE: 'test',
      },
    },
  };
});

afterAll(() => {
  console.log('✅ Frontend test suite completed');
});
