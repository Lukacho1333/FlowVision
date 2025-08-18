#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🏗️ EMERGENCY: Restoring Morrison AE comprehensive demo data...');

  try {
    // Get Morrison AE organization
    const organization = await prisma.organizations.findUnique({
      where: { id: 'morrison-ae' },
    });

    if (!organization) {
      throw new Error('Morrison AE organization not found - run fix-auth-emergency.js first');
    }

    const users = await prisma.user.findMany({
      where: { organizationId: organization.id },
    });

    console.log(`✅ Found ${users.length} Morrison AE users`);

    // Create comprehensive initiatives for Morrison AE
    const initiatives = [
      {
        title: 'CAD Software Stability Enhancement',
        problem: 'Frequent CAD software crashes during large project renderings causing delays and lost work',
        goal: 'Achieve 99% uptime for CAD workstations and implement automatic backup systems',
        kpis: ['Reduce crash incidents by 90%', 'Implement 15-minute auto-save', 'Zero data loss tolerance'],
        requirements: ['Hardware upgrade assessment', 'Software optimization', 'Backup system implementation'],
        acceptanceCriteria: ['CAD crash rate < 1% per month', 'Auto-save functional on all workstations', 'Full project recovery capability'],
        status: 'PLANNING',
        progress: 15,
        difficulty: 8,
        roi: 85,
        priorityScore: 92,
        budget: 75000,
        estimatedHours: 320,
        phase: 'planning',
        type: 'Technology',
      },
      {
        title: 'Project Approval Workflow Optimization',
        problem: 'Current approval process takes weeks, causing client dissatisfaction and project delays',
        goal: 'Reduce approval timeline from 3 weeks to 5 business days while maintaining quality standards',
        kpis: ['Approval time < 5 days', 'Client satisfaction > 90%', 'Quality score maintained'],
        requirements: ['Process mapping', 'Digital approval system', 'Staff training'],
        acceptanceCriteria: ['Average approval time under 5 days', 'Zero quality compromises', 'Client feedback > 4.5/5'],
        status: 'ACTIVE',
        progress: 35,
        difficulty: 6,
        roi: 120,
        priorityScore: 88,
        budget: 45000,
        estimatedHours: 240,
        phase: 'implementation',
        type: 'Process Improvement',
      },
      {
        title: 'Junior Architect Mentorship Program',
        problem: 'New junior architects struggle with design review process and company standards',
        goal: 'Establish structured mentorship program with 90% retention rate for new hires',
        kpis: ['New hire retention > 90%', 'Time to productivity < 6 months', 'Mentor satisfaction > 85%'],
        requirements: ['Mentorship framework', 'Training materials', 'Progress tracking system'],
        acceptanceCriteria: ['Program launched with 10+ mentors', 'All new hires assigned mentors', 'Quarterly progress reviews'],
        status: 'PLANNING',
        progress: 25,
        difficulty: 4,
        roi: 95,
        priorityScore: 75,
        budget: 25000,
        estimatedHours: 160,
        phase: 'planning',
        type: 'Strategic',
      },
      {
        title: 'File Version Control System',
        problem: 'Confusing file versioning leads to team members working on outdated plans',
        goal: 'Implement centralized version control with real-time collaboration capabilities',
        kpis: ['Version conflicts eliminated', 'File access time < 30 seconds', 'Team collaboration score > 4/5'],
        requirements: ['Version control software', 'File server upgrade', 'Team training'],
        acceptanceCriteria: ['Zero version conflicts', 'All files centrally managed', 'Team adoption > 95%'],
        status: 'ACTIVE',
        progress: 60,
        difficulty: 7,
        roi: 110,
        priorityScore: 85,
        budget: 35000,
        estimatedHours: 200,
        phase: 'implementation',
        type: 'Technology',
      },
      {
        title: 'Client Communication Enhancement',
        problem: 'Inconsistent client communication during construction phase across project teams',
        goal: 'Standardize client communication with weekly updates and 24-hour response guarantee',
        kpis: ['Response time < 24 hours', 'Client satisfaction > 92%', 'Communication frequency weekly'],
        requirements: ['Communication templates', 'CRM integration', 'Team training'],
        acceptanceCriteria: ['Standard templates deployed', 'Response time tracking active', 'Client feedback system operational'],
        status: 'PLANNING',
        progress: 10,
        difficulty: 5,
        roi: 75,
        priorityScore: 70,
        budget: 20000,
        estimatedHours: 120,
        phase: 'planning',
        type: 'Process Improvement',
      },
    ];

    console.log('🎯 Creating comprehensive initiatives...');

    for (const initiativeData of initiatives) {
      // Assign to random user
      const randomUser = users[Math.floor(Math.random() * users.length)];
      
      const initiative = await prisma.initiative.create({
        data: {
          ...initiativeData,
          ownerId: randomUser.id,
          timelineStart: new Date(),
          timelineEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Created initiative: ${initiative.title}`);
    }

    // Create business profiles for users
    console.log('👔 Creating business profiles...');
    
    const principalUser = users.find(u => u.email.includes('david.morrison'));
    if (principalUser) {
      await prisma.businessProfile.upsert({
        where: { userId: principalUser.id },
        update: {},
        create: {
          organizationId: organization.id,
          userId: principalUser.id,
          industry: 'Architecture & Engineering',
          size: 75,
          metrics: {
            revenue: 12500000,
            projects: 85,
            employees: 75,
            clients: 125,
            averageProjectValue: 147000,
            utilizationRate: 87,
            profitMargin: 15.2,
            clientRetention: 92,
            growth: {
              revenue: 8.5,
              employees: 12.0,
              projects: 15.8
            },
            specialties: ['Commercial Architecture', 'Residential Design', 'Urban Planning', 'Sustainable Design'],
            locations: ['Seattle, WA', 'Portland, OR', 'San Francisco, CA'],
            certifications: ['LEED', 'AIA', 'NCARB']
          },
        },
      });
      console.log('✅ Created business profile for principal');
    }

    // Update existing issues to ensure they're comprehensive
    console.log('📊 Enhancing existing issues...');
    
    const existingIssues = await prisma.issue.findMany({
      where: { organizationId: organization.id },
    });

    for (const issue of existingIssues) {
      await prisma.issue.update({
        where: { id: issue.id },
        data: {
          keywords: ['architecture', 'workflow', 'efficiency', 'technology'],
          aiSummary: `Morrison AE operational challenge: ${issue.description.substring(0, 100)}...`,
          aiConfidence: Math.floor(Math.random() * 20) + 80, // 80-99%
          aiGeneratedAt: new Date(),
          aiVersion: 'gpt-4',
          qualityScore: Math.floor(Math.random() * 20) + 80,
          completenessScore: Math.floor(Math.random() * 15) + 85,
        },
      });
    }

    console.log('🎉 Morrison AE comprehensive demo data restored successfully!');
    console.log(`📈 Summary:`);
    console.log(`   • Organization: Morrison Architecture & Engineering`);
    console.log(`   • Users: ${users.length} executive team members`);
    console.log(`   • Issues: ${existingIssues.length} operational challenges`);
    console.log(`   • Initiatives: 5 strategic improvement projects`);
    console.log(`   • Business Profile: Complete AE firm metrics`);
    console.log('');
    console.log('🔑 Login with: david.morrison@morrisonae.com / Admin123!');

  } catch (error) {
    console.error('❌ Restoration failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('💥 Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
