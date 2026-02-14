# CLAUDE.md - Project Context and Guidelines

This file contains important context about the CWG Recipes project for AI assistants and developers.

## Project Overview

**CWG Recipes** is a self-hosted recipe management application designed for personal use on a Synology NAS (or any Docker-compatible system). It's built as an open-source portfolio project with a focus on security, clean architecture, and future extensibility.

### Core Requirements
- Self-hosted on Docker (Synology NAS deployment)
- Open source (GitHub portfolio item)
- Secure (proper gitignore, no secrets in repo)
- MVP features: CRUD recipes, search/filter, user authentication
- Future-ready architecture for planned enhancements

## Architecture Decisions

### Tech Stack Rationale

**Frontend: Vue.js 3 + TypeScript + Vite + Tailwind CSS**
- Vue 3 was chosen per user preference (over React/Next.js)
- TypeScript for type safety and better DX
- Vite for fast build times
- Tailwind CSS for rapid, responsive UI development
- Pinia for state management (Vue 3 standard)

**Backend: Express + TypeScript + Prisma + PostgreSQL**
- Express for simplicity and flexibility
- TypeScript throughout for consistency
- Prisma ORM for type-safe database queries and migrations
- PostgreSQL for robustness (over SQLite) to support future features

**Authentication: JWT + bcrypt**
- JWT tokens for stateless authentication
- bcrypt with 10 salt rounds for password hashing
- Token stored in localStorage on frontend
- Bearer token in Authorization header

### Project Structure

```
cwg-recipes/
├── backend/                 # Express TypeScript API
│   ├── src/
│   │   ├── config/         # Database connection, env config
│   │   ├── controllers/    # Route handlers (auth, recipes)
│   │   ├── middleware/     # Auth, error handling, validation
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business logic (currently minimal)
│   │   ├── utils/          # JWT helpers
│   │   └── server.ts       # Express app entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── Dockerfile          # Multi-stage build
│   └── package.json
├── frontend/                # Vue 3 TypeScript SPA
│   ├── src/
│   │   ├── components/     # RecipeCard, RecipeForm, Navbar
│   │   ├── views/          # Page components (Home, Detail, Create, Edit, Login)
│   │   ├── router/         # Vue Router with auth guards
│   │   ├── stores/         # Pinia stores (auth, recipes)
│   │   ├── services/       # API service layer (axios)
│   │   ├── types/          # TypeScript interfaces
│   │   ├── assets/         # main.css (Tailwind)
│   │   ├── App.vue         # Root component
│   │   └── main.ts         # App entry point
│   ├── Dockerfile          # Multi-stage build + nginx
│   ├── nginx.conf          # SPA routing + API proxy
│   └── package.json
├── docker-compose.yml       # 3 services: postgres, backend, frontend
├── .env.example            # Environment variable template
├── .gitignore              # Comprehensive (includes .env, node_modules, etc.)
├── README.md               # User-facing documentation
├── CONTRIBUTING.md         # Contribution guidelines
├── LICENSE                 # MIT License
└── CLAUDE.md               # This file
```

## Key Design Patterns

### Backend Patterns

1. **Controller-Route Separation**
   - Routes define endpoints and apply middleware
   - Controllers handle request/response logic
   - Example: `auth.routes.ts` → `auth.controller.ts`

2. **Middleware Chain**
   - `helmet()` - Security headers
   - `cors()` - CORS configuration
   - `express.json()` - Body parsing
   - `rateLimit()` - Rate limiting on auth endpoints
   - `authenticate()` - JWT verification (custom)
   - `errorHandler()` - Centralized error handling

3. **Validation**
   - `express-validator` for input validation
   - Validation middleware defined in controllers
   - Example: `registerValidation`, `recipeValidation`

4. **Error Handling**
   - Custom `createError(statusCode, message)` utility
   - Centralized `errorHandler` middleware
   - Consistent JSON error responses

5. **Database Access**
   - Prisma Client singleton in `config/database.ts`
   - All queries use Prisma (no raw SQL)
   - Relationships defined in schema

### Frontend Patterns

1. **Composition API with `<script setup>`**
   - All Vue components use Composition API
   - TypeScript-first approach
   - Reactive refs and computed properties

2. **State Management (Pinia)**
   - `authStore` - User authentication state, login/logout
   - `recipeStore` - Recipe CRUD, search, sort
   - Stores handle API calls and state updates

3. **API Service Layer**
   - Centralized `api.ts` service
   - Axios interceptors for auth token injection
   - Automatic 401 handling (redirect to login)

4. **Route Guards**
   - `requiresAuth` meta for protected routes
   - `requiresGuest` meta for login page
   - Navigation guards in `router/index.ts`

