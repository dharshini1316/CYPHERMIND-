import { mongoose } from '../utils/mongoose.shim';
import { MongoClient } from 'mongodb';
import { env, config } from './env';

const SHARDS = [
  'ac-8iy7xp9-shard-00-00.pitogjd.mongodb.net:27017',
  'ac-8iy7xp9-shard-00-01.pitogjd.mongodb.net:27017',
  'ac-8iy7xp9-shard-00-02.pitogjd.mongodb.net:27017',
];

/**
 * Auto-detect the current primary shard.
 * Atlas re-elects primaries periodically — this ensures we always connect to the right one.
 */
const findPrimaryURI = async (): Promise<string> => {
  const pass = env.MONGODB_URI.match(/CypherMind:([^@]+)@/)?.[1] || config.mongodb.uri.split(':')[2]?.split('@')[0];
  const user = 'CypherMind';
  const db = env.MONGODB_DB_NAME;

  for (const shard of SHARDS) {
    const uri = `mongodb://${user}:${pass}@${shard}/${db}?authSource=admin&tls=true&directConnection=true`;
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 4000 });
    try {
      await client.connect();
      const status = await client.db('admin').command({ isMaster: 1 });
      await client.close();
      if (status.ismaster || status.isWritablePrimary) {
        console.log(`🎯 Primary shard detected: ${shard}`);
        return uri;
      }
    } catch {
      try { await client.close(); } catch { /* ignore */ }
    }
  }

  // Fallback to the URI in .env if detection fails
  console.warn('⚠️  Could not auto-detect primary, using .env URI');
  return env.MONGODB_URI;
};

export const connectDatabase = async (): Promise<void> => {
  if (config.security.useLocalDb) {
    console.log('🏗️  Database: Local Mock Mode Active');
    return;
  }

  console.log('🔍 Auto-detecting MongoDB primary shard...');
  const uri = await findPrimaryURI();

  let retries = 0;
  while (retries < 3) {
    try {
      console.log(`📡 Connecting to MongoDB Atlas (Attempt ${retries + 1}/3)...`);
      await mongoose.connect(uri, {
        dbName: env.MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 8000,
      });
      console.log('✅ MongoDB Atlas connected successfully');
      console.log(`📊 Database: ${env.MONGODB_DB_NAME}`);

      mongoose.connection.on('error', (err: Error) => console.error('❌ MongoDB error:', err));
      mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
      return;
    } catch (error: any) {
      retries++;
      console.warn(`⚠️  Connection failed: ${error.message}`);
      if (retries < 3) await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.error('❌ Could not connect to MongoDB Atlas after 3 attempts.');
  process.exit(1);
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting:', error);
  }
};

export const getDatabaseStatus = (): string => {
  if (config.security.useLocalDb) return 'Mock Mode (JS)';
  const states: Record<number, string> = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return states[mongoose.connection.readyState] || 'unknown';
};
