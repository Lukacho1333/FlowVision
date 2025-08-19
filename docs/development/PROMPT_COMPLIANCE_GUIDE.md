# 🎯 FlowVision Prompt Compliance Guide

## 📊 **ENSURING PROCESS & RULES ARE FOLLOWED**

*Following @.cursorrules V2.0 - Systematic Rule Enforcement*

---

## 🚨 **CRITICAL: ALWAYS START HERE**

### **Before Any Development Work or AI Prompt**
```bash
# MANDATORY: Run compliance validation
npm run ensure-compliance      # Comprehensive rule enforcement check
```

**❌ NEVER proceed if compliance check fails**
**✅ Only continue when compliance is achieved**

---

## 🎯 **PROMPT COMPLIANCE FRAMEWORK**

### **1. Pre-Prompt Validation (ALWAYS FIRST)**

#### **Environment Check**
```bash
npm run dev-setup              # Environment + AI services validation
```

#### **System Health**
```bash
npm run full-health            # Complete system validation
```

#### **Rule Compliance**
```bash
npm run ensure-compliance      # Verify all rules are enforced
```

### **2. Effective Prompt Structure**

#### **✅ GOOD PROMPT EXAMPLES:**
```
"Following @.cursorrules V2.0, implement rate limiting for OpenAI API calls with exponential backoff for 429 errors. Ensure user-friendly error messages and proper logging."

"Using @docs/development/OPTIMIZED_DEVELOPMENT_RULES_V2.md, create error handling for AI service failures that provides fallback responses and logs with full context."

"Following the enhanced pre-commit checklist V2.0, fix TypeScript errors only in app/, lib/, and components/ directories. Ignore .next/ generated files."
```

#### **❌ BAD PROMPT EXAMPLES:**
```
"Fix the API errors"                    # Too vague, no rule reference
"Make the AI work better"               # No specific requirements
"Update the code"                       # No compliance framework
```

### **3. Required Prompt Elements**

#### **MANDATORY in every prompt:**
- ✅ Reference to `@.cursorrules` or specific documentation
- ✅ Specific compliance requirements
- ✅ Validation steps to follow
- ✅ Success criteria definition

#### **ENHANCED prompt elements:**
```
Following @.cursorrules V2.0:
1. [Specific task description]
2. Compliance requirements:
   - Rate limiting for API calls
   - User-friendly error handling  
   - Structured logging with context
   - Pre-commit validation
3. Validation steps:
   - Run npm run ensure-compliance
   - Test with npm run dev-setup
   - Verify with npm run full-health
4. Success criteria:
   - All compliance checks pass
   - No raw API errors exposed
   - Proper fallback systems active
```

---

## 🛠️ **SYSTEMATIC ENFORCEMENT WORKFLOW**

### **Phase 1: Pre-Work Validation**
```bash
# 1. MANDATORY: Check compliance
npm run ensure-compliance

# 2. Environment validation
npm run dev-setup

# 3. System health check
npm run full-health

# 4. Current status
git status
docker-compose ps
```

### **Phase 2: Task Execution**
```bash
# During development, monitor for:
- Rate limiting errors (429 status)
- Module not found errors  
- API authentication failures
- Database connection issues
- TypeScript errors in our code

# Follow emergency procedures from .cursorrules V2.0
```

### **Phase 3: Validation & Completion**
```bash
# 1. Rule compliance check
npm run ensure-compliance

# 2. Complete system validation
npm run full-health

# 3. Pre-commit validation
# (Automated via pre-commit hooks)
```

---

## 🎯 **AI ASSISTANT COMPLIANCE**

### **When Working with Claude/AI:**

#### **1. Context Setting**
Always provide:
- ✅ Current system status (`npm run ensure-compliance` output)
- ✅ Specific rule references (`@.cursorrules V2.0`)
- ✅ Documentation context (`@docs/development/`)
- ✅ Current issues or constraints

#### **2. Request Validation**
Ask AI to:
- ✅ Run compliance checks before starting
- ✅ Validate against our specific quality gates
- ✅ Follow our emergency procedures for issues
- ✅ Test changes with our validation scripts
- ✅ Document any new patterns or procedures

