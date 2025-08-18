# FlowVision Team Onboarding Guide

_Complete Context Preservation & New Team Member Quickstart_

Generated: January 13, 2025

---

## 🎯 **WELCOME TO FLOWVISION**

FlowVision is an **AI-Powered Efficiency Intelligence Platform** designed specifically for Architecture & Engineering firms. This guide will get you productive immediately and ensure you never lose context when starting new development sessions.

### **🚀 30-Second Summary**

- **What**: AI-enhanced project management platform for A&E firms
- **Tech Stack**: Next.js 14 + TypeScript + PostgreSQL + OpenAI GPT-4
- **Demo Environment**: Morrison Architecture & Engineering showcase
- **Development Server**: http://localhost:3001
- **Database Browser**: http://localhost:5555

---

## 📋 **PRE-SESSION CHECKLIST**

Use this checklist every time you start a new development session to restore full context:

### **✅ Environment Status Check**

```bash
# 1. Verify Docker database is running
docker ps | grep flowvision_db

# 2. Check development server status
curl -s http://localhost:3001/api/health

# 3. Verify database connectivity
npx prisma studio &
# Should open http://localhost:5555

# 4. Test authentication
curl -s http://localhost:3001/auth
```

### **✅ Quick System Validation**

1. **Database**: Prisma Studio shows 37+ tables with Morrison A&E data
2. **Authentication**: Demo accounts work with password `Admin123!`
3. **AI Features**: Executive dashboard shows AI insights
4. **New Features**: Solutions & Tasks are visible in initiatives

### **✅ Key Context Files** (Always review these)

- [`FLOWVISION_ARCHITECTURE_GUIDE.md`](./FLOWVISION_ARCHITECTURE_GUIDE.md) - Technical architecture
- [`FEATURE_NAVIGATION_MAP.md`](./FEATURE_NAVIGATION_MAP.md) - Complete feature guide
- [`SYSTEMS_ENHANCEMENT_EXECUTION_PLAN.md`](./SYSTEMS_ENHANCEMENT_EXECUTION_PLAN.md) - Current sprint status
- [`DEMO_ACCOUNTS_GUIDE.md`](./DEMO_ACCOUNTS_GUIDE.md) - User personas & testing
- [`EXPERT_PROFILES_SYSTEM.md`](./EXPERT_PROFILES_SYSTEM.md) - Decision frameworks

---

## ⚡ **INSTANT DEVELOPMENT SETUP**

### **First-Time Setup** (10 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL database
docker-compose up -d

# 3. Configure environment
echo 'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flowvision?schema=public' > .env.local
echo 'NEXTAUTH_SECRET=dev-secret' >> .env.local
echo 'NEXTAUTH_URL=http://localhost:3001' >> .env.local

# 4. Setup database schema
npx prisma migrate deploy
npx prisma db push

# 5. Load Morrison A&E demo data
npm run prisma:seed

# 6. Start development server
npm run dev
```

### **Returning Session Setup** (30 seconds)

```bash
# Start services
docker-compose up -d
npm run dev

