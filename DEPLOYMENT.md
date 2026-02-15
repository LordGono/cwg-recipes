# Deployment Guide

## Deploying to Synology NAS

This guide covers deploying CWG Recipes to your Synology NAS using the provided deployment scripts.

## Prerequisites

- Synology NAS with Docker package installed
- Network access to your NAS (SMB/CIFS share)
- SSH access to NAS (optional, for remote Docker commands)
- Write permissions to the Docker shared folder

## Quick Start

### 1. Set Up Deployment Script (First Time Only)

**Windows (PowerShell):**
```powershell
# Copy the template
Copy-Item deploy-to-nas.ps1.example deploy-to-nas.ps1

# Edit deploy-to-nas.ps1 and update the NAS_PATH variable:
# $NAS_PATH = "\\YOUR_NAS_NAME\docker\cwg-recipes"
```

**Linux/macOS/WSL (Bash):**
```bash
# Copy the template
cp deploy-to-nas.ps1.example deploy-to-nas.ps1

# Make it executable
chmod +x deploy-to-nas.sh

# Edit and update NAS_PATH variable
```

**Important:** The `deploy-to-nas.ps1` and `deploy-to-nas.sh` files are gitignored, so your personal NAS path won't be committed to the repository.

### 2. Create Production .env File on NAS

**Option A: Manually on NAS**
1. Access your NAS via File Station or SMB
2. Navigate to `/volume1/docker/cwg-recipes/`
3. Copy `.env.example` to `.env`
4. Edit `.env` with production values:
   ```env
   # Generate secure secrets!
   JWT_SECRET=<generated-32-char-random-string>
   POSTGRES_PASSWORD=<strong-password-here>

   NODE_ENV=production
   FRONTEND_URL=http://your-nas-ip
   DATABASE_URL=postgresql://recipes_user:<password>@postgres:5432/recipes_db
   ```

**Option B: Generate secure secrets:**
```powershell
# PowerShell - Generate JWT secret
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Deploy to NAS

**Windows (PowerShell):**
```powershell
# Basic deployment (sync files only)
.\deploy-to-nas.ps1

# Deploy and show Docker restart instructions
.\deploy-to-nas.ps1 -Restart

# Deploy and show Docker rebuild instructions
.\deploy-to-nas.ps1 -Rebuild
```

**Linux/macOS/WSL (Bash):**
```bash
# Basic deployment (sync files only)
./deploy-to-nas.sh

# Deploy and restart containers via SSH
./deploy-to-nas.sh --restart --ssh

# Deploy and rebuild containers via SSH
./deploy-to-nas.sh --rebuild --ssh
```

### 4. Start Docker Containers on NAS

**Option A: Via SSH**
```bash
# SSH to your NAS
ssh admin@your-nas-ip

# Navigate to project directory
cd /volume1/docker/cwg-recipes

# Start containers
sudo docker-compose up -d

# View logs
sudo docker-compose logs -f
```

**Option B: Via Synology DSM Web Interface**
1. Open Docker app in DSM
2. Go to "Container" tab
3. You should see three containers starting:
   - cwg-recipes-frontend
   - cwg-recipes-backend
   - cwg-recipes-db
4. Click on each to view logs and status

### 5. Access Your Application

Once deployed and running:
- **Local Network:** `http://your-nas-ip`
- **With Reverse Proxy:** Configure in DSM (see below)

## Workflow: Making Changes and Deploying

```powershell
# 1. Make changes to your code locally
# 2. Test locally
npm run dev  # In both frontend/ and backend/

# 3. Commit your changes (optional)
git add .
git commit -m "Add new feature"

# 4. Deploy to NAS
.\deploy-to-nas.ps1

# 5. Restart containers on NAS (via SSH or DSM)
ssh admin@nas "cd /volume1/docker/cwg-recipes && sudo docker-compose restart"
```

## Setting Up Reverse Proxy (HTTPS)

To access your app via a custom domain with HTTPS:

1. **Get a Domain Name**
   - Use a free DDNS service (Synology DDNS, DuckDNS, etc.)
   - Or use your own domain

2. **Configure Synology Reverse Proxy**
   - Open DSM → Control Panel → Application Portal → Reverse Proxy
   - Click "Create"
   - Configure:
     - Description: `CWG Recipes`
     - Source:
       - Protocol: HTTPS
       - Hostname: `recipes.yourdomain.com`
       - Port: 443
     - Destination:
       - Protocol: HTTP
       - Hostname: localhost
       - Port: 80
   - Save

