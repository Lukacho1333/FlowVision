# 🎯 FlowVision Compliance Quick Reference

## 🚨 **BEFORE ANY WORK - RUN THIS:**
```bash
npm run ensure-compliance      # MANDATORY: Check all rules are enforced
```

---

## ⚡ **QUICK VALIDATION COMMANDS**

### **Pre-Work (ALWAYS)**
```bash
npm run dev-setup              # Environment + AI services check
npm run ensure-compliance      # Complete rule compliance validation
```

### **During Work**
```bash
npm run health-check           # Repository health
npm run ai-health              # AI service diagnostics
```

### **Pre-Commit**
```bash
npm run full-health            # Complete system validation
```

---

## 🎯 **PROMPT TEMPLATE**

```
Following @.cursorrules V2.0, [your specific request].

Requirements:
- Rate limiting for API calls (exponential backoff for 429 errors)
- User-friendly error messages (no raw API errors)
- Structured logging with context (requestId, userId)
- TypeScript compliance in app/, lib/, components/ only
- Pre-commit validation must pass

Validation:
1. Run: npm run ensure-compliance
2. Test: npm run dev-setup  
3. Verify: npm run full-health

Success criteria: All compliance checks pass
```

---

## ✅ **COMPLIANCE CHECKLIST**

### **Environment**
- [ ] `npm run ensure-compliance` passes
- [ ] Docker services running
- [ ] Database connection working
- [ ] Environment variables configured

### **AI Services**
- [ ] Rate limiting implemented
- [ ] Error handling with fallbacks
- [ ] User-friendly error messages
- [ ] Structured logging

### **Code Quality**
- [ ] TypeScript errors fixed (our code only)
- [ ] Pre-commit hooks working
- [ ] Documentation updated
- [ ] Tests passing

---

## 🚨 **RED FLAGS - STOP IMMEDIATELY**

- ❌ `npm run ensure-compliance` fails
- ❌ Raw API errors shown to users
- ❌ Missing rate limiting on AI calls
- ❌ TypeScript errors in app/, lib/, components/
- ❌ Pre-commit hooks bypassed

---

## 🎊 **SUCCESS INDICATORS**

- ✅ All validation scripts pass
- ✅ User-friendly error handling
- ✅ Proper logging and monitoring
- ✅ Clean TypeScript compliance
- ✅ Automated quality gates working

---

**FlowVision: Always Compliant** 🏛️
