#!/bin/bash

# FlowVision Environment Validation Script
# Following @.cursorrules V2.0 - Enhanced Environment Management

echo "🔧 FlowVision Environment Validation"
echo "===================================="
echo ""

VALIDATION_STATUS=0 # 0 for valid, 1 for invalid

# Check critical environment variables
echo "📋 Checking Critical Environment Variables..."
echo "--------------------------------------------"

REQUIRED_VARS=(
    "DATABASE_URL"
    "OPENAI_API_KEY"
    "AI_CONFIG_ENCRYPTION_KEY"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ $var is not set"
        VALIDATION_STATUS=1
    else
        echo "✅ $var is configured"
    fi
done

# Check .env.local file
echo ""
echo "📄 Checking .env.local file..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local file exists"
    
    # Check if it contains the required variables
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" .env.local; then
            echo "✅ $var found in .env.local"
        else
            echo "⚠️  $var not found in .env.local (using system environment)"
        fi
    done
else
    echo "⚠️  .env.local file not found"
    echo "   Create one using: cp .env.example .env.local"
fi

# Check Docker services
echo ""
echo "🐳 Checking Docker Services..."
echo "------------------------------"
if command -v docker-compose &> /dev/null; then
    if docker-compose ps | grep -q "Up"; then
        echo "✅ Docker services are running"
    else
        echo "❌ Docker services are not running"
        echo "   Start with: docker-compose up -d"
        VALIDATION_STATUS=1
    fi
else
    echo "⚠️  docker-compose not found"
fi

# Check OpenAI API key format
echo ""
echo "🤖 Validating OpenAI API Key..."
echo "-------------------------------"
if [ -n "$OPENAI_API_KEY" ]; then
    if [[ "$OPENAI_API_KEY" == sk-* ]]; then
        echo "✅ OpenAI API key format is valid"
    else
        echo "❌ OpenAI API key format is invalid (should start with 'sk-')"
        VALIDATION_STATUS=1
    fi
else
    echo "❌ OpenAI API key is not set"
    VALIDATION_STATUS=1
fi

# Check database connection
echo ""
echo "🗄️  Testing Database Connection..."
echo "----------------------------------"
if [ -n "$DATABASE_URL" ]; then
    # Simple connection test using Node.js
    node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.\$connect()
            .then(() => {
                console.log('✅ Database connection successful');
                process.exit(0);
            })
            .catch((error) => {
                console.log('❌ Database connection failed:', error.message);
                process.exit(1);
            });
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Database connection test passed"
    else
        echo "❌ Database connection test failed"
        VALIDATION_STATUS=1
    fi
else
    echo "❌ DATABASE_URL not configured"
    VALIDATION_STATUS=1
fi

# Summary
echo ""
echo "📊 Environment Validation Summary"
echo "================================="
if [ "$VALIDATION_STATUS" -eq 0 ]; then
    echo "🎉 Environment is properly configured!"
    echo ""
    echo "📋 Ready for development:"
    echo "  npm run dev      # Start development server"
    echo "  npm test         # Run test suite"
    echo "  npm run build    # Build for production"
else
    echo "💥 Environment validation FAILED"
    echo "❌ Fix issues before development"
    echo ""
    echo "📋 Quick Fix Guide:"
    echo "  1. Create .env.local file with required variables"
    echo "  2. Start Docker services: docker-compose up -d"
    echo "  3. Validate OpenAI API key format (starts with 'sk-')"
    echo "  4. Test database connection"
    echo "  5. Re-run: npm run env-check"
    echo ""
    echo "📖 See docs/development/REPOSITORY_HEALTH_SETUP.md for details"
fi

exit $VALIDATION_STATUS
