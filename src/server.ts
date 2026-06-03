import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { env } from './config/env';
import { connectDatabase, getDatabaseStatus } from './config/database';
import { runStartupSecurityChecks } from './utils/security-checks';
import authRoutes from './routes/auth.routes';
import queryRoutes from './routes/query.routes';
import eventsRoutes from './routes/events.routes';
import auditRoutes from './routes/audit.routes';
import githubRoutes from './routes/github.routes';
import securityAuditorRoutes from './routes/security-auditor.routes';
import {
  addCorrelationId,
  enforceContentType,
  sanitizeInput,
} from './middleware/sanitization.middleware';
import {
  configureHelmet,
  globalRateLimiter,
  errorHandler,
  notFoundHandler,
} from './middleware/security.middleware';
import { websocketService } from './services/websocket.service';

const app: Application = express();
app.set('trust proxy', 1); // Fix X-Forwarded-For rate limit warning
const server = http.createServer(app);

// Security middleware - must be first
app.use(configureHelmet());

// Global rate limiter
app.use(globalRateLimiter);

// CORS configuration - allow localhost dev ports
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Allow any localhost/127.0.0.1 origin during development
    if (
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('https://localhost') ||
      origin.startsWith('https://127.0.0.1')
    ) {
      return callback(null, true);
    }

    const allowed = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:5173'];
    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked CORS request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware with size limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use(addCorrelationId);
app.use(enforceContentType);
app.use(sanitizeInput);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: getDatabaseStatus(),
    environment: env.NODE_ENV
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'CypherMIND - Zero-Trust AI Governance Engine',
    version: '1.0.0',
    status: 'operational'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/security-auditor', securityAuditorRoutes);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handler - must be last
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Run security checks
    runStartupSecurityChecks();

    // Connect to MongoDB
    await connectDatabase();

    // Internal Seeding (Demo Readiness)
    const { seedDatabase } = require('./utils/seed-db');
    await seedDatabase();

    // Initialize WebSocket server
    websocketService.initialize(server);

    // Start Express server
    const PORT = parseInt(env.PORT, 10);
    server.listen(PORT, () => {
      console.log('🚀 CypherMIND Server Started');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws/events`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received. Shutting down gracefully...');
  websocketService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️  SIGINT received. Shutting down gracefully...');
  websocketService.close();
  process.exit(0);
});

// Final Safety Net: Prevent native crashes from escaping to the OS
process.on('uncaughtException', (error) => {
  console.error('🔥 [CYPHERMIND] CRITICAL RUNTIME ERROR:', error);
  // Keep process alive for demo stability
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🌊 [CYPHERMIND] UNHANDLED ASYNC REJECTION:', reason);
});

// Start the server
startServer();

export default app;