3. **Get SSL Certificate**
   - DSM → Control Panel → Security → Certificate
   - Add certificate via Let's Encrypt
   - Assign certificate to reverse proxy

4. **Update .env on NAS**
   ```env
   FRONTEND_URL=https://recipes.yourdomain.com
   ```

5. **Restart containers**

## Troubleshooting

### "Cannot access NAS" Error

**Windows:**
```powershell
# Test NAS connectivity
Test-Path \\YOUR_NAS\docker

# Map network drive
net use Z: \\YOUR_NAS\docker /persistent:yes
```

**Linux/WSL:**
```bash
# Mount SMB share
sudo mkdir -p /mnt/nas
sudo mount -t cifs //YOUR_NAS/docker /mnt/nas -o username=admin

# Update deploy script to use /mnt/nas
```

### Containers Not Starting

```bash
# SSH to NAS
ssh admin@nas

# Check container logs
sudo docker-compose -f /volume1/docker/cwg-recipes/docker-compose.yml logs

# Check if .env exists
ls -la /volume1/docker/cwg-recipes/.env

# Restart containers
cd /volume1/docker/cwg-recipes
sudo docker-compose down
sudo docker-compose up -d
```

### Database Migration Issues

```bash
# SSH to NAS
ssh admin@nas

# Enter backend container
sudo docker exec -it cwg-recipes-backend sh

# Run migrations manually
npx prisma migrate deploy

# Exit container
exit
```

### Port Already in Use

```bash
# SSH to NAS
ssh admin@nas

# Check what's using port 80
sudo netstat -tulpn | grep :80

# Change docker-compose.yml to use different port
# Edit: ports: - "8080:80"
```

## Advanced Deployment Options

### Automated Deployment with Git Hooks

Create `.git/hooks/post-commit`:
```bash
#!/bin/bash
# Auto-deploy after commit
./deploy-to-nas.sh --restart --ssh
```

### Scheduled Backups

Create a backup script on NAS:
```bash
#!/bin/bash
# /volume1/scripts/backup-recipes.sh

cd /volume1/docker/cwg-recipes
tar -czf "/volume1/backups/recipes-$(date +%Y%m%d).tar.gz" \
    --exclude='node_modules' \
    --exclude='postgres-data' \
    .
```

Add to DSM Task Scheduler (weekly).

## Production Checklist

Before going live:

- [ ] `.env` file created on NAS with production values
- [ ] Strong `JWT_SECRET` generated (32+ characters)
- [ ] Strong `POSTGRES_PASSWORD` set
- [ ] `NODE_ENV=production` in `.env`
- [ ] Reverse proxy configured with HTTPS
- [ ] Firewall rules configured
- [ ] Regular backups scheduled
- [ ] Monitoring set up (optional)
- [ ] First user account created
- [ ] Test all functionality

## Monitoring and Maintenance

### View Logs
```bash
# All containers
sudo docker-compose -f /volume1/docker/cwg-recipes/docker-compose.yml logs -f

# Specific container
sudo docker logs cwg-recipes-backend -f
```

### Database Backup
```bash
# Manual backup
sudo docker exec cwg-recipes-db pg_dump -U recipes_user recipes_db > backup.sql

# Restore
sudo docker exec -i cwg-recipes-db psql -U recipes_user recipes_db < backup.sql
```

### Update Dependencies
```bash
# Locally
cd backend && npm update
cd ../frontend && npm update

# Test locally
npm run dev

# Deploy to NAS
./deploy-to-nas.ps1 -Rebuild
```

## Security Recommendations

1. **Change default ports** in docker-compose.yml
2. **Enable 2FA** on NAS admin account
3. **Use strong passwords** everywhere
4. **Enable HTTPS** via reverse proxy
5. **Regular updates** of dependencies
6. **Regular backups** of database
7. **Firewall rules** to restrict access
8. **Monitor logs** for suspicious activity

## Support

For issues:
1. Check logs: `docker-compose logs`
2. Review [README.md](README.md)
3. Review [SECURITY.md](SECURITY.md)
4. Check Synology DSM Docker logs
5. Open GitHub issue

---

**Happy Deploying! 🚀**
