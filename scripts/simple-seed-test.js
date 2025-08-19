/**
 * Simple Test Seed Script
 * Creates minimal data for testing Sprint 20 AI features
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating minimal test data for Sprint 20 AI testing...');

  try {
    // Create organization first
    const org = await prisma.organizations.upsert({
      where: { slug: 'test-org' },
      update: {},
      create: {
        id: 'test-org-123',
        name: 'Test Organization',
        slug: 'test-org',
        domain: 'test.com',
        planTier: 'PROFESSIONAL',
        settings: {},
        isActive: true,
        updatedAt: new Date()
      }
    });

    console.log('✅ Organization created:', org.name);

    // Create admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        name: 'Test Admin',
        passwordHash,
        role: 'ADMIN',
        organizationId: org.id,
        preferences: {
          dashboardLayout: 'default',
          notificationPreferences: ['all'],
          aiAssistanceLevel: 'high'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Admin user created:', admin.email);

    // Create regular user
    const user = await prisma.user.upsert({
      where: { email: 'user@test.com' },
      update: {},
      create: {
        email: 'user@test.com',
        name: 'Test User',
        passwordHash,
        role: 'LEADER',
        organizationId: org.id,
        preferences: {
          dashboardLayout: 'default',
          notificationPreferences: ['important'],
          aiAssistanceLevel: 'medium'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Regular user created:', user.email);

    console.log('📝 Skipping detailed test data - basic accounts are ready for testing');

    // Create AI client model for testing
    const aiModel = await prisma.aIClientModel.upsert({
      where: { organizationId: org.id },
      update: {},
      create: {
        organizationId: org.id,
        modelData: {
          version: '1.0',
          patterns: {
            categories: ['Technology', 'Process', 'Quality'],
            priorities: ['HIGH', 'MEDIUM', 'LOW'],
            keywords: ['AI', 'testing', 'automation', 'system']
          },
          confidence: 0.75,
          training: {
            lastTraining: new Date().toISOString(),
            feedbackCount: 0,
            accuracyScore: 0.8
          }
        },
        confidenceThreshold: 0.7,
        learningEnabled: true,
        totalFeedbackCount: 0,
        positiveFeedbackRate: 0.8,
        version: '1.0.0',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ AI Client Model created for organization');

    console.log('\n🎉 Test data creation complete!');
    console.log('\n📋 Test Accounts:');
    console.log('   Admin: admin@test.com / admin123');
    console.log('   User:  user@test.com / admin123');
    console.log('\n🏢 Organization: Test Organization (test-org)');
    console.log('🤖 AI Model: Ready for testing Sprint 20 features');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
