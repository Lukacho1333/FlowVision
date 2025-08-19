/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * COMPREHENSIVE MORRISON A&E SEED DATA - SPRINT 20 SHOWCASE
 * 
 * Complete Architecture & Engineering firm demonstration with:
 * - Realistic AE industry challenges (people, process, systems)
 * - Full feature coverage: Issues → Clusters → Initiatives → Solutions → Tasks
 * - Sprint 20 AI features: Client-specific learning models, performance monitoring
 * - Multi-user scenarios with different roles and perspectives
 * - Interconnected data showing complete workflows
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🏗️ MORRISON A&E COMPREHENSIVE SHOWCASE - Sprint 20 AI Revolution');
  console.log('📊 Creating realistic Architecture & Engineering firm data...');

  // === CLEANUP: Complete data reset ===
  console.log('🧹 Clearing existing data...');
  
  // Clean up in dependency order
  await prisma.vote.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.resourceAssignment.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.requirementCard.deleteMany();
  await prisma.idea.deleteMany();
  await prisma.issueSystemImpact.deleteMany();
  await prisma.solutionTask.deleteMany();
  await prisma.solution.deleteMany();
  await prisma.initiativeSolution.deleteMany();
  await prisma.initiative.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.issueCluster.deleteMany();
  await prisma.systemCategory.deleteMany();
  await prisma.team.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.auditLog.deleteMany();
  
  // AI-related tables (Sprint 20)
  await prisma.aIRecommendationFeedback.deleteMany();
  await prisma.aIClientModel.deleteMany();
  await prisma.aIQualityFeedback.deleteMany();
  await prisma.aIUsageLog.deleteMany();
  await prisma.aIUserQuota.deleteMany();
  await prisma.aIPerformanceMetric.deleteMany();
  await prisma.aICacheEntry.deleteMany();
  await prisma.aIConfiguration.deleteMany();
  
  // NextAuth tables
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organizations.deleteMany();

  // === ORGANIZATION: MORRISON ARCHITECTURE & ENGINEERING ===
  console.log('🏢 Creating Morrison A&E organization...');
  
  const morrisonAE = await prisma.organizations.create({
    data: {
      id: 'morrison-ae',
      name: 'Morrison Architecture & Engineering',
      slug: 'morrison-ae',
      domain: 'morrisonae.com',
      planTier: 'PROFESSIONAL',
      settings: {
        industryType: 'architecture_engineering',
        companySize: '75-100',
        foundedYear: 1995,
        specialties: ['Commercial Architecture', 'Structural Engineering', 'MEP Design', 'Project Management'],
        certifications: ['AIA', 'NCARB', 'LEED', 'PMP'],
        primaryMarkets: ['Healthcare', 'Education', 'Commercial', 'Mixed-Use'],
        annualRevenue: '$12M',
        aiAssistanceLevel: 'high'
      },
      isActive: true,
      updatedAt: new Date()
    }
  });

  // === USERS: MORRISON A&E TEAM ===
  console.log('👥 Creating Morrison A&E team members...');
  
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Principal/CEO - Strategic oversight
  const davidMorrison = await prisma.user.create({
    data: {
      email: 'david.morrison@morrisonae.com',
      name: 'David Morrison',
      passwordHash,
      role: 'ADMIN',
      organizationId: morrisonAE.id,
      preferences: {
        dashboardLayout: 'executive',
        notificationPreferences: ['critical', 'strategic'],
        aiAssistanceLevel: 'high'
      },
      aiTier: 'PROFESSIONAL',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Design Director - Creative leadership
  const sarahChen = await prisma.user.create({
    data: {
      email: 'sarah.chen@morrisonae.com',
      name: 'Sarah Chen',
      passwordHash,
      role: 'LEADER',
      organizationId: morrisonAE.id,
      preferences: {
        dashboardLayout: 'design_focused',
        notificationPreferences: ['design', 'quality', 'deadlines'],
        aiAssistanceLevel: 'medium'
      },
      aiTier: 'STANDARD',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Project Director - Operations delivery
  const mikeRodriguez = await prisma.user.create({
    data: {
      email: 'mike.rodriguez@morrisonae.com',
      name: 'Mike Rodriguez',
      passwordHash,
      role: 'LEADER',
      organizationId: morrisonAE.id,
      preferences: {
        dashboardLayout: 'project_management',
        notificationPreferences: ['deadlines', 'budget', 'resources'],
        aiAssistanceLevel: 'high'
      },
      aiTier: 'PROFESSIONAL',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Business Development Director - Growth strategy
  const jenniferKim = await prisma.user.create({
    data: {
      email: 'jennifer.kim@morrisonae.com',
      name: 'Jennifer Kim',
      passwordHash,
      role: 'LEADER',
      organizationId: morrisonAE.id,
      preferences: {
        dashboardLayout: 'business_development',
        notificationPreferences: ['opportunities', 'client_feedback', 'strategic'],
        aiAssistanceLevel: 'medium'
      },
      aiTier: 'STANDARD',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Engineering Director - Technical systems
  const alexThompson = await prisma.user.create({
    data: {
      email: 'alex.thompson@morrisonae.com',
      name: 'Alex Thompson',
      passwordHash,
      role: 'LEADER',
      organizationId: morrisonAE.id,
      preferences: {
        dashboardLayout: 'technical',
        notificationPreferences: ['technical', 'compliance', 'quality'],
        aiAssistanceLevel: 'high'
      },
      aiTier: 'PROFESSIONAL',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Senior Architect - Design execution
  const rachelGonzalez = await prisma.user.create({
    data: {
      email: 'rachel.gonzalez@morrisonae.com',
      name: 'Rachel Gonzalez',
      passwordHash,
      role: 'VIEWER',
      organizationId: morrisonAE.id,
      preferences: {
        dashboardLayout: 'architect',
        notificationPreferences: ['design', 'technical', 'client_feedback'],
        aiAssistanceLevel: 'medium'
      },
      aiTier: 'STANDARD',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // === SPRINT 20: AI CLIENT MODEL ===
  console.log('🤖 Setting up AI client model for Morrison A&E...');
  
  const aiClientModel = await prisma.aIClientModel.create({
    data: {
      organizationId: morrisonAE.id,
      modelData: {
        version: '1.0',
        industryContext: 'architecture_engineering',
        organizationalPatterns: {
          commonIssueTypes: ['CAD software problems', 'project coordination', 'client communication', 'deadline pressure'],
          processFlows: ['design → review → revisions → approval', 'client meeting → requirements → design'],
          decisionMakers: ['Principal', 'Project Directors', 'Design Directors'],
          terminology: {
            'drawings': 'architectural plans and technical drawings',
            'specs': 'project specifications and requirements',
            'coordination': 'interdisciplinary team alignment',
            'submittals': 'vendor product submissions for approval'
          }
        },
        learningMetrics: {
          accuracyScore: 0.85,
          confidenceLevel: 0.78,
          feedbackCount: 145,
          trainingHours: 24
        }
      },
      confidenceThreshold: 0.7,
      learningEnabled: true,
      totalFeedbackCount: 145,
      positiveeFeedbackRate: 0.82,
      version: '1.0.0',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // === TEAMS: ORGANIZATIONAL STRUCTURE ===
  console.log('🎯 Creating teams and organizational structure...');
  
  const executiveTeam = await prisma.team.create({
    data: {
      name: 'Executive Leadership',
      department: 'Management',
      capacity: 10,
      skills: ['Strategic Planning', 'Business Development', 'Leadership'],
      organizationId: morrisonAE.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  const designTeam = await prisma.team.create({
    data: {
      name: 'Design Team',
      department: 'Architecture',
      capacity: 25,
      skills: ['AutoCAD', 'Revit', 'SketchUp', 'Design Development', 'Construction Documents'],
      organizationId: morrisonAE.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  const projectTeam = await prisma.team.create({
    data: {
      name: 'Project Management',
      department: 'Operations',
      capacity: 15,
      skills: ['Project Coordination', 'Scheduling', 'Client Management', 'Budget Management'],
      organizationId: morrisonAE.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  const engineeringTeam = await prisma.team.create({
    data: {
      name: 'Engineering',
      department: 'Engineering',
      capacity: 20,
      skills: ['Structural Engineering', 'MEP Design', 'Code Compliance', 'Technical Review'],
      organizationId: morrisonAE.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // === SYSTEM CATEGORIES: AE FIRM SYSTEMS ===
  console.log('🖥️ Creating system categories...');
  
  const cadSystemCategory = await prisma.systemCategory.create({
    data: {
      name: 'CAD & Design Software',
      description: 'AutoCAD, Revit, SketchUp, and other design tools',
      type: 'TECHNOLOGY',
      industry: 'Architecture & Engineering',
      organizationId: morrisonAE.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  const projectMgmtCategory = await prisma.systemCategory.create({
    data: {
      name: 'Project Management',
      description: 'Project tracking, scheduling, and resource management',
      type: 'PROCESS',
      industry: 'Architecture & Engineering',
      organizationId: morrisonAE.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  const communicationCategory = await prisma.systemCategory.create({
    data: {
      name: 'Client Communication',
      description: 'CRM, email, video conferencing, and client portals',
      type: 'TECHNOLOGY',
      industry: 'Architecture & Engineering',
      organizationId: morrisonAE.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // === ISSUES: REALISTIC AE FIRM CHALLENGES ===
  console.log('📋 Creating realistic AE firm issues...');
  
  // CAD & Design Issues
  const issue1 = await prisma.issue.create({
    data: {
      description: 'Revit crashes during large healthcare project coordination - Revit 2024 crashes when working with the 250-bed hospital project. Multiple disciplines (arch, struct, MEP) working simultaneously causes file corruption and lost work. Crashes happen 3-4 times daily, losing 2-3 hours of work each time.',
      category: 'Technology',
      status: 'OPEN',
      department: 'Design',
      votes: 15,
      heatmapScore: 85,
      keywords: ['Revit', 'crashes', 'healthcare', 'coordination', 'file corruption'],
      authorId: sarahChen.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  const issue2 = await prisma.issue.create({
    data: {
      description: 'CAD standards inconsistency across projects - Different team members use different layer naming conventions, text styles, and dimension standards. Creates confusion during design reviews and coordination meetings. Clients notice inconsistencies in drawing sets.',
      category: 'Process',
      status: 'OPEN',
      department: 'Design',
      votes: 12,
      heatmapScore: 70,
      keywords: ['CAD standards', 'consistency', 'drawings', 'coordination'],
      authorId: rachelGonzalez.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  // Project Management Issues
  const issue3 = await prisma.issue.create({
    data: {
      description: 'Project timeline visibility and resource allocation conflicts - No clear visibility into who is working on what when. Senior architects double-booked on critical design reviews. Project managers scrambling to find available resources for urgent client requests.',
      category: 'Process',
      status: 'OPEN',
      department: 'Project Management',
      votes: 18,
      heatmapScore: 92,
      keywords: ['resource allocation', 'timeline', 'scheduling', 'double-booking'],
      authorId: mikeRodriguez.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  const issue4 = await prisma.issue.create({
    data: {
      description: 'Client change request tracking and billing - Clients request changes verbally in meetings or phone calls. Changes get implemented but not properly documented or billed. Losing $15K-25K per project in unbilled additional services.',
      category: 'Process',
      status: 'OPEN',
      department: 'Business Development',
      votes: 14,
      heatmapScore: 88,
      keywords: ['change requests', 'billing', 'documentation', 'revenue loss'],
      authorId: jenniferKim.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  // Communication & Coordination Issues
  const issue5 = await prisma.issue.create({
    data: {
      description: 'Engineering coordination delays in MEP systems - Structural and MEP teams not coordinating early enough in design process. Conflicts discovered during construction documents phase require major design changes and schedule delays.',
      category: 'Process',
      status: 'OPEN',
      department: 'Engineering',
      votes: 10,
      heatmapScore: 65,
      keywords: ['MEP coordination', 'structural conflicts', 'design delays'],
      authorId: alexThompson.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  const issue6 = await prisma.issue.create({
    data: {
      description: 'Client communication scattered across email, phone, and meetings - Important client decisions and feedback scattered across emails, phone call notes, and meeting minutes. Team members missing critical information leading to design rework.',
      category: 'Technology',
      status: 'OPEN',
      department: 'Project Management',
      votes: 11,
      heatmapScore: 68,
      keywords: ['client communication', 'information scattered', 'documentation'],
      authorId: mikeRodriguez.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  // Quality & Compliance Issues
  const issue7 = await prisma.issue.create({
    data: {
      description: 'Code compliance checking slowing down design reviews - Manual code compliance checking takes 2-3 days per design review. Building officials requesting more detailed compliance documentation. Need faster way to verify ADA, IBC, and local code requirements.',
      category: 'Process',
      status: 'OPEN',
      department: 'Design',
      votes: 8,
      heatmapScore: 60,
      keywords: ['code compliance', 'ADA', 'IBC', 'design review delays'],
      authorId: alexThompson.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  const issue8 = await prisma.issue.create({
    data: {
      description: 'Junior staff overwhelming senior architects with basic questions - New hires and junior staff constantly interrupting senior architects with questions about basic CAD operations, standards, and procedures. Senior staff losing focus on complex design problems.',
      category: 'People',
      status: 'OPEN',
      department: 'Design',
      votes: 9,
      heatmapScore: 62,
      keywords: ['junior staff', 'training', 'interruptions', 'productivity'],
      authorId: sarahChen.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  // === ISSUE CLUSTERS: LOGICAL GROUPINGS ===
  console.log('🔗 Creating issue clusters...');
  
  const designTechCluster = await prisma.issueCluster.create({
    data: {
      name: 'Design Technology & CAD Systems',
      description: 'Issues related to CAD software, design tools, and technical workflows',
      category: 'Technology',
      severity: 'high',
      theme: 'Design technology inefficiencies impacting project delivery',
      keywords: ['CAD', 'Revit', 'design software', 'technical issues'],
      color: '#3B82F6',
      issueCount: 3,
      aiSummary: 'Critical design technology issues affecting productivity and project timelines. Requires immediate attention to prevent revenue loss.',
      aiConfidence: 85,
      aiGeneratedAt: new Date(),
      organizationId: morrisonAE.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  const projectCoordinationCluster = await prisma.issueCluster.create({
    data: {
      name: 'Project Coordination & Management',
      description: 'Issues related to project scheduling, resource allocation, and team coordination',
      category: 'Process',
      severity: 'high',
      theme: 'Project management inefficiencies leading to delays and budget overruns',
      keywords: ['project management', 'scheduling', 'coordination', 'resources'],
      color: '#10B981',
      issueCount: 3,
      aiSummary: 'Project coordination challenges are causing schedule delays and resource conflicts. Needs systematic approach to workflow optimization.',
      aiConfidence: 78,
      aiGeneratedAt: new Date(),
      organizationId: morrisonAE.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  const communicationCluster = await prisma.issueCluster.create({
    data: {
      name: 'Client Communication & Documentation',
      description: 'Issues related to client communication, change tracking, and information management',
      category: 'Process',
      severity: 'medium',
      theme: 'Communication gaps leading to rework and revenue loss',
      keywords: ['client communication', 'documentation', 'change requests'],
      color: '#F59E0B',
      issueCount: 2,
      aiSummary: 'Communication and documentation issues are causing project rework and unbilled services. Needs centralized communication system.',
      aiConfidence: 72,
      aiGeneratedAt: new Date(),
      organizationId: morrisonAE.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Link issues to clusters
  await prisma.issue.update({
    where: { id: issue1.id },
    data: { clusterId: designTechCluster.id }
  });

  await prisma.issue.update({
    where: { id: issue2.id },
    data: { clusterId: designTechCluster.id }
  });

  await prisma.issue.update({
    where: { id: issue3.id },
    data: { clusterId: projectCoordinationCluster.id }
  });

  await prisma.issue.update({
    where: { id: issue4.id },
    data: { clusterId: communicationCluster.id }
  });

  await prisma.issue.update({
    where: { id: issue5.id },
    data: { clusterId: projectCoordinationCluster.id }
  });

  await prisma.issue.update({
    where: { id: issue6.id },
    data: { clusterId: communicationCluster.id }
  });

  // === INITIATIVES: STRATEGIC SOLUTIONS ===
  console.log('🚀 Creating strategic initiatives...');
  
  const designTechInitiative = await prisma.initiative.create({
    data: {
      title: 'Design Technology Modernization',
      problem: 'CAD software crashes, inconsistent standards, and technical inefficiencies are costing 15-20% of design productivity and causing project delays.',
      goal: 'Implement stable, standardized design technology infrastructure that improves productivity by 25% and eliminates technical delays.',
      type: 'TECHNOLOGY',
      status: 'IN_PROGRESS',
      progress: 35,
      difficulty: 7,
      roi: 750000,
      priorityScore: 92,
      budget: 180000,
      estimatedHours: 480,
      actualHours: 168,
      phase: 'EXECUTION',
      timelineStart: new Date(),
      timelineEnd: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 4 months
      ownerId: sarahChen.id,
      organizationId: morrisonAE.id,
      clusterId: designTechCluster.id,
      kpis: [
        'Reduce CAD software crashes by 90%',
        'Achieve 100% CAD standards compliance',
        'Improve design productivity by 25%',
        'Eliminate design rework due to technical issues'
      ],
      requirements: [
        'Upgrade hardware to support latest CAD software',
        'Implement standardized CAD templates and libraries',
        'Provide comprehensive training to all design staff',
        'Establish automated backup and file management system'
      ],
      acceptanceCriteria: [
        'Zero critical CAD software crashes for 30 consecutive days',
        'All design staff certified on new standards',
        'Client satisfaction with drawing quality improved to >95%',
        'Design review cycle time reduced by 20%'
      ],
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  const projectCoordInitiative = await prisma.initiative.create({
    data: {
      title: 'Integrated Project Management System',
      problem: 'Poor resource visibility, scheduling conflicts, and coordination delays are causing 20% project overruns and client dissatisfaction.',
      goal: 'Implement comprehensive project management system that improves resource utilization by 30% and eliminates scheduling conflicts.',
      type: 'OPERATIONAL_IMPROVEMENT',
      status: 'PLANNING',
      progress: 15,
      difficulty: 8,
      roi: 900000,
      priorityScore: 88,
      budget: 220000,
      estimatedHours: 640,
      actualHours: 96,
      phase: 'PLANNING',
      timelineStart: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      timelineEnd: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
      ownerId: mikeRodriguez.id,
      organizationId: morrisonAE.id,
      clusterId: projectCoordinationCluster.id,
      kpis: [
        'Reduce resource scheduling conflicts by 95%',
        'Improve project on-time delivery to 90%',
        'Increase resource utilization by 30%',
        'Reduce project cost overruns by 50%'
      ],
      requirements: [
        'Implement cloud-based project management platform',
        'Integrate with existing CAD and accounting systems',
        'Train all project managers and team leads',
        'Establish real-time project dashboards'
      ],
      acceptanceCriteria: [
        'Real-time visibility into all project resources',
        'Automated conflict detection and resolution',
        'Client project portals operational',
        'Mobile access for field staff'
      ],
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  const communicationInitiative = await prisma.initiative.create({
    data: {
      title: 'Client Communication & Change Management System',
      problem: 'Scattered client communication and poor change request tracking resulting in $20K+ per project in unbilled services.',
      goal: 'Centralize client communication and automate change request tracking to recover 100% of additional services revenue.',
      type: 'PROCESS_IMPROVEMENT',
      status: 'APPROVED',
      progress: 5,
      difficulty: 6,
      roi: 400000,
      priorityScore: 75,
      budget: 85000,
      estimatedHours: 320,
      actualHours: 16,
      phase: 'PLANNING',
      timelineStart: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      timelineEnd: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000), // 5 months
      ownerId: jenniferKim.id,
      organizationId: morrisonAE.id,
      clusterId: communicationCluster.id,
      kpis: [
        'Capture 100% of client change requests',
        'Reduce communication-related rework by 80%',
        'Improve client satisfaction scores by 25%',
        'Increase change order revenue by $150K annually'
      ],
      requirements: [
        'Implement client communication portal',
        'Integrate change request workflow with billing',
        'Train staff on new communication protocols',
        'Establish automated change request notifications'
      ],
      acceptanceCriteria: [
        'All client communication centralized in portal',
        'Automated change request approval workflow',
        'Real-time change order billing integration',
        'Client self-service project status access'
      ],
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  // === SOLUTIONS: DETAILED IMPLEMENTATION PLANS ===
  console.log('🛠️ Creating solution implementations...');
  
  // Solutions for Design Tech Initiative
  const solution1 = await prisma.initiativeSolution.create({
    data: {
      initiativeId: designTechInitiative.id,
      title: 'CAD Hardware & Software Infrastructure Upgrade',
      description: 'Upgrade all design workstations to high-performance specifications optimized for Revit and other CAD software. Implement redundant file servers and automated backup systems.',
      type: 'TECHNOLOGY',
      status: 'IN_PROGRESS',
      priority: 1,
      estimatedHours: 120,
      actualHours: 45,
      assignedToId: alexThompson.id,
      progress: 35,
      organizationId: morrisonAE.id,
      plannedStartDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      plannedEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  const solution2 = await prisma.initiativeSolution.create({
    data: {
      initiativeId: designTechInitiative.id,
      title: 'CAD Standards Documentation & Template System',
      description: 'Create comprehensive CAD standards manual with standardized templates, layer conventions, and drawing protocols. Implement automated standards checking.',
      type: 'PROCESS',
      status: 'PLANNED',
      priority: 2,
      estimatedHours: 80,
      actualHours: 0,
      assignedToId: rachelGonzalez.id,
      progress: 0,
      organizationId: morrisonAE.id,
      plannedStartDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      plannedEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  // Solutions for Project Coordination Initiative
  const solution3 = await prisma.initiativeSolution.create({
    data: {
      initiativeId: projectCoordInitiative.id,
      title: 'Cloud-Based Project Management Platform Implementation',
      description: 'Deploy Microsoft Project Online with integration to existing systems. Includes resource management, timeline tracking, and client portals.',
      type: 'TECHNOLOGY',
      status: 'PLANNED',
      priority: 1,
      estimatedHours: 200,
      actualHours: 0,
      assignedToId: mikeRodriguez.id,
      progress: 0,
      organizationId: morrisonAE.id,
      plannedStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      plannedEndDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  // === SOLUTION TASKS: DETAILED EXECUTION STEPS ===
  console.log('📋 Creating solution tasks...');
  
  // Tasks for Solution 1 (CAD Infrastructure)
  const task1 = await prisma.solutionTask.create({
    data: {
      title: 'Assess current hardware performance and bottlenecks',
      description: 'Audit all design workstations, identify performance issues, and create hardware upgrade specifications.',
      status: 'COMPLETED',
      priority: 3,
      progress: 100,
      estimatedHours: 16,
      actualHours: 18,
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      assignedToId: alexThompson.id,
      solutionId: solution1.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  });

  const task2 = await prisma.solutionTask.create({
    data: {
      title: 'Procure and install new design workstations',
      description: 'Purchase high-performance workstations optimized for CAD work. Install and configure software.',
      status: 'IN_PROGRESS',
      priority: 3,
      progress: 60,
      estimatedHours: 40,
      actualHours: 24,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      assignedToId: alexThompson.id,
      solutionId: solution1.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  const task3 = await prisma.solutionTask.create({
    data: {
      title: 'Implement automated backup and file management system',
      description: 'Set up automated daily backups with cloud storage integration and version control for CAD files.',
      status: 'TODO',
      priority: 2,
      progress: 0,
      estimatedHours: 32,
      actualHours: 0,
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      assignedToId: alexThompson.id,
      solutionId: solution1.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  // === COMMENTS: REALISTIC TEAM COLLABORATION ===
  console.log('💬 Adding team collaboration comments...');
  
  await prisma.comment.create({
    data: {
      content: 'The Revit crashes are getting worse. Lost 4 hours of work yesterday on the hospital project. We need to prioritize this hardware upgrade.',
      authorId: rachelGonzalez.id,
      issueId: issue1.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.comment.create({
    data: {
      content: 'Agreed. I\'ve already approved the budget for new workstations. Alex, can you have the procurement ready by next week?',
      authorId: davidMorrison.id,
      issueId: issue1.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.comment.create({
    data: {
      content: 'We also need to look at this from a process perspective. The CAD standards initiative should help prevent some of these coordination issues.',
      authorId: sarahChen.id,
      initiativeId: designTechInitiative.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  });

  // === VOTES: USER ENGAGEMENT ===
  console.log('👍 Adding user votes and engagement...');
  
  // High-priority issues get more votes
  await prisma.vote.create({
    data: {
      userId: davidMorrison.id,
      issueId: issue1.id,
      type: 'PRIORITY',
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.vote.create({
    data: {
      userId: mikeRodriguez.id,
      issueId: issue3.id,
      type: 'PRIORITY',
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.vote.create({
    data: {
      userId: sarahChen.id,
      issueId: issue1.id,
      type: 'PRIORITY',
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  });

  // === SPRINT 20: AI RECOMMENDATION FEEDBACK ===
  console.log('🤖 Adding AI recommendation feedback for client learning...');
  
  await prisma.aIRecommendationFeedback.create({
    data: {
      organizationId: morrisonAE.id,
      recommendationId: 'rec-001',
      recommendationType: 'issue_clustering',
      accepted: true,
      confidence: 0.85,
      feedback: 'AI correctly identified that CAD issues should be clustered together',
      userId: sarahChen.id,
      metadata: {
        clusterId: designTechCluster.id,
        accuracy: 'high',
        userSatisfaction: 'very_satisfied'
      },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.aIRecommendationFeedback.create({
    data: {
      organizationId: morrisonAE.id,
      recommendationId: 'rec-002',
      recommendationType: 'solution_suggestion',
      accepted: false,
      confidence: 0.62,
      feedback: 'AI suggested generic PM tool, but we need AE-specific features',
      userId: mikeRodriguez.id,
      metadata: {
        reason: 'industry_specific_needs',
        improvement: 'Consider AE industry requirements'
      },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  });

  // === IDEAS: INNOVATION PIPELINE ===
  console.log('💡 Creating innovation ideas...');
  
  await prisma.idea.create({
    data: {
      title: 'AI-Powered Code Compliance Checking',
      description: 'Integrate AI tools that can automatically check architectural drawings for building code compliance (ADA, IBC, local codes) and flag potential issues before design reviews.',
      category: 'Technology',
      status: 'SUBMITTED',
      authorId: alexThompson.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  await prisma.idea.create({
    data: {
      title: 'Virtual Reality Client Design Reviews',
      description: 'Use VR technology to allow clients to "walk through" their building designs before construction, reducing change orders and improving client satisfaction.',
      category: 'Technology',
      status: 'UNDER_REVIEW',
      authorId: rachelGonzalez.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  });

  // === BUSINESS PROFILE ===
  console.log('🏢 Creating business profile...');
  
  await prisma.businessProfile.create({
    data: {
      userId: davidMorrison.id,
      organizationId: morrisonAE.id,
      industry: 'Architecture & Engineering',
      size: 85,
      metrics: {
        companyName: 'Morrison Architecture & Engineering',
        employees: 85,
        location: 'Denver, Colorado',
        website: 'https://morrisonae.com',
        description: 'Full-service architecture and engineering firm specializing in healthcare, education, and commercial projects. Founded in 1995, we serve clients across Colorado and the Rocky Mountain region.',
        goals: [
          'Increase project delivery efficiency by 25%',
          'Improve client satisfaction to >95%',
          'Expand into new market segments',
          'Implement sustainable design practices',
          'Grow annual revenue to $15M by 2025'
        ],
        challenges: [
          'CAD software reliability and performance issues',
          'Project coordination and resource scheduling',
          'Client communication and change management',
          'Junior staff training and development',
          'Keeping up with building codes and regulations'
        ],
        foundedYear: 1995,
        annualRevenue: '$12M',
        specialties: ['Healthcare', 'Education', 'Commercial', 'Mixed-Use'],
        certifications: ['AIA', 'NCARB', 'LEED', 'PMP']
      }
    }
  });

  // === MILESTONES: PROJECT TRACKING ===
  console.log('🎯 Creating project milestones...');
  
  await prisma.milestone.create({
    data: {
      title: 'Design Technology Infrastructure Complete',
      description: 'All CAD workstations upgraded, standards implemented, and training completed',
      dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      status: 'IN_PROGRESS',
      initiativeId: designTechInitiative.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  await prisma.milestone.create({
    data: {
      title: 'Project Management System Go-Live',
      description: 'Project management platform deployed and all teams trained',
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'PLANNED',
      initiativeId: projectCoordInitiative.id,
      organizationId: morrisonAE.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  console.log('✅ Morrison A&E comprehensive seed data created successfully!');
  console.log('');
  console.log('📊 CREATED DATA SUMMARY:');
  console.log('👥 Users: 6 (Principal, Directors, Senior Staff)');
  console.log('🏢 Organization: Morrison Architecture & Engineering');
  console.log('📋 Issues: 8 (realistic AE firm challenges)');
  console.log('🔗 Clusters: 3 (Design Tech, Project Coordination, Communication)');
  console.log('🚀 Initiatives: 3 (strategic solutions with ROI)');
  console.log('🛠️ Solutions: 3 (detailed implementation plans)');
  console.log('📋 Tasks: 3 (execution steps with progress)');
  console.log('💬 Comments: 3 (team collaboration)');
  console.log('👍 Votes: 3 (user engagement)');
  console.log('💡 Ideas: 2 (innovation pipeline)');
  console.log('🤖 AI Features: Client model + recommendation feedback');
  console.log('');
  console.log('🎯 DEMO ACCOUNTS:');
  console.log('   👑 David Morrison (Principal): david.morrison@morrisonae.com / Admin123!');
  console.log('   🎨 Sarah Chen (Design Director): sarah.chen@morrisonae.com / Admin123!');
  console.log('   📊 Mike Rodriguez (Project Director): mike.rodriguez@morrisonae.com / Admin123!');
  console.log('   💼 Jennifer Kim (Business Dev): jennifer.kim@morrisonae.com / Admin123!');
  console.log('   ⚙️ Alex Thompson (Engineering): alex.thompson@morrisonae.com / Admin123!');
  console.log('   🏗️ Rachel Gonzalez (Senior Architect): rachel.gonzalez@morrisonae.com / Admin123!');
  console.log('');
  console.log('🚀 Ready for comprehensive Sprint 20 AI Revolution showcase!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