#### **3. Completion Verification**
Require AI to:
- ✅ Run `npm run ensure-compliance` after changes
- ✅ Confirm all quality gates pass
- ✅ Provide validation evidence
- ✅ Document compliance adherence

---

## 📋 **COMPLIANCE CHECKLIST**

### **✅ COMPLIANT DEVELOPMENT:**
- [ ] Started with `npm run ensure-compliance`
- [ ] Environment validated with `npm run dev-setup`
- [ ] System health confirmed with `npm run full-health`
- [ ] Specific rules referenced in prompt/work
- [ ] AI service patterns implemented (rate limiting, error handling)
- [ ] TypeScript errors fixed in app/, lib/, components/ only
- [ ] User-friendly error messages (no raw API errors)
- [ ] Structured logging with context
- [ ] Pre-commit validation passes
- [ ] Documentation updated if needed
- [ ] Final compliance check passes

### **❌ NON-COMPLIANT INDICATORS:**
- Skipping compliance validation
- Ignoring environment/health checks
- Vague prompts without rule references
- Raw API errors exposed to users
- TypeScript errors in our code ignored
- Missing rate limiting for AI services
- No fallback systems for failures
- Bypassing pre-commit hooks

---

## 🚨 **EMERGENCY COMPLIANCE RECOVERY**

### **If Compliance Fails:**

#### **1. Immediate Actions**
```bash
# Stop current work
# Run diagnostic
npm run ensure-compliance

# Identify specific violations
# Fix issues systematically
```

#### **2. Systematic Recovery**
```bash
# Environment issues
npm run env-check

# AI service issues  
npm run ai-health

# Code quality issues
npm run health-check

# Complete validation
npm run full-health
```

#### **3. Prevention**
```bash
# Add to daily routine
npm run ensure-compliance    # Start of day
npm run dev-setup           # Before work
npm run full-health         # Before commits
```

---

## 🎊 **SUCCESS INDICATORS**

### **Full Compliance Achieved When:**
- ✅ `npm run ensure-compliance` passes without errors
- ✅ All validation scripts return success
- ✅ AI services have proper error handling and rate limiting
- ✅ TypeScript errors only in generated files (ignored)
- ✅ User-friendly error messages throughout
- ✅ Structured logging with full context
- ✅ Pre-commit hooks working with validation
- ✅ Documentation current and complete

### **Development Ready When:**
- ✅ Environment properly configured
- ✅ AI services healthy (or proper fallbacks)
- ✅ Database connections working
- ✅ Docker services running
- ✅ All quality gates operational

### **Production Ready When:**
- ✅ Full compliance maintained
- ✅ Performance monitoring active
- ✅ Error handling comprehensive
- ✅ Security measures implemented
- ✅ Cost monitoring configured

---

## 🏆 **BEST PRACTICES**

### **Daily Workflow:**
1. **Morning**: `npm run ensure-compliance`
2. **Before Work**: `npm run dev-setup`  
3. **During Work**: Monitor logs, follow emergency procedures
4. **Before Commits**: `npm run full-health`
5. **End of Day**: Ensure compliance maintained

### **Prompt Best Practices:**
- Always reference specific rules and documentation
- Include validation requirements in prompts
- Request compliance verification from AI
- Specify success criteria clearly
- Ask for evidence of rule adherence

### **Team Compliance:**
- Share compliance status in standups
- Document any rule updates or exceptions
- Train new team members on compliance framework
- Regular compliance reviews and improvements
- Escalate persistent compliance issues

---

## 🎯 **CONCLUSION**

**Following this compliance guide ensures that every prompt, every development task, and every change adheres to our optimized FlowVision development standards.**

### **Key Success Factors:**
1. **Systematic Validation**: Always start with compliance checks
2. **Specific References**: Use precise rule and documentation references
3. **Continuous Monitoring**: Watch for compliance indicators throughout work
4. **Automated Enforcement**: Leverage our validation scripts and pre-commit hooks
5. **Evidence-Based Completion**: Verify compliance before considering work complete

**FlowVision: Compliant, Consistent, Professional** 🏛️

---

*Compliance guide following @.cursorrules V2.0 - Systematic rule enforcement*