5. **Component Organization**
   - **Components**: Reusable (RecipeCard, RecipeForm, Navbar)
   - **Views**: Page-level (HomeView, RecipeDetailView, etc.)
   - Props and emits typed with TypeScript

## Database Schema

### Users
```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  email        String   @unique
  passwordHash String   @map("password_hash")
  isAdmin      Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  recipes      Recipe[]
}
```

### Recipes
```prisma
model Recipe {
  id           String   @id @default(uuid())
  name         String
  description  String?
  prepTime     Int?
  cookTime     Int?
  totalTime    Int?
  servings     Int?
  ingredients  Json     // Array of {item, amount}
  instructions Json     // Array of {step, text}
  createdBy    String
  user         User     @relation(...)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Important Notes:**
- `ingredients` and `instructions` stored as JSON for flexibility
- UUIDs for all IDs (better for distributed systems)
- Cascade delete: deleting user deletes their recipes
- Indexes on `name` and `createdBy` for performance

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register (public)
- `POST /api/auth/login` - Login (public)
- `GET /api/auth/me` - Get current user (protected)

### Recipes
- `GET /api/recipes` - List recipes (public, supports search/sort)
- `GET /api/recipes/:id` - Get recipe (public)
- `POST /api/recipes` - Create (protected)
- `PUT /api/recipes/:id` - Update (protected, owner or admin)
- `DELETE /api/recipes/:id` - Delete (protected, owner or admin)

**Query params for GET /api/recipes:**
- `search` - Text search in name/description
- `sortBy` - Field to sort by (name, createdAt, updatedAt)
- `order` - asc or desc
- `limit` - Max results
- `offset` - Pagination offset

## Security Considerations

### Implemented Security Measures

1. **Environment Variables**
   - All secrets in `.env` (gitignored)
   - `.env.example` as template
   - Validation in `config/index.ts`

2. **Password Security**
   - bcrypt with 10 salt rounds
   - Passwords never stored in plain text
   - Password validation: min 8 chars, uppercase, lowercase, number

3. **JWT Tokens**
   - Signed with secret from environment
   - 7-day expiration (configurable)
   - Verified on each protected request

4. **Input Validation**
   - express-validator on all inputs
   - SQL injection protected by Prisma
   - XSS protection via Helmet

5. **Rate Limiting**
   - 5 requests per 15 minutes on auth endpoints
   - Prevents brute force attacks

6. **CORS**
   - Restricted to frontend URL only
   - Configurable via environment

7. **Security Headers**
   - Helmet.js for standard headers
   - Custom headers in nginx config

### Security Checklist for Deployment
- [ ] Change JWT_SECRET to random value
- [ ] Change POSTGRES_PASSWORD to strong password
- [ ] Verify .env is gitignored
- [ ] Use HTTPS in production
- [ ] Configure firewall rules
- [ ] Regular dependency updates
- [ ] Monitor for vulnerabilities

## Development Workflow

### Local Development

1. **Backend:**
   ```bash
   cd backend
   npm install
   cp ../.env.example .env  # Edit with local settings
   docker run --name recipes-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_USER=recipes_user -e POSTGRES_DB=recipes_db -p 5432:5432 -d postgres:15-alpine
   npx prisma migrate dev
   npm run dev
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   # Create .env with VITE_API_URL=http://localhost:3000/api
   npm run dev
   ```

3. **Docker (Full Stack):**
   ```bash
   cp .env.example .env  # Edit with settings
   docker-compose up -d
   ```

### Database Migrations

```bash
cd backend

# Create new migration
npx prisma migrate dev --name description_of_change

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only!)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

### Building for Production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve dist/ with nginx

