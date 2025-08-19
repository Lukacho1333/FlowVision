#!/bin/bash

# FlowVision Repository Health Validation Script
# Following @.cursorrules - MANDATORY validation before any commits

set -e

echo "🔍 FlowVision Repository Health Validation"
echo "=========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track validation results
VALIDATION_FAILED=0

# Function to print status
print_status() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        VALIDATION_FAILED=1
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo ""
echo "📋 Checking Pre-commit Requirements..."
echo "------------------------------------"

# 1. Check Git Status
print_info "Checking git status..."
if git diff --quiet && git diff --staged --quiet; then
    print_status "Git working directory is clean" 0
else
    print_warning "Git working directory has uncommitted changes"
fi

# 2. Check TypeScript Errors
print_info "Checking TypeScript errors..."
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || true)
if [ "$TS_ERRORS" -eq 0 ]; then
    print_status "TypeScript validation passed (0 errors)" 0
else
    print_status "TypeScript validation failed ($TS_ERRORS errors)" 1
    echo -e "${RED}   Run: npx tsc --noEmit to see details${NC}"
fi

# 3. Check Linting
print_info "Checking ESLint..."
if npm run lint > /dev/null 2>&1; then
    print_status "ESLint validation passed" 0
else
    print_status "ESLint validation failed" 1
    echo -e "${RED}   Run: npm run lint to see details${NC}"
fi

# 4. Check Tests
print_info "Checking test suite..."
if npm test > /dev/null 2>&1; then
    print_status "Test suite passed" 0
else
    print_status "Test suite failed" 1
    echo -e "${RED}   Run: npm test to see details${NC}"
fi

# 5. Check Build
print_info "Checking build..."
if npm run build > /dev/null 2>&1; then
    print_status "Build validation passed" 0
else
    print_status "Build validation failed" 1
    echo -e "${RED}   Run: npm run build to see details${NC}"
fi

# 6. Check Environment Variables
print_info "Checking critical environment variables..."
ENV_MISSING=0

if [ -z "$DATABASE_URL" ]; then
    print_warning "DATABASE_URL not set"
    ENV_MISSING=1
fi

if [ -z "$OPENAI_API_KEY" ]; then
    print_warning "OPENAI_API_KEY not set"
    ENV_MISSING=1
fi

if [ -z "$AI_CONFIG_ENCRYPTION_KEY" ]; then
    print_warning "AI_CONFIG_ENCRYPTION_KEY not set"
    ENV_MISSING=1
fi

if [ $ENV_MISSING -eq 0 ]; then
    print_status "Environment variables configured" 0
else
    print_status "Environment variables missing" 1
fi

# 7. Check Dependencies
print_info "Checking npm dependencies..."
if npm ls > /dev/null 2>&1; then
    print_status "Dependencies properly installed" 0
else
    print_status "Dependency issues detected" 1
    echo -e "${RED}   Run: npm install to fix dependencies${NC}"
fi

# 8. Check Prisma Schema (if exists)
if [ -f "prisma/schema.prisma" ]; then
    print_info "Validating Prisma schema..."
    if npx prisma validate > /dev/null 2>&1; then
        print_status "Prisma schema validation passed" 0
    else
        print_status "Prisma schema validation failed" 1
        echo -e "${RED}   Run: npx prisma validate to see details${NC}"
    fi
fi

# 9. Check for common issues
print_info "Checking for common issues..."

# Check for console.log in production code
CONSOLE_LOGS=$(find app lib components -name "*.ts" -o -name "*.tsx" | xargs grep -l "console\.log" 2>/dev/null | wc -l || true)
if [ "$CONSOLE_LOGS" -gt 0 ]; then
    print_warning "$CONSOLE_LOGS files contain console.log statements"
else
    print_status "No console.log statements in production code" 0
fi

# Check for TODO/FIXME comments
TODOS=$(find app lib components -name "*.ts" -o -name "*.tsx" | xargs grep -c "TODO\|FIXME" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}' || true)
if [ "$TODOS" -gt 0 ]; then
    print_warning "$TODOS TODO/FIXME comments found"
fi

echo ""
echo "📊 Repository Health Summary"
echo "============================"

if [ $VALIDATION_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Repository health validation PASSED${NC}"
    echo -e "${GREEN}✅ Ready for commit/PR creation${NC}"
    exit 0
else
    echo -e "${RED}💥 Repository health validation FAILED${NC}"
    echo -e "${RED}❌ Fix issues before committing${NC}"
    echo ""
    echo -e "${YELLOW}📋 Quick Fix Commands:${NC}"
    echo "  npm install                    # Fix dependencies"
    echo "  npx tsc --noEmit              # Check TypeScript errors"
    echo "  npm run lint                  # Check linting issues"
    echo "  npm test                      # Run test suite"
    echo "  npm run build                 # Validate build"
    echo "  npx prisma validate           # Check schema"
    echo ""
    echo -e "${YELLOW}🔧 Environment Setup:${NC}"
    echo "  export DATABASE_URL='your-db-url'"
    echo "  export OPENAI_API_KEY='your-key'"
    echo "  export AI_CONFIG_ENCRYPTION_KEY='your-key'"
    exit 1
fi
