#!/bin/bash

# FlowVision AI Service Health Check
# Following @.cursorrules V2.0 - AI Service Optimization

echo "🤖 FlowVision AI Service Health Check"
echo "====================================="
echo ""

HEALTH_STATUS=0 # 0 for healthy, 1 for unhealthy

# Check OpenAI API connectivity
echo "🔗 Testing OpenAI API Connectivity..."
echo "------------------------------------"

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OpenAI API key not configured"
    HEALTH_STATUS=1
else
    # Test API connectivity with a simple request
    RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/openai_test.json \
        -H "Authorization: Bearer $OPENAI_API_KEY" \
        -H "Content-Type: application/json" \
        "https://api.openai.com/v1/models" 2>/dev/null)
    
    HTTP_CODE="${RESPONSE: -3}"
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ OpenAI API connectivity successful"
        
        # Check available models
        if command -v jq &> /dev/null; then
            MODELS=$(jq -r '.data[].id' /tmp/openai_test.json 2>/dev/null | grep "gpt-" | head -3)
            echo "✅ Available models: $(echo $MODELS | tr '\n' ', ' | sed 's/,$//')"
        fi
    elif [ "$HTTP_CODE" = "401" ]; then
        echo "❌ OpenAI API authentication failed (invalid API key)"
        HEALTH_STATUS=1
    elif [ "$HTTP_CODE" = "429" ]; then
        echo "⚠️  OpenAI API rate limit reached"
        echo "   This is expected during high usage - service will recover"
    else
        echo "❌ OpenAI API connectivity failed (HTTP $HTTP_CODE)"
        HEALTH_STATUS=1
    fi
    
    # Clean up temp file
    rm -f /tmp/openai_test.json
fi

# Check AI service configuration
echo ""
echo "⚙️  Checking AI Service Configuration..."
echo "--------------------------------------"

# Check if AI configuration is properly set up
node -e "
const fs = require('fs');
const path = require('path');

// Check if AI service files exist
const aiFiles = [
    'lib/ai/MultiModelService.ts',
    'lib/ai-config-loader.ts',
    'lib/ai-service-monitor.ts'
];

let allFilesExist = true;
aiFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log('✅ ' + file + ' exists');
    } else {
        console.log('❌ ' + file + ' missing');
        allFilesExist = false;
    }
});

process.exit(allFilesExist ? 0 : 1);
" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ AI service files are present"
else
    echo "❌ AI service files are missing"
    HEALTH_STATUS=1
fi

# Check rate limiting configuration
echo ""
echo "🚦 Checking Rate Limiting Configuration..."
echo "-----------------------------------------"

# Check if rate limiting is implemented
if grep -r "rate.limit\|exponential.backoff\|429" lib/ai/ app/api/ --include="*.ts" >/dev/null 2>&1; then
    echo "✅ Rate limiting patterns found in code"
else
    echo "⚠️  Rate limiting patterns not found - implement for production"
fi

# Check error handling
echo ""
echo "🛡️  Checking Error Handling..."
echo "------------------------------"

# Check for proper error handling patterns
if grep -r "try.*catch\|\.catch\|APIError" lib/ai/ app/api/ --include="*.ts" >/dev/null 2>&1; then
    echo "✅ Error handling patterns found"
else
    echo "❌ Error handling patterns missing"
    HEALTH_STATUS=1
fi

# Check for user-friendly error messages
if grep -r "user.friendly\|fallback\|alternative" lib/ai/ app/api/ --include="*.ts" >/dev/null 2>&1; then
    echo "✅ User-friendly error patterns found"
else
    echo "⚠️  Consider adding more user-friendly error messages"
fi

# Check logging implementation
echo ""
echo "📝 Checking Logging Implementation..."
echo "------------------------------------"

if grep -r "console.error\|logger\|audit" lib/ai/ app/api/ --include="*.ts" >/dev/null 2>&1; then
    echo "✅ Logging patterns found"
else
    echo "❌ Logging patterns missing"
    HEALTH_STATUS=1
fi

# Performance checks
echo ""
echo "⚡ Performance Optimization Checks..."
echo "------------------------------------"

# Check for caching
if grep -r "cache\|redis\|memoiz" lib/ai/ --include="*.ts" >/dev/null 2>&1; then
    echo "✅ Caching patterns found"
else
    echo "⚠️  Consider implementing caching for AI responses"
fi

# Check for timeout handling
if grep -r "timeout\|AbortController" lib/ai/ app/api/ --include="*.ts" >/dev/null 2>&1; then
    echo "✅ Timeout handling found"
else
    echo "⚠️  Consider implementing request timeouts"
fi

# Summary
echo ""
echo "📊 AI Service Health Summary"
echo "============================"
if [ "$HEALTH_STATUS" -eq 0 ]; then
    echo "🎉 AI services are healthy and ready!"
    echo ""
    echo "✅ All critical components operational"
    echo "✅ API connectivity confirmed"
    echo "✅ Error handling in place"
    echo "✅ Logging configured"
    echo ""
    echo "🚀 Ready for AI-powered features"
else
    echo "💥 AI service health check FAILED"
    echo "❌ Fix issues before using AI features"
    echo ""
    echo "📋 Common fixes:"
    echo "  1. Verify OpenAI API key is valid and active"
    echo "  2. Check network connectivity to OpenAI"
    echo "  3. Implement proper error handling"
    echo "  4. Add structured logging"
    echo "  5. Test with low-rate API calls first"
    echo ""
    echo "📖 See docs/development/OPTIMIZED_DEVELOPMENT_RULES_V2.md"
fi

echo ""
echo "💡 Pro Tips:"
echo "  - Monitor API usage to avoid rate limits"
echo "  - Implement exponential backoff for retries"
echo "  - Cache responses when appropriate"
echo "  - Always provide fallback options"
echo "  - Log errors with full context for debugging"

exit $HEALTH_STATUS
