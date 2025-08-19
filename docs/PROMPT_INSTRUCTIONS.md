# 🎯 FLOWVISION PROMPT INSTRUCTIONS

**ATTACH THIS FILE TO EVERY PROMPT FOR SYSTEMATIC RULE ENFORCEMENT**

---

## 🚨 **MANDATORY PRE-WORK VALIDATION**

### **ALWAYS START WITH COMPLIANCE CHECK:**
```bash
npm run ensure-compliance      # MANDATORY - Must pass before proceeding
```

**❌ NEVER proceed if compliance check fails**
**✅ Only continue when full compliance achieved**

---

## 📋 **REQUIRED PROMPT FRAMEWORK**

### **Follow This Exact Structure:**
```
Following @.cursorrules V2.0, [your specific request].

MANDATORY Requirements:
- Rate limiting for OpenAI API calls (exponential backoff for 429 errors)
- User-friendly error messages (NO raw API errors exposed to users)
- Structured logging with context (requestId, userId, model)
- TypeScript compliance in app/, lib/, components/ directories ONLY
- Pre-commit validation must pass
- Follow emergency procedures from .cursorrules for any issues

Validation Steps:
1. Run: npm run ensure-compliance (before starting)
2. Test: npm run dev-setup (environment readiness)
3. Monitor: Follow emergency procedures for issues
4. Verify: npm run full-health (before completion)

Success Criteria:
- All compliance checks pass
- No TypeScript errors in our code (app/, lib/, components/)
- User-friendly error handling active
- Structured logging implemented
- AI services have proper rate limiting and fallbacks
```

---

## 🛡️ **SYSTEMATIC ENFORCEMENT RULES**

### **Code Quality Standards (ZERO TOLERANCE):**
- ✅ TypeScript errors: 0 allowed in app/, lib/, components/
- ✅ User-friendly errors: NO raw API errors to users
- ✅ Rate limiting: ALL AI API calls protected
- ✅ Structured logging: requestId, userId, context required
- ✅ Fallback systems: Required for ALL AI service failures
- ✅ Pre-commit hooks: Must pass validation

### **Emergency Procedures (MANDATORY):**
- **OpenAI Rate Limits (429)**: Implement exponential backoff + user-friendly message
- **AI Service Failures**: Activate fallback responses + log with full context
- **API Timeouts**: Implement circuit breakers + provide manual alternatives
- **Module not found errors**: Clear cache (`rm -rf .next`) + restart dev server
- **TypeScript errors >10**: Create separate cleanup PR before feature work
- **Missing dependencies**: Install and configure properly + document in PR

---

## 🎯 **VALIDATION COMMANDS**

### **Pre-Work (ALWAYS RUN):**
```bash
npm run ensure-compliance      # Complete rule validation
npm run dev-setup              # Environment + AI services check
```

### **During Work:**
```bash
npm run health-check           # Repository health monitoring
npm run ai-health              # AI service diagnostics
```

### **Pre-Completion:**
```bash
npm run full-health            # Complete system validation
```

---

## 🚨 **RED FLAGS - STOP IMMEDIATELY**

### **Compliance Violations:**
- ❌ `npm run ensure-compliance` fails
- ❌ Raw API errors shown to users
- ❌ Missing rate limiting on AI calls
- ❌ TypeScript errors in app/, lib/, components/
- ❌ Pre-commit hooks bypassed with `--no-verify`
- ❌ Missing structured logging with context
- ❌ No fallback systems for AI failures

### **Emergency Indicators:**
- ❌ 429 rate limit errors without exponential backoff
- ❌ "Objects are not valid as React child" errors
- ❌ Module not found webpack errors
- ❌ Database connection failures
- ❌ Environment variable errors

---

## ✅ **SUCCESS INDICATORS**

### **Full Compliance Achieved:**
- ✅ All validation scripts pass without errors
- ✅ User-friendly error handling throughout application
- ✅ Proper rate limiting with exponential backoff
- ✅ Structured logging with full context
- ✅ Circuit breakers for external service failures
- ✅ Fallback systems active for AI services
- ✅ Clean TypeScript compliance in our code
- ✅ Pre-commit hooks working with validation

### **Development Ready:**
- ✅ Environment properly configured
- ✅ AI services healthy (or proper fallbacks active)
- ✅ Database connections working
- ✅ Docker services running
- ✅ All quality gates operational

---