# Verify everything works
curl http://localhost:3001/api/health
```

---

## 🎭 **DEMO ENVIRONMENT OVERVIEW**

### **Morrison Architecture & Engineering Showcase**

FlowVision is populated with realistic data from a fictional A&E firm's digital transformation journey.

#### **👥 Demo Team** (All password: `Admin123!`)

| **User**       | **Email**                       | **Role**                  | **Focus Area**      |
| -------------- | ------------------------------- | ------------------------- | ------------------- |
| David Morrison | `david.morrison@morrisonae.com` | Principal/CEO (ADMIN)     | Executive oversight |
| Sarah Chen     | `sarah.chen@morrisonae.com`     | Design Director (LEADER)  | Creative processes  |
| Mike Rodriguez | `mike.rodriguez@morrisonae.com` | Project Director (LEADER) | Operations          |
| Jennifer Kim   | `jennifer.kim@morrisonae.com`   | Business Dev (LEADER)     | Growth strategy     |
| Alex Thompson  | `alex.thompson@morrisonae.com`  | Engineering Dir (LEADER)  | Technical systems   |

#### **📊 Demo Data Highlights**

- **15 Real Issues**: Technology, process, and training challenges
- **4 Strategic Initiatives**: From emergency fixes to innovation projects
- **12+ System Categories**: Comprehensive impact analysis
- **3 Issue Clusters**: Smart AI-powered grouping
- **32+ Solutions**: Technology, process, training, and policy approaches
- **50+ Tasks**: Detailed implementation breakdowns
- **Complete Audit Trail**: Full activity history

---

## 🏗️ **CURRENT ARCHITECTURE STATUS**

### **✅ COMPLETED FEATURES** (January 2025)

#### **Core Platform**

- **Authentication**: NextAuth.js with role-based access control
- **Database**: PostgreSQL with Prisma ORM (37 tables)
- **UI Framework**: Next.js 14 App Router + TypeScript + Tailwind CSS
- **AI Integration**: OpenAI GPT-4 with confidence scoring

#### **Four-Phase Workflow** (ALL FUNCTIONAL)

1. **🔍 Identify**: Issue discovery, AI analysis, clustering
2. **💡 Plan**: Initiative creation, requirements, solutions, tasks
3. **🏃 Execute**: Progress tracking, Kanban boards, roadmaps
4. **📊 Analyze**: Executive dashboard, health scores, ROI forecasting

#### **Recently Added** (Sprint 4)

- **✅ Solutions Management**: Full CRUD with API endpoints
- **✅ Task Kanban Boards**: Drag-drop task management
- **✅ Enhanced Initiative Details**: Integrated solutions & tasks
- **✅ Demo Account Integration**: Morrison A&E team login
- **✅ Comprehensive Documentation**: Architecture & navigation guides

### **🔧 TECHNICAL STACK STATUS**

```typescript
// Current Technology Stack (All Operational)
const techStack = {
  frontend: 'Next.js 14 + React 18 + TypeScript',
  styling: 'Tailwind CSS + Custom Design System',
  backend: 'Next.js API Routes (Serverless)',
  database: 'PostgreSQL 16 + Prisma ORM',
  authentication: 'NextAuth.js + JWT',
  ai: 'OpenAI GPT-4 + Custom AI Engines',
  development: 'Docker + ESLint + Prettier + Jest',
  deployment: 'Production-ready Docker containers',
};
```

---

## 🎨 **UI/UX PATTERNS & STANDARDS**

### **Design System**

```css
/* Core Design Tokens */
:root {
  --primary: #2563eb; /* Blue-600 */
  --secondary: #4b5563; /* Gray-600 */
  --success: #059669; /* Green-600 */
  --warning: #d97706; /* Yellow-600 */
  --error: #dc2626; /* Red-600 */
  --spacing: 1.5rem; /* 24px base unit */
  --font: 'Inter', sans-serif;
  --border-radius: 0.5rem; /* 8px */
}
```

### **Component Patterns**

All major features follow consistent patterns:

- **Card-based layouts** with hover effects
- **Modal dialogs** for complex forms
- **Loading states** with skeleton animations
- **Error boundaries** with retry mechanisms
- **AI indicators** (🤖) for generated content

### **Interaction Standards**

- **Drag & Drop**: For prioritization and task management
- **Hover Effects**: Subtle elevation and color changes
- **Mobile-First**: Responsive design for all devices
- **Accessibility**: WCAG 2.1 AA compliance target

---

## 🔌 **API ARCHITECTURE REFERENCE**

### **RESTful Endpoint Patterns**

```typescript
// Standard API Response Format
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    pagination?: PaginationInfo;
    stats?: Record<string, any>;
  };
}
```

### **Core API Routes** (All Functional)

```bash
# Authentication
GET/POST /api/auth/*              # NextAuth.js endpoints

# User Management
GET      /api/users               # List users
GET      /api/users/[id]          # Get user details
PUT      /api/users/[id]          # Update user

# Issues & Clustering
GET/POST /api/issues              # Issue management
POST     /api/issues/clusterize   # AI clustering
POST     /api/ai/analyze-issue    # AI analysis

# Initiatives & Planning
GET/POST /api/initiatives         # Initiative management
GET      /api/initiatives/[id]    # Initiative details
POST     /api/initiatives/from-issues # Create from issues

# Solutions & Tasks (NEW)
GET/POST /api/initiatives/[id]/solutions  # Solution management
GET/POST /api/solutions/[id]/tasks        # Task management
GET/PUT/DELETE /api/tasks/[id]             # Individual task operations

# Executive & Analytics
GET      /api/executive/*          # Executive dashboard data
GET      /api/analytics/*          # Performance insights

# AI Services
POST     /api/ai/*                # AI-powered features
```

---

## 🤖 **AI INTEGRATION STATUS**

### **✅ Currently Implemented**

- **Issue Analysis**: GPT-4 powered issue summaries with confidence scores
- **Initiative Generation**: AI-assisted initiative creation from problems
- **Priority Scoring**: AI-enhanced priority recommendations
- **Issue Clustering**: Smart grouping of related issues
- **Executive Insights**: AI-generated health scores and ROI forecasts
- **Requirement Generation**: AI-powered user story creation

### **⚠️ Partially Implemented**

- **Solution Generation**: API ready, AI service pending
- **Task Breakdown**: API ready, AI service pending

### **❌ Future Implementation**

- **Progress Prediction**: Timeline forecasting
- **Resource Optimization**: Team allocation recommendations
- **Risk Assessment**: Proactive risk identification

### **AI Service Architecture**

```typescript
// AI Service Interface
interface AIService {
  isConfigured(): boolean;
  generateInitiative(context: InitiativeContext): Promise<AIResponse>;
  analyzePriority(initiatives: Initiative[]): Promise<PriorityAnalysis>;
  clusterIssues(issues: Issue[]): Promise<ClusterResult>;
  // Ready for implementation:
  generateSolutions(initiative: Initiative): Promise<Solution[]>;
  generateTasks(solution: Solution): Promise<Task[]>;
}
```

---

## 📊 **DATABASE SCHEMA OVERVIEW**

### **Core Data Models**

```prisma
// Key Entities (Simplified)
model User {
  id           String @id @default(cuid())
  email        String @unique
  name         String
  role         Role   @default(MEMBER)
  initiatives  Initiative[]
  // 15+ additional fields
}

model Initiative {
  id              String @id @default(cuid())
  title           String
  problem         String
  goal            String
  status          InitiativeStatus
  solutions       InitiativeSolution[]
  requirementCards RequirementCard[]
  // 25+ additional fields including AI metadata
}

model InitiativeSolution {
  id          String @id @default(cuid())
  title       String
  description String
  type        SolutionType
  status      SolutionStatus
  tasks       SolutionTask[]
  // 20+ additional fields including cost/time tracking
}

model SolutionTask {
  id           String @id @default(cuid())
  title        String
  status       TaskStatus
  priority     Int
  progress     Int @default(0)
  assignedTo   User?
  // 15+ additional fields including dependencies
}
```

### **Relationship Hierarchy**

```
User (1) ──── (N) Initiative
Initiative (1) ──── (N) InitiativeSolution
InitiativeSolution (1) ──── (N) SolutionTask
Initiative (1) ──── (N) RequirementCard
Issue (N) ──── (1) IssueCluster
```

---

## 🔧 **DEVELOPMENT WORKFLOWS**

### **Feature Development Process**

1. **Check Current Sprint**: Review [`SYSTEMS_ENHANCEMENT_EXECUTION_PLAN.md`](./SYSTEMS_ENHANCEMENT_EXECUTION_PLAN.md)
2. **Create Feature Branch**: `git checkout -b feature/sprint-X-story-Y-description`
3. **Follow Expert Guidelines**: Consult [`EXPERT_PROFILES_SYSTEM.md`](./EXPERT_PROFILES_SYSTEM.md)
4. **Implement with Tests**: API + UI + Tests
5. **Update Documentation**: Reflect changes in architecture guide
6. **Create PR**: Use GitHub PR template

### **Quality Assurance Checklist**

```bash
# Before committing
npm run lint              # ESLint + TypeScript check
npm run format           # Prettier formatting
npm test                 # Jest unit tests
npm run build           # Production build test

# Database validation
npx prisma validate      # Schema validation
npx prisma generate      # Client generation

# Manual testing
# 1. Test with Morrison A&E demo accounts
# 2. Verify AI features work correctly
# 3. Check mobile responsiveness
# 4. Validate error handling
```

### **Git Workflow Standards**

```bash
# Conventional commits
git commit -m "feat(solutions): Add task kanban board functionality"
git commit -m "fix(auth): Resolve login redirect issue"
git commit -m "docs(architecture): Update API documentation"

# Feature branches
feature/sprint-4-frontend-integration
feature/sprint-5-ai-enhancement
hotfix/critical-auth-bug
```

---

## 🎯 **CURRENT SPRINT STATUS**

### **Sprint 4: Frontend Integration** ✅ COMPLETED

- **Status**: All stories completed
- **Key Deliverables**:
  - Solutions & Tasks UI implementation
  - Enhanced initiative detail pages
  - Kanban board task management
  - API endpoint completion
  - Demo account integration

### **Sprint 5: AI Enhancement** 🔄 NEXT

- **Focus**: Complete AI integration for solutions and tasks
- **Key Stories**:
  - AI solution generation
  - AI task breakdown
  - Enhanced executive insights
  - Performance optimization

### **Technical Debt Priorities**

1. Complete AI service implementations
2. Add comprehensive error handling
3. Implement real-time updates
4. Enhance mobile experience
5. Add comprehensive testing coverage

---

## 🚨 **COMMON ISSUES & SOLUTIONS**

### **Development Environment Issues**

#### **Port Conflicts**

```bash
# If port 3000 is busy, Next.js auto-uses 3001
# Prisma Studio uses 5555
# PostgreSQL uses 5432
lsof -i :3000 :3001 :5432 :5555  # Check port usage
```

#### **Database Connection Issues**

```bash
# Restart Docker database
docker-compose down && docker-compose up -d

# Reset database (nuclear option)
npx prisma migrate reset
npm run prisma:seed
```

#### **TypeScript Errors**

```bash
# Clear build cache
rm -rf .next tsconfig.tsbuildinfo
npm run dev
```

#### **Module Resolution Issues**

```bash
# Clear all caches
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

### **Application-Specific Issues**

#### **AI Features Not Working**

1. Check OpenAI API key in environment
2. Verify API key has sufficient credits
3. Check network connectivity
4. Review error logs in terminal

#### **Authentication Problems**

1. Clear browser cookies
2. Check `.env.local` configuration
3. Verify NEXTAUTH_SECRET is set
4. Try incognito/private browsing

#### **Demo Data Missing**

```bash
# Re-seed database
npm run prisma:seed
# Check Prisma Studio: http://localhost:5555
```

---

## 🎭 **DEMO SCENARIOS FOR STAKEHOLDERS**

### **Executive Presentation** (10 minutes)

1. **Login**: David Morrison (Principal/CEO)
2. **Executive Dashboard**: `/executive` - Show AI insights
3. **Health Scores**: Demonstrate system monitoring
4. **ROI Forecasting**: Show financial impact predictions
5. **Team Utilization**: Review resource optimization

### **Project Manager Demo** (15 minutes)

1. **Login**: Mike Rodriguez (Project Director)
2. **Issue Discovery**: `/issues` - Show problem identification
3. **Initiative Planning**: `/initiatives` - Create and manage projects
4. **Solution Detail**: Show new solutions & tasks features
5. **Progress Tracking**: `/track` and `/roadmap` - Monitor delivery

### **Technical Implementation** (20 minutes)

1. **Login**: Alex Thompson (Engineering Director)
2. **System Architecture**: Explain technical decisions
3. **AI Integration**: Demonstrate AI-powered features
4. **Task Management**: Show Kanban boards in action
5. **Database**: Prisma Studio tour
6. **Code Quality**: Show TypeScript, testing, documentation

---

## 📞 **SUPPORT & ESCALATION**

### **Immediate Help Resources**

1. **Architecture Questions**: [`FLOWVISION_ARCHITECTURE_GUIDE.md`](./FLOWVISION_ARCHITECTURE_GUIDE.md)
2. **Feature Navigation**: [`FEATURE_NAVIGATION_MAP.md`](./FEATURE_NAVIGATION_MAP.md)
3. **Expert Decisions**: [`EXPERT_PROFILES_SYSTEM.md`](./EXPERT_PROFILES_SYSTEM.md)
4. **Database Issues**: Prisma Studio at http://localhost:5555
5. **API Testing**: Use `/api/health` for basic connectivity

### **Debugging Tools**

```bash
# Real-time logs
npm run dev  # Watch terminal output

# Database inspection
npx prisma studio

# API testing
curl http://localhost:3001/api/health
curl http://localhost:3001/api/admin/stats

# Performance monitoring
# Check browser dev tools Network tab
# Monitor database query logs in terminal
```

### **Emergency Procedures**

1. **Total Reset**: `npm run reset-dev-env` (if script exists)
2. **Database Nuclear**: `npx prisma migrate reset && npm run prisma:seed`
3. **Clean Install**: `rm -rf node_modules .next && npm install`
4. **Docker Reset**: `docker-compose down -v && docker-compose up -d`

---

## 🎯 **SUCCESS METRICS**

### **Developer Productivity Indicators**

- **Setup Time**: < 5 minutes for returning sessions
- **Context Recovery**: < 2 minutes using this guide
- **Feature Location**: Any feature findable in < 30 seconds
- **Demo Readiness**: Full demo possible within 1 minute

### **Application Health Indicators**

- **API Response Times**: < 500ms average
- **Page Load Times**: < 2 seconds
- **Database Query Performance**: Optimized with Prisma
- **AI Service Availability**: Check confidence scores > 80%

---

## 🚀 **NEXT SESSION PREPARATION**

### **End-of-Session Checklist**

1. **Commit Work**: Push feature branches to GitHub
2. **Update Documentation**: Reflect any architectural changes
3. **Note Issues**: Document any blockers or technical debt
4. **Update Sprint**: Mark completed stories in execution plan
5. **Environment State**: Leave development server running (optional)

### **New Session Startup**

1. **Review this guide** (5 minutes)
2. **Check system status** using environment checklist
3. **Review current sprint** in execution plan
4. **Test demo scenarios** to verify functionality
5. **Start development** with full context

---

_This onboarding guide ensures that any team member—new or returning—can immediately understand FlowVision's current state, navigate all features, and contribute effectively without losing context between sessions._
