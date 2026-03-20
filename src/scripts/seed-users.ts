import { connectDatabase } from '../config/database';
import { authService } from '../services/auth.service';
import { User } from '../models/User';

/**
 * Seed users for testing
 * Creates junior_employee and security_admin users
 */
async function seedUsers() {
  try {
    console.log('🌱 Seeding users...');

    // Check if users already exist
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log(`⚠️  Found ${existingUsers} existing users. Skipping user creation.`);
      console.log('💡 To recreate users, delete them from MongoDB first.');
      return;
    }

    // Create junior employee (clearance level 1)
    const juniorEmployee = await authService.createUser(
      'junior@cyphermind.com',
      'Junior123!',
      1,
      'junior_employee'
    );
    console.log('✅ Created junior_employee:', juniorEmployee.email);

    // Create security admin (clearance level 3)
    const securityAdmin = await authService.createUser(
      'admin@cyphermind.com',
      'Admin123!',
      3,
      'security_admin'
    );
    console.log('✅ Created security_admin:', securityAdmin.email);

    // Create additional test users
    const standardUser = await authService.createUser(
      'user@cyphermind.com',
      'User123!',
      2,
      'junior_employee'
    );
    console.log('✅ Created standard user:', standardUser.email);

    console.log('\n📋 Test User Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Junior Employee (Clearance 1):');
    console.log('  Email: junior@cyphermind.com');
    console.log('  Password: Junior123!');
    console.log('');
    console.log('Standard User (Clearance 2):');
    console.log('  Email: user@cyphermind.com');
    console.log('  Password: User123!');
    console.log('');
    console.log('Security Admin (Clearance 3):');
    console.log('  Email: admin@cyphermind.com');
    console.log('  Password: Admin123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ User seeding complete!');
  } catch (error) {
    console.error('❌ Failed to seed users:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  connectDatabase()
    .then(() => seedUsers())
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { seedUsers };
