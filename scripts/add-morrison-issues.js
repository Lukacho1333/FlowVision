#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Adding Morrison AE demo issues...');

  try {
    // Get Morrison AE organization and users
    const organization = await prisma.organizations.findUnique({
      where: { id: 'morrison-ae' },
    });

    if (!organization) {
      throw new Error('Morrison AE organization not found');
    }

    const users = await prisma.user.findMany({
      where: { organizationId: organization.id },
    });

    if (users.length === 0) {
      throw new Error('No Morrison AE users found');
    }

    console.log(`✅ Found ${users.length} Morrison AE users`);

    // Sample issues for Morrison AE
    const issues = [
      {
        description: 'CAD software frequently crashes during large project renderings, causing delays and lost work',
        category: 'Systems',
        department: 'Design',
        heatmapScore: 85,
        votes: 12,
      },
      {
        description: 'Project approval workflow takes too long, with clients waiting weeks for design revisions',
        category: 'Process',
        department: 'Project Management',
        heatmapScore: 78,
        votes: 8,
      },
      {
        description: 'New junior architects struggle with our design review process and company standards',
        category: 'People',
        department: 'Human Resources',
        heatmapScore: 65,
        votes: 6,
      },
      {
        description: 'File versioning system is confusing, leading to team members working on outdated plans',
        category: 'Systems',
        department: 'Operations',
        heatmapScore: 70,
        votes: 9,
      },
      {
        description: 'Client communication during construction phase is inconsistent across project teams',
        category: 'Process',
        department: 'Client Relations',
        heatmapScore: 60,
        votes: 5,
      },
    ];

    console.log('🏗️ Creating issues...');

    for (const issueData of issues) {
      // Assign to random user
      const randomUser = users[Math.floor(Math.random() * users.length)];
      
      const issue = await prisma.issue.create({
        data: {
          organizationId: organization.id,
          description: issueData.description,
          category: issueData.category,
          department: issueData.department,
          heatmapScore: issueData.heatmapScore,
          votes: issueData.votes,
          authorId: randomUser.id,
          status: 'OPEN',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Created issue: ${issue.description.substring(0, 50)}...`);
    }

    console.log('🎯 Morrison AE demo issues created successfully!');

  } catch (error) {
    console.error('❌ Failed to add issues:', error);
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