## 🛠️ **AI ASSISTANT INSTRUCTIONS**

### **MANDATORY AI Behaviors:**
1. **ALWAYS run `npm run ensure-compliance` before starting any work**
2. **NEVER proceed if compliance check fails**
3. **ALWAYS implement rate limiting for AI API calls**
4. **ALWAYS provide user-friendly error messages**
5. **ALWAYS use structured logging with context**
6. **ALWAYS implement fallback systems for AI failures**
7. **ALWAYS follow emergency procedures from .cursorrules**
8. **ALWAYS validate completion with `npm run full-health`**

### **Code Implementation Standards:**
- **Rate Limiting**: Exponential backoff for 429 errors
- **Error Handling**: User-friendly messages, no raw API errors
- **Logging**: Structured with requestId, userId, model context
- **Fallbacks**: Manual alternatives when AI services fail
- **TypeScript**: Fix errors in app/, lib/, components/ only
- **Testing**: Mock external APIs, ensure tests pass

### **Validation Requirements:**
- **Pre-work**: Compliance check must pass
- **During work**: Monitor logs for issues, follow emergency procedures
- **Post-work**: Full health check must pass
- **Documentation**: Update if new patterns emerge

---

## 📚 **REFERENCE DOCUMENTATION**

### **Primary References:**
- **`.cursorrules`**: Complete development rules (V2.0)
- **`docs/development/OPTIMIZED_DEVELOPMENT_RULES_V2.md`**: Enhanced guidelines
- **`docs/COMPLIANCE_QUICK_REFERENCE.md`**: Quick reference card

### **Validation Scripts:**
- **`scripts/ensure-compliance.sh`**: Complete compliance validation
- **`scripts/validate-repository-health.sh`**: Repository health
- **`scripts/validate-environment.sh`**: Environment validation
- **`scripts/ai-service-health-check.sh`**: AI service diagnostics

---

## 🎯 **PROMPT TEMPLATE EXAMPLE**

```
Following @.cursorrules V2.0, implement user authentication with rate limiting and proper error handling.

MANDATORY Requirements:
- Rate limiting for authentication API calls (exponential backoff for 429 errors)
- User-friendly error messages (NO raw API errors exposed)
- Structured logging with context (requestId, userId, operation)
- TypeScript compliance in app/, lib/, components/ only
- Fallback authentication methods if primary fails
- Pre-commit validation must pass

Validation Steps:
1. Run: npm run ensure-compliance (before starting)
2. Implement: Rate limiting + user-friendly errors + structured logging
3. Test: npm run dev-setup (environment validation)
4. Monitor: Follow emergency procedures for any issues
5. Verify: npm run full-health (complete validation)

Success Criteria:
- All compliance checks pass
- Authentication works with proper rate limiting
- User-friendly error messages for all failure scenarios
- Structured logging captures all authentication events
- Fallback systems active for service failures
- No TypeScript errors in our code directories
```

---

## 🏆 **SYSTEMATIC QUALITY ASSURANCE**

### **Before Every Prompt:**
1. **Attach this document** to your prompt
2. **Run compliance validation**: `npm run ensure-compliance`
3. **Fix any violations** before proceeding
4. **Include specific requirements** in your prompt

### **During Development:**
1. **Monitor compliance** continuously
2. **Follow emergency procedures** for any issues
3. **Implement required patterns** (rate limiting, error handling, logging)
4. **Test systematically** with validation scripts

### **Upon Completion:**
1. **Run full validation**: `npm run full-health`
2. **Verify all requirements** met
3. **Document any new patterns** discovered
4. **Confirm compliance** before considering complete

---

## 🎯 **FINAL CHECKLIST**

### **✅ COMPLIANT PROMPT:**
- [ ] This document attached to prompt
- [ ] Compliance validation run and passed
- [ ] Specific requirements included
- [ ] Emergency procedures referenced
- [ ] Success criteria defined
- [ ] Validation steps specified

### **✅ COMPLIANT COMPLETION:**
- [ ] All validation scripts pass
- [ ] User-friendly error handling implemented
- [ ] Rate limiting active with exponential backoff
- [ ] Structured logging with full context
- [ ] Fallback systems operational
- [ ] TypeScript compliance in our code
- [ ] Documentation updated if needed

---

**FlowVision: Systematic Excellence Through Compliance** 🏛️

*Always attach this file to ensure consistent, professional, rule-compliant development*
