import { mongoose } from '../utils/mongoose.shim';
import { env, config } from './env';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

/**
 * Connect to MongoDB with automated fallback
 * 1. Try Atlas (if USE_LOCAL_DB is false)
 * 2. Fallback to Local Mock Mode if Atlas fails or if forced
 */
export const connectDatabase = async (): Promise<void> => {
  const useLocal = config.security.useLocalDb;

  if (useLocal) {
    console.log('🏗️  Database: Local Mock Mode Active (Pure JS - No Binary)');
    // No-op for mock mode, models handle themselves via mock-db-provider
    return;
  }

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      console.log(`📡 Connecting to MongoDB Atlas (Attempt ${retries + 1}/${MAX_RETRIES})...`);
      await mongoose.connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 5000,
      });

      console.log('✅ MongoDB Atlas connected successfully');
      return;
    } catch (error: any) {
      retries++;
      console.warn(`⚠️  Atlas connection failed: ${error.message}`);

      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  console.error('❌ Could not connect to MongoDB Atlas. Defaulting to Local Mock Mode...');
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
  }
};

export const getDatabaseStatus = (): string => {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const baseStatus = states[mongoose.connection.readyState] || 'unknown';
  return config.security.useLocalDb ? `Mock Mode (JS)` : baseStatus;
};
