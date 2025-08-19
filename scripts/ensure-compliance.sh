#!/bin/bash

# FlowVision Compliance Enforcement Script
# Following @.cursorrules V2.0 - Systematic Rule Enforcement

echo "🎯 FlowVision Compliance Enforcement"
echo "===================================="
echo ""

COMPLIANCE_STATUS=0 # 0 for compliant, 1 for non-compliant

# Function to display section header
section_header() {
    echo ""
    echo "📋 $1"
    echo "$(printf '%.0s-' $(seq 1 ${#1}))"
}

# Function to check command success
check_command() {
    local cmd="$1"
    local description="$2"
    
    echo "ℹ️  Checking: $description..."
    if eval "$cmd" >/dev/null 2>&1; then
        echo "✅ $description: PASSED"
        return 0
    else
        echo "❌ $description: FAILED"
        COMPLIANCE_STATUS=1
        return 1
    fi
}

section_header "Phase 1: Pre-Work Validation"

# Check if .cursorrules exists and is current
if [ -f ".cursorrules" ]; then
    echo "✅ .cursorrules file exists"
    
    # Check for V2.0 indicators
    if grep -q "V2.0\|ENHANCED\|AI/LLM Integration - ENHANCED" .cursorrules; then
        echo "✅ .cursorrules contains V2.0 enhancements"
    else
        echo "⚠️  .cursorrules may not be V2.0 - check for latest optimizations"
    fi
else
    echo "❌ .cursorrules file missing"
    COMPLIANCE_STATUS=1
fi

# Check for optimization documentation
if [ -f "docs/development/OPTIMIZED_DEVELOPMENT_RULES_V2.md" ]; then
    echo "✅ V2.0 optimization documentation exists"
else
    echo "❌ V2.0 optimization documentation missing"
    COMPLIANCE_STATUS=1
fi

section_header "Phase 2: Environment Compliance"

# Run environment validation
echo "ℹ️  Running environment validation..."
if npm run env-check >/dev/null 2>&1; then
    echo "✅ Environment validation: PASSED"
else
    echo "❌ Environment validation: FAILED"
    echo "   Run: npm run env-check for details"
    COMPLIANCE_STATUS=1
fi

section_header "Phase 3: AI Service Compliance"

# Check AI service patterns
echo "ℹ️  Checking AI service compliance patterns..."

# Rate limiting patterns
if grep -r "exponential.*backoff\|429\|rate.limit" lib/ai/ app/api/ --include="*.ts" >/dev/null 2>&1; then
    echo "✅ Rate limiting patterns found"
else
    echo "❌ Rate limiting patterns missing"
    echo "   Required: Exponential backoff for 429 errors"
    COMPLIANCE_STATUS=1
fi

# User-friendly error patterns
if grep -r "user.friendly\|fallback\|alternative" lib/ai/ app/api/ --include="*.ts" >/dev/null 2>&1; then
    echo "✅ User-friendly error patterns found"
else
    echo "❌ User-friendly error patterns missing"
    echo "   Required: No raw API errors exposed to users"
    COMPLIANCE_STATUS=1
fi

# Circuit breaker patterns
if grep -r "circuit.breaker\|service.unavailable\|timeout" lib/ai/ app/api/ --include="*.ts" >/dev/null 2>&1; then
    echo "✅ Circuit breaker patterns found"
else
    echo "⚠️  Consider implementing circuit breaker patterns"
fi

section_header "Phase 4: Code Quality Compliance"

# TypeScript compliance (focus on our code)
echo "ℹ️  Checking TypeScript compliance (app/, lib/, components/)..."
TS_ERRORS_OUR_CODE=$(npx tsc --noEmit 2>&1 | grep -E "(app/|lib/|components/)" | grep -c "error TS" || echo "0")

if [ "$TS_ERRORS_OUR_CODE" -eq 0 ]; then
    echo "✅ TypeScript compliance: PASSED (0 errors in our code)"
else
    echo "❌ TypeScript compliance: FAILED ($TS_ERRORS_OUR_CODE errors in our code)"
    echo "   Focus on: app/, lib/, components/ directories only"
    COMPLIANCE_STATUS=1
fi

# Pre-commit hook compliance
if [ -f ".husky/pre-commit" ]; then
    if grep -q "validate-repository-health" .husky/pre-commit; then
        echo "✅ Pre-commit hooks configured with validation"
    else
        echo "⚠️  Pre-commit hooks may not include health validation"
    fi
else
    echo "❌ Pre-commit hooks not configured"
    COMPLIANCE_STATUS=1
fi

section_header "Phase 5: Process Compliance"

# Check for required scripts
REQUIRED_SCRIPTS=(
    "health-check"
    "env-check" 
    "ai-health"
    "dev-setup"
    "full-health"
)

echo "ℹ️  Checking required npm scripts..."
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if npm run | grep -q "$script"; then
        echo "✅ npm run $script available"
    else
        echo "❌ npm run $script missing"
        COMPLIANCE_STATUS=1
    fi
done

# Check for documentation compliance
section_header "Phase 6: Documentation Compliance"

REQUIRED_DOCS=(
    "docs/development/OPTIMIZED_DEVELOPMENT_RULES_V2.md"
    "docs/development/PROCESS_OPTIMIZATION_IMPLEMENTATION.md"
    "docs/development/RULES_OPTIMIZATION_SUMMARY.md"
)

echo "ℹ️  Checking required documentation..."
for doc in "${REQUIRED_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo "✅ $doc exists"
    else
        echo "❌ $doc missing"
        COMPLIANCE_STATUS=1
    fi
done

# Summary and recommendations
section_header "Compliance Summary"

if [ "$COMPLIANCE_STATUS" -eq 0 ]; then
    echo "🎉 FULL COMPLIANCE ACHIEVED!"
    echo ""
    echo "✅ All .cursorrules V2.0 requirements met"
    echo "✅ Environment properly configured"
    echo "✅ AI service patterns implemented"
    echo "✅ Code quality standards enforced"
    echo "✅ Process automation in place"
    echo "✅ Documentation complete"
    echo ""
    echo "🚀 Ready for development with full rule enforcement"
else
    echo "💥 COMPLIANCE VIOLATIONS DETECTED"
    echo "❌ Fix issues above before proceeding"
    echo ""
    echo "📋 Quick Compliance Actions:"
    echo "  1. Run: npm run dev-setup"
    echo "  2. Fix TypeScript errors in app/, lib/, components/"
    echo "  3. Implement AI service error handling patterns"
    echo "  4. Update pre-commit hooks with validation"
    echo "  5. Ensure all required documentation exists"
    echo ""
    echo "📖 Reference: docs/development/OPTIMIZED_DEVELOPMENT_RULES_V2.md"
fi

echo ""
echo "🎯 Compliance Enforcement Complete"
echo "=================================="

# Provide actionable next steps
if [ "$COMPLIANCE_STATUS" -eq 0 ]; then
    echo ""
    echo "💡 Recommended Development Workflow:"
    echo "  1. npm run dev-setup     # Before starting work"
    echo "  2. [Do your development work]"
    echo "  3. npm run full-health   # Before committing"
    echo "  4. git add . && git commit -m '...' # Commit with validation"
else
    echo ""
    echo "🔧 Required Actions Before Development:"
    echo "  1. Fix compliance violations above"
    echo "  2. Re-run: ./scripts/ensure-compliance.sh"
    echo "  3. Proceed only when compliance achieved"
fi

exit $COMPLIANCE_STATUS
