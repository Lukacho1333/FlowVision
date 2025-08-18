# FlowVision Deployment Guide

This guide covers deploying FlowVision to various hosting platforms with production-ready configurations.

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended)

Vercel provides the best experience for Next.js applications with automatic deployments and optimizations.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/flowvision)

**Manual Vercel Deployment:**

1. **Install Vercel CLI**

   ```bash
   npm i -g vercel
   ```

2. **Login and Deploy**

   ```bash
   vercel login
   vercel --prod
   ```

3. **Configure Environment Variables**
   ```bash
   vercel env add DATABASE_URL
   vercel env add NEXTAUTH_SECRET
   vercel env add NEXTAUTH_URL
   ```

### Option 2: Netlify

1. **Connect your repository** to Netlify
2. **Set build command**: `npm run build`
3. **Set publish directory**: `.next`
4. **Configure environment variables** in Netlify dashboard

### Option 3: Railway

1. **Connect GitHub repository** to Railway
2. **Add PostgreSQL service**
3. **Configure environment variables**
4. **Deploy automatically** on push

## 📋 Pre-Deployment Checklist

### Environment Setup

- [ ] PostgreSQL database configured
- [ ] Environment variables set
- [ ] Domain/subdomain configured
- [ ] SSL certificate configured
- [ ] Backup strategy in place

### Security Configuration

- [ ] `NEXTAUTH_SECRET` is strong (32+ characters)
- [ ] Database credentials are secure
- [ ] Admin account credentials are changed
- [ ] File upload directory is secured
- [ ] CORS settings are configured

### Performance Optimization

- [ ] Database indexes are optimized
- [ ] Image optimization is enabled
- [ ] Caching headers are configured
- [ ] CDN is set up (if needed)
- [ ] Bundle size is optimized

## 🔧 Environment Variables

### Required Variables

```env
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-minimum-32-characters"
NEXTAUTH_URL="https://your-domain.com"

# Admin Configuration
SEED_ADMIN_EMAIL="admin@yourdomain.com"
SEED_ADMIN_PASSWORD="SecurePassword123!"
```

### Optional Variables

```env
# OpenAI (for AI features)
OPENAI_API_KEY="sk-your-openai-api-key"

# Email Configuration
EMAIL_SERVER_HOST="smtp.yourdomain.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="noreply@yourdomain.com"
EMAIL_SERVER_PASSWORD="email-password"
EMAIL_FROM="noreply@yourdomain.com"

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="flowvision-uploads"

# Analytics
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

## 🗄️ Database Setup

### PostgreSQL Setup

1. **Create Database**

   ```sql
   CREATE DATABASE flowvision;
   CREATE USER flowvision_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE flowvision TO flowvision_user;
   ```

2. **Run Migrations**

   ```bash
   npx prisma migrate deploy
   ```

3. **Seed Initial Data**
   ```bash
   npx prisma db seed
   ```

### Database Providers

#### Neon (Recommended for Vercel)

- Serverless PostgreSQL
- Automatic scaling
- Built-in connection pooling

#### PlanetScale

- MySQL-compatible
- Branching for database schemas
- Global distribution

#### Railway PostgreSQL

- Simple setup
- Automatic backups
- Built-in monitoring

## 🌐 Domain Configuration

### Custom Domain Setup

1. **Add domain** to your hosting platform
2. **Configure DNS records**:
   ```
   CNAME www your-app.vercel.app
   A @ your-app-ip-address
   ```
3. **Enable SSL certificate** (automatic on most platforms)
4. **Update NEXTAUTH_URL** environment variable

### SSL Configuration

Most hosting platforms provide automatic SSL certificates. For custom setups:

1. **Obtain SSL certificate** (Let's Encrypt recommended)
2. **Configure web server** (Nginx/Apache)
3. **Set up certificate auto-renewal**

## 📊 Monitoring & Analytics

### Application Monitoring

**Vercel Analytics**:

```bash
npm install @vercel/analytics
```

**Google Analytics**:

```env
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

### Error Tracking

**Sentry Integration**:

```bash
npm install @sentry/nextjs
```

### Database Monitoring

- **Prisma Metrics**: Built-in query performance monitoring
- **Database Provider Tools**: Use provider-specific monitoring
- **Custom Health Checks**: Monitor database connectivity

## 🔒 Security Hardening

### Production Security

1. **Environment Variables**
   - Never commit secrets to repository
   - Use strong, unique passwords
   - Rotate credentials regularly

2. **Database Security**
   - Enable SSL connections
   - Use connection pooling
   - Implement backup encryption

3. **Application Security**
   - Enable security headers
   - Configure CORS properly
   - Implement rate limiting
   - Use HTTPS only

### Security Headers

FlowVision includes security headers by default:

```javascript
{
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}
```

## 📈 Scaling Considerations

### Performance Optimization

1. **Database Optimization**
   - Add appropriate indexes
   - Use connection pooling
   - Implement query optimization

2. **Caching Strategy**
   - Redis for session storage
   - CDN for static assets
   - Application-level caching

3. **File Storage**
   - Use cloud storage (AWS S3, Cloudinary)
   - Implement file compression
   - Set up CDN for uploads

### Load Balancing

For high-traffic deployments:

1. **Multiple App Instances**
2. **Database Read Replicas**
3. **CDN Configuration**
4. **Health Check Endpoints**

## 🔄 CI/CD Pipeline

### GitHub Actions (Included)

The repository includes comprehensive CI/CD workflows:

- **Automated Testing**: Unit, integration, and E2E tests
- **Security Scanning**: Dependency audits and code analysis
- **Build Verification**: Ensure deployable builds
- **Deployment**: Automatic staging and production deployments

### Required Secrets

Configure these secrets in your GitHub repository:

```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
DATABASE_URL
NEXTAUTH_SECRET
```

## 🚨 Troubleshooting

### Common Issues

**Build Failures**:

- Check Node.js version compatibility
- Verify all environment variables are set
- Review build logs for specific errors

**Database Connection Issues**:

- Verify DATABASE_URL format
- Check database server accessibility
- Ensure SSL configuration if required

**Authentication Problems**:

- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches deployed domain
- Ensure callback URLs are configured

### Health Checks

FlowVision includes a health check endpoint:

```
GET /api/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

## 📞 Support

For deployment support:

- **GitHub Issues**: Technical problems
- **GitHub Discussions**: General questions
- **Documentation**: Additional guides
- **Email**: support@flowvision.app

## 📚 Additional Resources

- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Prisma Deployment**: https://www.prisma.io/docs/guides/deployment
- **Vercel Documentation**: https://vercel.com/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
