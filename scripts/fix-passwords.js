/**
 * Fix user passwords for login testing
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing user passwords for login testing...');

  try {
    // Generate new password hash for 'Admin123!'
    const newPasswordHash = await bcrypt.hash('Admin123!', 10);
    console.log('Generated new hash for Admin123!');

    // Update admin user
    await prisma.user.update({
      where: { email: 'admin@test.com' },
      data: { passwordHash: newPasswordHash }
    });
    console.log('✅ Updated admin@test.com password');

    // Update regular user
    await prisma.user.update({
      where: { email: 'user@test.com' },
      data: { passwordHash: newPasswordHash }
    });
    console.log('✅ Updated user@test.com password');

    // Test the password
    const testUser = await prisma.user.findUnique({
      where: { email: 'admin@test.com' }
    });
    
    const isValid = await bcrypt.compare('Admin123!', testUser.passwordHash);
    console.log('🧪 Password verification test:', isValid ? 'PASS' : 'FAIL');

    console.log('\n🎉 Password fix complete!');
    console.log('📋 Test accounts:');
    console.log('   Email: admin@test.com');
    console.log('   Email: user@test.com');
    console.log('   Password: Admin123!');

  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
