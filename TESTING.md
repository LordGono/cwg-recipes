# Testing Guide

This document provides comprehensive information about testing the CWG Recipes application.

## Overview

The project uses **Vitest** as the testing framework for both backend and frontend. Vitest provides:

- ⚡ Fast test execution with native ESM support
- 🔍 Built-in code coverage with V8
- 🎯 Jest-compatible API
- 🔄 Hot module replacement (HMR) for tests
- 📦 Out-of-the-box TypeScript support

## Test Structure

```
cwg-recipes/
├── backend/
│   ├── tests/
│   │   ├── setup.ts              # Global test setup
│   │   ├── utils/                # Utility function tests
│   │   │   ├── jwt.test.ts       # JWT token generation/verification
│   │   │   └── password.test.ts  # bcrypt password hashing
│   │   ├── middleware/           # Middleware tests
│   │   │   └── auth.test.ts      # Authentication middleware
│   │   └── integration/          # Integration tests
│   │       └── recipes.test.ts   # Recipe endpoint tests
│   ├── vitest.config.ts          # Vitest configuration
│   └── .env.test                 # Test environment variables
└── frontend/
    ├── tests/
    │   ├── setup.ts              # Global test setup
    │   └── stores/               # Pinia store tests
    │       ├── auth.test.ts      # Auth store tests
    │       └── recipes.test.ts   # Recipe store tests
    └── vitest.config.ts          # Vitest configuration
```

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- jwt.test.ts

# Run tests matching pattern
npm test -- --grep "JWT"
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts

# Run tests matching pattern
npm test -- --grep "Authentication"
```

## Test Categories

### Backend Tests

#### 1. **Utils Tests** (`tests/utils/`)

**JWT Tests (`jwt.test.ts`)**
- Token generation and validation
- Payload verification
- Security checks (token tampering, wrong secret)
- Edge cases (empty tokens, malformed tokens)

**Password Tests (`password.test.ts`)**
- bcrypt hash generation
- Password comparison and verification
- Case sensitivity and whitespace handling
- Special characters and unicode support
- Security properties (salt rounds, no password exposure)

#### 2. **Middleware Tests** (`tests/middleware/`)

**Auth Middleware (`auth.test.ts`)**
- Valid token authentication
- Invalid token rejection
- Missing authorization header handling
- Token format validation (Bearer prefix)
- Admin vs regular user handling
- Error response security (no sensitive info leakage)

#### 3. **Integration Tests** (`tests/integration/`)

**Recipe Tests (`recipes.test.ts`)**
- Recipe data structure validation
- Authorization checks (create, update, delete)
- Query parameter validation (search, sort, filter)
- Ingredient and instruction ordering
- Time calculations

### Frontend Tests

#### 1. **Store Tests** (`tests/stores/`)

**Auth Store (`auth.test.ts`)**
- Initial state verification
- Authentication status tracking
- Admin privilege detection
- Token and user management
- localStorage persistence
- Logout functionality
- Loading and error states
- User data integrity

**Recipe Store (`recipes.test.ts`)**
- Initial state verification
- Recipe list management
- Current recipe handling
- Search functionality
- Sort and filter operations
- Recipe data structure preservation
- Tag and pin management
- Image URL handling

## Writing Tests

### Best Practices

1. **Describe blocks for organization**
   ```typescript
   describe('Feature Name', () => {
     describe('Specific Functionality', () => {
       it('should do something specific', () => {
         // Test implementation
       });
     });
   });
   ```

2. **Clear test names**
   ```typescript
   // Good
   it('should reject invalid token format', () => { });

   // Bad
   it('test token', () => { });
   ```

3. **Arrange-Act-Assert pattern**
   ```typescript
   it('should authenticate valid token', () => {
     // Arrange
     const token = generateToken(mockPayload);
     const req = createMockRequest(token);

     // Act
     authenticate(req, res, next);

     // Assert
     expect(req.user).toBeDefined();
     expect(next).toHaveBeenCalled();
   });
   ```

4. **Test edge cases**
   - Empty strings
   - Null/undefined values
   - Very long inputs
   - Special characters
   - Invalid data types

5. **Mock external dependencies**
   ```typescript
   vi.mock('../../src/services/api', () => ({
     default: {
       login: vi.fn(),
       register: vi.fn(),
     },
   }));
   ```

### Example Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Recipe Validation', () => {
  let validRecipe: RecipeInput;

  beforeEach(() => {
    validRecipe = {
      name: 'Test Recipe',
      ingredients: [{ item: 'Flour', amount: '2 cups' }],
      instructions: [{ step: 1, text: 'Mix ingredients' }],
    };
  });

  it('should accept valid recipe data', () => {
    expect(validRecipe.name).toBeDefined();
    expect(validRecipe.ingredients).toHaveLength(1);
  });

  it('should reject empty recipe name', () => {
    validRecipe.name = '';
    expect(validRecipe.name.length).toBe(0);
  });
});
```

