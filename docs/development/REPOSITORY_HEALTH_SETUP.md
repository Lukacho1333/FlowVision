# 🏥 FlowVision Repository Health Setup Guide

## 🎯 Purpose

This guide ensures all developers maintain the same high standards for code quality, testing, and repository hygiene as mandated by our updated `.cursorrules`.

## 🚨 Critical Environment Variables

Before any development work, ensure these environment variables are configured:

```bash
# Database Configuration
export DATABASE_URL="postgresql://username:password@localhost:5432/flowvision"

# AI Services
export OPENAI_API_KEY="your-openai-api-key-here"
export AI_CONFIG_ENCRYPTION_KEY="your-32-character-encryption-key"

# Optional but recommended
export NEXTAUTH_SECRET="your-nextauth-secret"
export NEXTAUTH_URL="http://localhost:3000"
```

### Setting Up Environment Variables

1. **Create `.env.local` file:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

2. **Verify environment setup:**
   ```bash
   npm run health-check
   ```

## 🔧 Development Setup Checklist

### Initial Setup
```bash
# 1. Install dependencies
npm install

# 2. Set up database
docker-compose up -d postgres
npx prisma migrate dev
npx prisma generate

# 3. Run health check
npm run health-check

# 4. Start development server
npm run dev
```

### Daily Development Workflow

#### Before Starting Work
```bash
# 1. Pull latest changes
git pull origin main

# 2. Run health check
npm run health-check

# 3. Create feature branch
git checkout -b feature/your-feature-name
```

#### Before Committing
```bash
# 1. Run full validation
npm run validate

# 2. Fix any issues found
# 3. Commit (pre-commit hooks will run automatically)
git add .
git commit -m "feat(scope): your commit message"
```

#### Before Creating PR
```bash
# 1. Final health check
npm run health-check

# 2. Push branch
git push origin feature/your-feature-name

# 3. Create PR
gh pr create --title "feat(scope): PR title" --body "Description"
```

## 📊 Quality Gates

### Zero Tolerance Thresholds
- **TypeScript Errors**: 0 in main branch
- **Test Failures**: 0 allowed
- **Lint Errors**: 0 allowed  
- **Build Failures**: 0 allowed
- **Missing Environment Variables**: Not allowed

### Validation Commands

```bash
# Quick validation
npm run validate

# Comprehensive health check
npm run health-check

# Individual checks
npx tsc --noEmit        # TypeScript
npm run lint            # ESLint + Prettier
npm test               # Jest tests
npm run build          # Next.js build
npx prisma validate    # Schema validation
```

## 🚫 Forbidden Actions

### NEVER DO THESE:
- ❌ Commit directly to main branch
- ❌ Use `--no-verify` flag to bypass checks
- ❌ Merge PR with failing CI/CD checks
- ❌ Push code with TypeScript errors
- ❌ Ignore test failures
- ❌ Skip environment variable setup

### ALWAYS DO THESE:
- ✅ Create feature branches for all changes
- ✅ Run `npm run health-check` before committing
- ✅ Fix all TypeScript errors before PR
- ✅ Ensure all tests pass
- ✅ Configure environment variables properly

## 🔍 Troubleshooting Common Issues

### TypeScript Errors
```bash
# Check errors
npx tsc --noEmit

# Common fixes
npm install                    # Missing dependencies
npx prisma generate           # Regenerate Prisma types
rm -rf .next && npm run build # Clear cache
```

### Test Failures
```bash
# Run tests with verbose output
npm test -- --verbose

# Common fixes
export AI_CONFIG_ENCRYPTION_KEY="test-key-32-characters-long"
export DATABASE_URL="postgresql://test:test@localhost:5432/test"
npm install
```

### Build Failures
```bash
# Clear all caches
rm -rf .next node_modules/.cache
npm install
npm run build
```

### Environment Issues
```bash
# Check current environment
env | grep -E "(DATABASE_URL|OPENAI_API_KEY|AI_CONFIG)"

# Set up test environment
cp .env.example .env.local
# Edit .env.local with proper values
```

## 📋 Repository Health Monitoring

### Daily Commands
```bash
# Check repository health
npm run health-check

# Review open PRs
gh pr list --state=open

# Clean up merged branches
git branch --merged main | grep -v main | xargs -n 1 git branch -d
```

### Weekly Maintenance
```bash
# Security audit
npm audit

# Update dependencies
npm outdated
npm update

# Database health
npx prisma validate
docker-compose ps
```

## 🆘 Emergency Procedures

### If Repository Health Fails
1. **Stop all development work**
2. **Run diagnostic commands:**
   ```bash
   npm run health-check
   npx tsc --noEmit
   npm test
   npm run lint
   ```
3. **Fix issues systematically**
4. **Re-run health check**
5. **Only proceed when all checks pass**

### If CI/CD Fails
1. **Never bypass with `--no-verify`**
2. **Pull latest changes**: `git pull origin main`
3. **Fix issues locally**: Use validation commands above
4. **Test thoroughly**: `npm run validate`
5. **Push clean code**: All checks must pass

## 📚 Additional Resources

- [TypeScript Configuration](./TYPESCRIPT_SETUP.md)
- [Testing Guidelines](./TESTING_GUIDE.md)
- [Environment Variables](./ENVIRONMENT_SETUP.md)
- [CI/CD Pipeline](./CICD_SETUP.md)

## 🎯 Success Metrics

Your repository is healthy when:
- ✅ `npm run health-check` passes
- ✅ All TypeScript errors resolved
- ✅ All tests passing
- ✅ No lint errors
- ✅ Build completes successfully
- ✅ Environment variables configured
- ✅ Pre-commit hooks working

---

**Remember: These standards ensure professional, scalable, and reliable development practices. No exceptions.**
