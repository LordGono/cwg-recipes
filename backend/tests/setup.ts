import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

beforeAll(() => {
  // Setup code that runs before all tests
  console.log('🧪 Starting test suite...');
});

afterAll(() => {
  // Cleanup code that runs after all tests
  console.log('✅ Test suite completed');
});