## Coverage Goals

### Current Coverage

Run coverage reports to see current test coverage:

```bash
# Backend
cd backend && npm run test:coverage

# Frontend
cd frontend && npm run test:coverage
```

### Coverage Targets

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

### Critical Areas (100% coverage required)

- Authentication (JWT, password hashing, middleware)
- Authorization (admin checks, ownership verification)
- Data validation (recipe input, user registration)
- Error handling

## Continuous Integration

### GitHub Actions (Future)

Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install backend dependencies
        run: cd backend && npm ci

      - name: Run backend tests
        run: cd backend && npm test

      - name: Install frontend dependencies
        run: cd frontend && npm ci

      - name: Run frontend tests
        run: cd frontend && npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Debugging Tests

### VSCode Launch Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Frontend Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test"],
      "cwd": "${workspaceFolder}/frontend",
      "console": "integratedTerminal"
    }
  ]
}
```

### Common Issues

**1. Tests timeout**
```typescript
// Increase timeout for specific test
it('slow operation', async () => {
  // Test code
}, 15000); // 15 second timeout
```

**2. Mock not working**
```typescript
// Ensure mocks are cleared between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

**3. Async tests not waiting**
```typescript
// Always await async operations
it('should fetch data', async () => {
  await store.fetchRecipes();
  expect(store.recipes).toBeDefined();
});
```

## Test Data

### Mock Data Location

Test data and fixtures are defined within test files for better isolation.

### Example Mock Data

```typescript
const mockUser: User = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  isAdmin: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockRecipe: Recipe = {
  id: 'recipe-123',
  name: 'Test Recipe',
  ingredients: [{ item: 'Flour', amount: '2 cups' }],
  instructions: [{ step: 1, text: 'Mix ingredients' }],
  createdBy: 'user-123',
  // ... other fields
};
```

## Contributing Tests

### When to Add Tests

1. **New Features**: Every new feature should include tests
2. **Bug Fixes**: Add a test that reproduces the bug, then fix it
3. **Refactoring**: Ensure existing tests pass, add new ones if behavior changes
4. **Critical Paths**: Authentication, authorization, data persistence

### Test Review Checklist

- [ ] Test names clearly describe what is being tested
- [ ] Tests are independent (don't rely on other tests)
- [ ] Edge cases are covered
- [ ] Mocks are used appropriately
- [ ] Assertions are specific and meaningful
- [ ] Tests run successfully in CI/CD
- [ ] Coverage doesn't decrease

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Jest Matchers (Vitest Compatible)](https://jestjs.io/docs/expect)

## Support

For questions or issues with tests:
1. Check this documentation first
2. Review existing test files for examples
3. Check Vitest documentation
4. Open an issue on GitHub

---

**Last Updated**: 2026-02-16
**Maintained By**: CWG Recipes Team