# Docker (recommended)
docker-compose up -d --build
```

## Future Enhancements (Planned)

### High Priority
- **Tags**: Add tags table, many-to-many relationship
- **Image uploads**: Multer middleware, file storage, image URLs in schema
- **Search improvements**: Full-text search, filter by tags

### Medium Priority
- **Country/region**: Add fields to recipe schema, integrate map library
- **Shopping lists**: New table, recipe-to-list relationships
- **My Recipes page**: Filter by current user
- **Pinned recipes**: Add `isPinned` boolean or separate table

### Low Priority
- **Recipe import**: Web scraping service, AI extraction
- **YouTube embeds**: Add videoUrl field, iframe component
- **Android app**: React Native or Flutter
- **Nutrition info**: Add nutritional fields to schema
- **Recipe scaling**: Frontend calculator for ingredient quantities
- **Export/import**: JSON serialization endpoints

## Common Development Tasks

### Adding a New API Endpoint

1. Define route in `backend/src/routes/*.routes.ts`
2. Create controller function in `backend/src/controllers/*.controller.ts`
3. Add validation middleware if needed
4. Update API service in `frontend/src/services/api.ts`
5. Call from Pinia store or component

### Adding a New Frontend Page

1. Create view component in `frontend/src/views/`
2. Add route in `frontend/src/router/index.ts`
3. Add navigation link in `Navbar.vue` if needed
4. Create any needed child components

### Adding a Database Field

1. Update Prisma schema in `backend/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add_field_name`
3. Update TypeScript types in `frontend/src/types/index.ts`
4. Update API responses/requests as needed
5. Update UI components to display/edit new field

## Testing Strategy (Not Yet Implemented)

### Recommended Testing Approach

**Backend:**
- Jest for unit tests
- Supertest for API integration tests
- Test database with Docker

**Frontend:**
- Vitest for unit tests
- Vue Test Utils for component tests
- Playwright for E2E tests

**Example test structure:**
```
backend/
  tests/
    unit/
    integration/
frontend/
  tests/
    unit/
    components/
    e2e/
```

## Troubleshooting

### Common Issues

**"Cannot connect to database"**
- Check DATABASE_URL in .env
- Verify PostgreSQL container is running
- Check network connectivity

**"JWT token invalid"**
- Token may be expired (7 day default)
- JWT_SECRET mismatch between sessions
- Clear localStorage and re-login

**"CORS error"**
- Check FRONTEND_URL in backend .env
- Verify frontend is accessing correct API URL
- Check browser console for exact error

**"Port already in use"**
- Backend: Check port 3000
- Frontend: Check port 5173 (dev) or 80 (docker)
- PostgreSQL: Check port 5432

**"Prisma client not found"**
- Run `npx prisma generate`
- Reinstall dependencies

## Important Files to Preserve

### Never Delete
- `backend/prisma/schema.prisma` - Database schema
- `.env.example` - Environment template
- `.gitignore` - Security critical
- `docker-compose.yml` - Deployment config

### Modify with Caution
- `backend/src/middleware/auth.ts` - Authentication logic
- `backend/src/config/index.ts` - Configuration validation
- `frontend/src/router/index.ts` - Route guards
- `frontend/src/services/api.ts` - API client setup

## Conventions and Standards

### Code Style

**TypeScript:**
- Use interfaces over types when possible
- Explicit return types on functions
- No `any` types (use `unknown` if needed)

**Naming:**
- camelCase for variables and functions
- PascalCase for components and types
- UPPER_CASE for constants
- kebab-case for file names (except components)

**Vue Components:**
- PascalCase file names (e.g., `RecipeCard.vue`)
- `<script setup lang="ts">` syntax
- Props and emits explicitly typed
- Composition API, no Options API

**Database:**
- snake_case for column names (mapped in Prisma)
- PascalCase for Prisma models
- camelCase for Prisma fields

### Git Workflow

**Commit messages:**
- Present tense: "Add feature" not "Added feature"
- Descriptive: "Add recipe search endpoint" not "Update backend"
- Reference issues: "Fix login bug (#12)"

**Branches:**
- `main` - Production-ready code
- `develop` - Integration branch (if needed)
- Feature branches: `feature/recipe-tags`
- Bugfix branches: `fix/login-error`

## Notes for AI Assistants

### When Making Changes

1. **Always read files before editing** - Don't assume structure
2. **Preserve existing patterns** - Match current code style
3. **Update types** - Keep frontend types in sync with backend
4. **Test database changes** - Provide migration commands
5. **Update documentation** - README, CLAUDE.md if needed
6. **Check security** - No secrets, validate inputs
7. **Consider backwards compatibility** - Especially for API changes

### User Preferences (from initial conversation)

- Prefers Vue.js over React
- Wants security as top priority
- Planning to deploy on Synology NAS
- Open to suggestions for features
- Values clean, maintainable code
- Portfolio/resume project (quality matters)

### Architecture Philosophy

- **Simple over clever** - Readability first
- **Type-safe** - TypeScript everywhere
- **Secure by default** - No shortcuts on security
- **Future-ready** - Design for planned features
- **Self-documenting** - Clear names, good types
- **Container-first** - Docker is primary deployment

## Resources and Documentation

### Key Dependencies
- [Vue 3 Docs](https://vuejs.org/)
- [Vite Docs](https://vitejs.dev/)
- [Pinia Docs](https://pinia.vuejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Express Docs](https://expressjs.com/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [JWT.io](https://jwt.io/)

### Docker
- [Docker Compose](https://docs.docker.com/compose/)
- [Synology Docker](https://www.synology.com/en-us/dsm/packages/Docker)

---

**Last Updated**: 2026-02-13
**Project Version**: 1.0.0 (MVP)
**Created by**: Claude Code (Anthropic)
