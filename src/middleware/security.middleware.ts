import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { SecurityEvent } from '../models/SecurityEvent';

/**
 * Configure Helmet.js security headers
 */
export const configureHelmet = () => {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    // Remove X-Powered-By header
    hidePoweredBy: true,
    // Prevent clickjacking
    frameguard: {
      action: 'deny',
    },
    // HTTP Strict Transport Security (HSTS) - production only
    hsts: env.NODE_ENV === 'production' ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    } : false,
    // Prevent MIME type sniffing
    noSniff: true,
    // XSS Protection
    xssFilter: true,
    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false,
    },
  });
};

/**
 * Rate limiter for authentication endpoints
 * Strict: 5 requests per minute
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per window
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Log rate limit violations
  handler: async (req: Request, res: Response) => {
    // Log security event
    try {
      await SecurityEvent.create({
        type: 'blocked_attack',
        timestamp: new Date(),
        user_id: undefined,
        details: {
          reason: 'Rate limit exceeded on auth endpoint',
          threat_type: 'brute_force',
          ip_address: req.ip,
        },
        severity: 'high',
      });
    } catch (error) {
      console.error('Failed to log rate limit event:', error);
    }

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again later.',
        timestamp: new Date().toISOString(),
      },
    });
  },
});

/**
 * Rate limiter for query/chat endpoints
 * Moderate: 30 requests per minute
 */
export const queryRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per window
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    try {
      await SecurityEvent.create({
        type: 'blocked_attack',
        timestamp: new Date(),
        user_id: undefined,
        details: {
          reason: 'Rate limit exceeded on query endpoint',
          threat_type: 'abuse',
          ip_address: req.ip,
        },
        severity: 'medium',
      });
    } catch (error) {
      console.error('Failed to log rate limit event:', error);
    }

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please slow down.',
        timestamp: new Date().toISOString(),
      },
    });
  },
});

/**
 * Global rate limiter fallback
 * 100 requests per minute per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Centralized error handler middleware
 * Sanitizes errors and prevents information leakage
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the full error server-side
  console.error('Error occurred:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    error: {
      message: error.message,
      stack: env.NODE_ENV === 'development' ? error.stack : undefined,
    },
  });

  // Determine status code
  const statusCode = error.statusCode || error.status || 500;

  // In production, never expose internal error details
  if (env.NODE_ENV === 'production') {
    res.status(statusCode).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
        timestamp: new Date().toISOString(),
      },
    });
  } else {
    // In development, provide more details
    res.status(statusCode).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error.details,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
      path: req.path,
      timestamp: new Date().toISOString(),
    },
  });
};
