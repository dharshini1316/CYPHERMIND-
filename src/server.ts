import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { env } from './config/env';
import { connectDatabase, getDatabaseStatus } from './config/database';
import { runStartupSecurityChecks } from './utils/security-checks';
import authRoutes from './routes/auth.routes';
import {
  configureHelmet,
  globalRateLimiter,
  errorHandler,
  notFoundHandler,
} from './middleware/security.middleware';
import { websocketService } from './services/websocket.service';

const app: Application = express();
const server = http.createServer(app);

// Security middleware - must be first
app.use(configureHelmet());

// Global rate limiter
app.use(globalRateLimiter);

// CORS configuration - strict allowlist
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowlist
    const allowedOrigins = env.FRONTEND_URL.split(',').map(url => url.trim());
    
    if (allowedOrigins.includes(origin)) {
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
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request sanitization and correlation ID
import {
  addCorrelationId,
  enforceContentType,
  sanitizeInput,
} from './middleware/sanitization.middleware';

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

import systemRoutes from './routes/system.routes';
app.use('/api/system', systemRoutes);

import queryRoutes from './routes/query.routes';
app.use('/api/query', queryRoutes);

import eventsRoutes from './routes/events.routes';
app.use('/api/events', eventsRoutes);

import auditRoutes from './routes/audit.routes';
app.use('/api/audit-logs', auditRoutes);

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

// Start the server
startServer();

export default app;
