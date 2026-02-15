# Local Development Setup Guide

## Prerequisites Installed ✅
- Node.js v24.12.0
- npm 11.6.2
- Docker 29.2.0

## Setup Steps

### 1. Dependencies (COMPLETED ✅)
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Files (COMPLETED ✅)
`.env` files created with development credentials:
- Root `.env` for backend and docker-compose
- `frontend/.env` for Vite

### 3. Start PostgreSQL
```bash
# Start Docker Desktop first!

# Start PostgreSQL container
docker run --name recipes-postgres \
  -e POSTGRES_PASSWORD=devpassword123 \
  -e POSTGRES_USER=recipes_user \
  -e POSTGRES_DB=recipes_db \
  -p 5432:5432 \
  -d postgres:15-alpine

# Check if it's running
docker ps
```

### 4. Run Database Migrations
```bash
cd backend
npx prisma migrate dev --name init
```

This will:
- Create the database schema
- Generate Prisma Client
- Create migration files in `prisma/migrations/`

### 5. Start Backend Server
```bash
cd backend
npm run dev
```

Backend will be available at: http://localhost:3000

**Test it**: Open http://localhost:3000 in your browser

### 6. Start Frontend Server (in a new terminal)
```bash
cd frontend
npm run dev
```

Frontend will be available at: http://localhost:5173

### 7. Test the Application

1. **Open** http://localhost:5173
2. **Register** a new user account
3. **Create** your first recipe
4. **Test** search, edit, delete functions

## Development Workflow

### Daily Startup
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Stopping
- Press `Ctrl+C` in each terminal
- Database keeps running (no need to stop it)

### Restarting Database
```bash
# Stop
docker stop recipes-postgres

# Start
docker start recipes-postgres

# Remove (if you want to start fresh)
docker stop recipes-postgres
docker rm recipes-postgres
# Then run the docker run command again
```

### Database Management

**Prisma Studio** (Visual Database Browser):
```bash
cd backend
npx prisma studio
```
Opens at http://localhost:5555

**Create New Migration**:
```bash
cd backend
npx prisma migrate dev --name description_of_change
```

**Reset Database** (DANGER - deletes all data):
```bash
cd backend
npx prisma migrate reset
```

### Useful Commands

**Backend**:
```bash
cd backend
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Run production build
npx prisma studio    # Open database GUI
npx prisma generate  # Regenerate Prisma Client
```

**Frontend**:
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

**Docker**:
```bash
docker ps                    # List running containers
docker logs recipes-postgres # View PostgreSQL logs
docker stop recipes-postgres # Stop database
docker start recipes-postgres # Start database
docker rm recipes-postgres   # Remove container
```

## Troubleshooting

### "Port already in use"
```bash
# Backend port 3000
lsof -ti:3000 | xargs kill -9

# Frontend port 5173
lsof -ti:5173 | xargs kill -9

# PostgreSQL port 5432
docker stop recipes-postgres
```

### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
docker ps

# Check PostgreSQL logs
docker logs recipes-postgres

# Restart PostgreSQL
docker restart recipes-postgres
```

### "Prisma Client not found"
```bash
cd backend
npx prisma generate
```

### "JWT token invalid"
- Clear browser localStorage (F12 → Application → Local Storage → Clear)
- Re-login to get a new token

### Database Changes Not Reflecting
```bash
cd backend
npx prisma migrate dev
npx prisma generate
# Restart backend server
```

## Testing Checklist

After setup, verify:
- [ ] Backend responds at http://localhost:3000
- [ ] Frontend loads at http://localhost:5173
- [ ] Can register a new user
- [ ] Can login with registered user
- [ ] Can create a recipe
- [ ] Can view recipe list
- [ ] Can search recipes
- [ ] Can edit own recipe
- [ ] Can delete own recipe
- [ ] Authentication redirects work

## Development Tips

1. **Hot Reload**: Both frontend and backend auto-reload on file changes
2. **TypeScript Errors**: Check your IDE/terminal for type errors
3. **API Testing**: Use browser DevTools Network tab or Postman
4. **Database Inspection**: Use Prisma Studio (`npx prisma studio`)
5. **Git**: Commit often, `.env` files are already gitignored

## Next Steps

Once everything works locally:
1. Add your first recipe
2. Test all features
3. Explore the codebase
4. Read CLAUDE.md for architecture details
5. Plan your first feature enhancement

## Security Reminder 🔒

**Development credentials** are in use:
- JWT_SECRET: `dev-secret-key-change-for-production-12345678`
- POSTGRES_PASSWORD: `devpassword123`

These are **ONLY for local development**. Never use these in production!

For production deployment, see README.md and SECURITY.md.
