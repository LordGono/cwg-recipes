# CWG Recipes 🍳

A self-hosted recipe management application built with Vue.js, Express, and PostgreSQL. Designed for personal use with Docker deployment on Synology NAS or any Docker-compatible system.

## Features

### Current (MVP)
- ✅ **Recipe Management**: Create, read, update, and delete recipes
- ✅ **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- ✅ **Search & Filter**: Search recipes by name or description
- ✅ **Sorting**: Sort recipes by name, creation date, or update date
- ✅ **Responsive Design**: Mobile-friendly interface built with Tailwind CSS
- ✅ **Docker Support**: Easy deployment with docker-compose

### Future Enhancements
- Tags for categorization and searchability
- Country/region metadata with map visualization
- Shopping list assembly with customizable ingredient exclusions
- Recipe import from external URLs (with AI extraction)
- YouTube video embeds
- Image uploads for recipes
- Android app
- User roles (admin/regular user)
- "My Recipes" and "Pinned Recipes" pages
- Export/import recipes (JSON)
- Print-friendly view
- Nutrition information
- Recipe scaling calculator

## Tech Stack

**Frontend:**
- Vue 3 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Pinia for state management
- Vue Router for routing
- Axios for API calls

**Backend:**
- Express.js with TypeScript
- Prisma ORM
- PostgreSQL database
- JWT authentication
- bcrypt for password hashing
- Helmet for security headers
- express-rate-limit for rate limiting

**DevOps:**
- Docker & Docker Compose
- Multi-stage Docker builds
- Nginx for frontend serving
- Health checks for all services

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development)
- Git

## Quick Start with Docker

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/cwg-recipes.git
   cd cwg-recipes
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` file with your values:**
   ```env
   # Database
   POSTGRES_USER=recipes_user
   POSTGRES_PASSWORD=your_secure_password_here
   POSTGRES_DB=recipes_db
   DATABASE_URL=postgresql://recipes_user:your_secure_password_here@postgres:5432/recipes_db

   # Backend
   PORT=3000
   NODE_ENV=production
   JWT_SECRET=your-super-secret-jwt-key-CHANGE-THIS
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=http://localhost

   # Frontend
   VITE_API_URL=http://localhost:3000/api
   ```

   ⚠️ **Important**: Change `JWT_SECRET` and `POSTGRES_PASSWORD` to strong, unique values!

4. **Start the application:**
   ```bash
   docker-compose up -d
   ```

5. **Access the application:**
   - Frontend: http://localhost
   - Backend API: http://localhost:3000
   - Health check: http://localhost:3000/health

6. **Create your first user:**
   Navigate to http://localhost and click "Login" → "Need an account? Register"

## Local Development Setup

### Backend

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the backend directory:
   ```env
   DATABASE_URL=postgresql://recipes_user:password@localhost:5432/recipes_db
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-dev-secret
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start PostgreSQL:**
   ```bash
   docker run --name recipes-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_USER=recipes_user -e POSTGRES_DB=recipes_db -p 5432:5432 -d postgres:15-alpine
   ```

5. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

   Backend will be available at http://localhost:3000

### Frontend

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   Frontend will be available at http://localhost:5173

## Project Structure

```
cwg-recipes/
├── backend/                 # Express API
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Helper functions
│   │   └── server.ts       # Express app entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── Dockerfile
│   └── package.json
├── frontend/                # Vue.js SPA
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── views/          # Page components
│   │   ├── router/         # Vue Router
│   │   ├── stores/         # Pinia stores
│   │   ├── services/       # API service layer
│   │   ├── types/          # TypeScript types
│   │   └── App.vue
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Recipes
- `GET /api/recipes` - Get all recipes (supports search, sort, pagination)
- `GET /api/recipes/:id` - Get single recipe
- `POST /api/recipes` - Create recipe (requires auth)
- `PUT /api/recipes/:id` - Update recipe (requires auth, owner or admin)
- `DELETE /api/recipes/:id` - Delete recipe (requires auth, owner or admin)

### Query Parameters for GET /api/recipes
- `search` - Search by recipe name or description
- `sortBy` - Sort field (name, createdAt, updatedAt)
- `order` - Sort order (asc, desc)
- `limit` - Number of results
- `offset` - Pagination offset

## Database Schema

### Users Table
- `id` (UUID) - Primary key
- `username` (String, unique) - Username
- `email` (String, unique) - Email address
- `passwordHash` (String) - Hashed password
- `isAdmin` (Boolean) - Admin flag
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Update timestamp

### Recipes Table
- `id` (UUID) - Primary key
- `name` (String) - Recipe name
- `description` (String, optional) - Recipe description
- `prepTime` (Integer, optional) - Prep time in minutes
- `cookTime` (Integer, optional) - Cook time in minutes
- `totalTime` (Integer, optional) - Total time in minutes
- `servings` (Integer, optional) - Number of servings
- `ingredients` (JSON) - Array of ingredient objects
- `instructions` (JSON) - Array of instruction objects
- `createdBy` (UUID) - Foreign key to Users
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Update timestamp

## Security

This project implements several security best practices:

- **Password Security**: bcrypt hashing with salt rounds >= 10
- **JWT Authentication**: Secure tokens with configurable expiration
- **Input Validation**: express-validator on all endpoints
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **CORS**: Configured to allow only frontend origin
- **Rate Limiting**: Applied to authentication endpoints
- **Security Headers**: Helmet.js for HTTP security headers
- **Environment Variables**: Sensitive data stored in .env (not committed)

⚠️ **Important Security Notes:**
- Never commit `.env` files to Git
- Use strong, unique passwords for production
- Change default JWT_SECRET before deploying
- Use HTTPS in production
- Regularly update dependencies

## Deployment on Synology NAS

1. **Install Docker on Synology:**
   - Open Package Center
   - Install "Docker" package

2. **Copy project to NAS:**
   ```bash
   scp -r cwg-recipes/ user@nas-ip:/volume1/docker/
   ```

3. **SSH into NAS:**
   ```bash
   ssh user@nas-ip
   cd /volume1/docker/cwg-recipes
   ```

4. **Create and configure `.env` file**

5. **Start containers:**
   ```bash
   sudo docker-compose up -d
   ```

6. **Configure reverse proxy** (optional):
   - Open Synology DSM
   - Go to Control Panel → Application Portal → Reverse Proxy
   - Create new rule pointing to localhost:80

## Contributing

This is a personal project, but contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## License

MIT License - Feel free to use this project for personal or commercial purposes.

## Author

Created as a portfolio project for self-hosted recipe management.

## Acknowledgments

- Vue.js team for the excellent framework
- Prisma team for the amazing ORM
- Tailwind CSS for the utility-first CSS framework
