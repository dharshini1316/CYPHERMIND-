import { connectDatabase } from '../config/database';
import { seedUsers } from './seed-users';
import { seedDocuments } from './seed-documents';
import { seedEvents } from './seed-events';

/**
 * Master seed script
 * Seeds all test data: users, documents, and security events
 */
async function seedAll() {
  try {
    console.log('🚀 CypherMIND - Seeding All Test Data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to MongoDB\n');

    // Seed users
    console.log('Step 1/3: Seeding Users');
    console.log('─────────────────────────────────────────');
    await seedUsers();
    console.log('');

    // Seed documents
    console.log('Step 2/3: Seeding Documents');
    console.log('─────────────────────────────────────────');
    await seedDocuments();
    console.log('');

    // Seed security events
    console.log('Step 3/3: Seeding Security Events');
    console.log('─────────────────────────────────────────');
    await seedEvents();
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All test data seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎯 Next Steps:');
    console.log('1. Create vector search index in MongoDB Atlas');
    console.log('   See: src/scripts/create-vector-index.ts');
    console.log('2. Start the server: npm run dev');
    console.log('3. Test login with seeded users');
    console.log('4. Try querying the RAG pipeline\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedAll()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { seedAll };
