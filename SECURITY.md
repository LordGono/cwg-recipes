# Security Guidelines

## Pre-Deployment Security Checklist

Before deploying CWG Recipes to production, complete this checklist:

### Environment Variables
- [ ] Change `JWT_SECRET` to a strong random value (min 32 characters)
  ```bash
  # Generate a secure secret
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Change `POSTGRES_PASSWORD` to a strong password (min 16 characters)
- [ ] Set `NODE_ENV=production`
- [ ] Update `FRONTEND_URL` to your production domain
- [ ] Update `VITE_API_URL` to your production API URL
- [ ] Verify `.env` is in `.gitignore` (never commit it!)

### Database Security
- [ ] Use strong PostgreSQL password
- [ ] Restrict database access to backend service only
- [ ] Enable SSL/TLS for database connections in production
- [ ] Regular database backups configured
- [ ] Run `npx prisma migrate deploy` (not `migrate dev`) in production

### Application Security
- [ ] Enable HTTPS (use reverse proxy with SSL certificate)
- [ ] Update CORS to allow only your production domain
- [ ] Review and adjust rate limiting settings
- [ ] Disable debug mode and verbose logging in production
- [ ] Set secure cookie flags if using sessions
- [ ] Configure Content Security Policy (CSP) headers

### Docker Security
- [ ] Don't run containers as root
- [ ] Use specific image versions (not `latest`)
- [ ] Scan images for vulnerabilities
- [ ] Limit container resources (CPU, memory)
- [ ] Use Docker secrets instead of environment variables for sensitive data
- [ ] Keep Docker and docker-compose updated

### Network Security
- [ ] Use firewall rules to restrict access
- [ ] Close unnecessary ports
- [ ] Use reverse proxy (nginx/traefik) with SSL
- [ ] Configure fail2ban or similar for brute force protection
- [ ] Enable DDoS protection if available

### Code Security
- [ ] Run `npm audit` in both frontend and backend
- [ ] Update all dependencies to latest secure versions
- [ ] Remove any debug code or console.logs
- [ ] No hardcoded secrets in code
- [ ] Input validation on all endpoints enabled

### Monitoring & Maintenance
- [ ] Set up error logging and monitoring
- [ ] Configure automated backups
- [ ] Enable container health checks
- [ ] Set up alerts for failed health checks
- [ ] Plan for regular security updates

## Security Features Implemented

### Authentication & Authorization
✅ JWT-based authentication with configurable expiration
✅ bcrypt password hashing (10 salt rounds)
✅ Password strength requirements enforced
✅ Token-based authorization on protected routes
✅ Ownership checks for recipe modifications

### Input Validation
✅ express-validator on all API endpoints
✅ Type validation via TypeScript
✅ SQL injection protection via Prisma ORM
✅ XSS protection via sanitized inputs

### Network Security
✅ CORS configured to specific origin
✅ Rate limiting on authentication endpoints (5 req/15min)
✅ Helmet.js security headers
✅ HTTPS-ready nginx configuration

### Data Protection
✅ Environment variables for sensitive data
✅ .gitignore prevents secret leakage
✅ Passwords never logged or exposed
✅ Database credentials isolated in environment

## Common Security Mistakes to Avoid

### ❌ DON'T:
- Commit `.env` files to Git
- Use default/weak JWT_SECRET in production
- Expose database ports to public internet
- Run containers as root user
- Use `migrate dev` in production (use `migrate deploy`)
- Store passwords in plain text
- Disable CORS in production
- Skip input validation
- Use `latest` tags for Docker images
- Ignore dependency vulnerabilities

### ✅ DO:
- Use strong, unique secrets for each environment
- Enable HTTPS in production
- Regular security updates
- Monitor logs for suspicious activity
- Use prepared statements (Prisma does this)
- Validate and sanitize all inputs
- Keep dependencies updated
- Use specific Docker image versions
- Regular database backups
- Security audits before major releases

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please:

1. **Do NOT** open a public GitHub issue
2. Email security concerns to the repository owner
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We take security seriously and will respond promptly to verified reports.

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [Prisma Security](https://www.prisma.io/docs/concepts/components/prisma-client/deployment#security)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## License

This security documentation is part of the CWG Recipes project and is licensed under MIT.
