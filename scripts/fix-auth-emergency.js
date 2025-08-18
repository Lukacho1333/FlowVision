#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🚨 EMERGENCY AUTH FIX: Restoring Morrison AE data...');

  try {
    // First, create or ensure Morrison AE organization exists
    const organization = await prisma.organizations.upsert({
      where: { id: 'morrison-ae' },
      update: {},
      create: {
        id: 'morrison-ae',
        name: 'Morrison Architecture & Engineering',
        slug: 'morrison-ae',
        domain: 'morrisonae.com',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log('✅ Organization created/verified:', organization.name);

    // Create Morrison AE demo users with organizationId
    const users = [
      {
        email: 'david.morrison@morrisonae.com',
        name: 'David Morrison',
        role: 'ADMIN',
        password: 'Admin123!',
      },
      {
        email: 'sarah.chen@morrisonae.com',
        name: 'Sarah Chen',
        role: 'LEADER',
        password: 'Leader123!',
      },
      {
        email: 'mike.rodriguez@morrisonae.com',
        name: 'Mike Rodriguez',
        role: 'LEADER',
        password: 'Leader123!',
      },
      {
        email: 'jennifer.kim@morrisonae.com',
        name: 'Jennifer Kim',
        role: 'LEADER',
        password: 'Leader123!',
      },
      {
        email: 'michael.morrison@morrisonae.com',
        name: 'Michael Morrison',
        role: 'ADMIN',
        password: 'principal123',
      },
    ];

    console.log('👥 Creating Morrison AE users...');
    
    for (const userData of users) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          organizationId: organization.id, // CRITICAL: Add organizationId
          email: userData.email,
          name: userData.name,
          passwordHash: await bcrypt.hash(userData.password, 10),
          role: userData.role,
          emailVerified: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      
      console.log(`✅ User created: ${user.name} (${user.email})`);
    }

    console.log('🎯 Morrison AE authentication should now work!');
    console.log('🔑 Test login credentials:');
    console.log('   david.morrison@morrisonae.com / Admin123!');
    console.log('   michael.morrison@morrisonae.com / principal123');

  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
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
