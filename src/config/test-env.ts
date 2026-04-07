/**
 * Test environment configuration
 * Sets up environment variables for testing
 */

// Set test environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.MONGODB_DB_NAME = 'cyphermind_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long';
process.env.JWT_EXPIRATION = '24h';
// Use real Gemini API key for integration tests
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
process.env.PORT = '3001';
process.env.FRONTEND_URL = 'http://localhost:5173';
