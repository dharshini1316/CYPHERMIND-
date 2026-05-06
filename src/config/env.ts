import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define environment variable schema
const envSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),
  MONGODB_DB_NAME: z.string().min(1, 'MongoDB database name is required'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRATION: z.string().default('24h'),
  GEMINI_API_KEY: z.string().min(1, 'Gemini API key is required'),
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  GITHUB_PAT: z.string().min(1, 'GitHub PAT is required'),
  GITHUB_REPO: z.string().min(1, 'GitHub repository is required'),
  USE_LOCAL_DB: z.string().default('false'),
});

// Validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment variable validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const env = parseEnv();

// Export structured config
export const config = {
  mongodb: {
    uri: env.MONGODB_URI,
    dbName: env.MONGODB_DB_NAME,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiration: env.JWT_EXPIRATION,
  },
  gemini: {
    apiKey: env.GEMINI_API_KEY,
  },
  server: {
    port: parseInt(env.PORT, 10),
    nodeEnv: env.NODE_ENV,
    frontendUrl: env.FRONTEND_URL,
  },
  github: {
    pat: env.GITHUB_PAT,
    repo: env.GITHUB_REPO,
  },
  security: {
    useLocalDb: env.USE_LOCAL_DB === 'true',
  }
};
