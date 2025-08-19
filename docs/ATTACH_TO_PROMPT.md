# 🎯 ATTACH TO EVERY PROMPT

**MANDATORY: Include this file with all FlowVision development prompts**

---

## 🚨 **BEFORE STARTING - RUN THIS:**
```bash
npm run ensure-compliance      # MUST PASS - Do not proceed if fails
```

---

## 📋 **REQUIRED PROMPT STRUCTURE:**

```
Following @.cursorrules V2.0, [your specific request].

MANDATORY Requirements:
- Rate limiting for AI API calls (exponential backoff for 429 errors)  
- User-friendly error messages (NO raw API errors to users)
- Structured logging with context (requestId, userId, model)
- TypeScript compliance in app/, lib/, components/ ONLY
- Fallback systems for AI service failures
- Pre-commit validation must pass

Validation: Run npm run ensure-compliance before and after
Success Criteria: All compliance checks pass + no raw errors + proper logging
```

---

## 🛡️ **ZERO TOLERANCE RULES:**

### **MANDATORY Implementations:**
- ✅ **Rate Limiting**: Exponential backoff for 429 errors
- ✅ **Error Handling**: User-friendly messages, NO raw API errors
- ✅ **Logging**: Structured with requestId, userId, context
- ✅ **Fallbacks**: Manual alternatives for AI failures
- ✅ **TypeScript**: Fix errors in app/, lib/, components/ only

### **Emergency Procedures (Follow Immediately):**
- **429 Rate Limits** → Exponential backoff + user-friendly message
- **AI Service Failures** → Fallback responses + structured logging
- **Module Errors** → `rm -rf .next` + restart dev server
- **TypeScript Errors >10** → Separate cleanup PR first

---

## ⚡ **VALIDATION COMMANDS:**

```bash
# Pre-work (MANDATORY)
npm run ensure-compliance      # Complete validation
npm run dev-setup              # Environment check

# During work
npm run ai-health              # AI service monitoring

# Pre-completion (MANDATORY)  
npm run full-health            # Final validation
```

---

## 🚨 **RED FLAGS - STOP IMMEDIATELY:**
- ❌ Compliance check fails
- ❌ Raw API errors shown to users
- ❌ Missing rate limiting on AI calls
- ❌ TypeScript errors in our code
- ❌ No structured logging
- ❌ Missing fallback systems

---

## ✅ **SUCCESS INDICATORS:**
- ✅ All validation scripts pass
- ✅ User-friendly errors throughout
- ✅ Rate limiting with exponential backoff
- ✅ Structured logging active
- ✅ Fallback systems operational
- ✅ Clean TypeScript in our code

---

## 🎯 **AI ASSISTANT REQUIREMENTS:**

**MUST DO:**
1. Run `npm run ensure-compliance` before starting
2. Implement rate limiting for all AI API calls
3. Provide user-friendly error messages
4. Use structured logging with context
5. Create fallback systems for failures
6. Follow emergency procedures from .cursorrules
7. Validate with `npm run full-health` before completion

---

**FlowVision: Always Compliant** 🏛️

*Attach this file to every prompt for systematic rule enforcement*
