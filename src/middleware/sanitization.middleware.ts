import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SecurityEvent } from '../models/SecurityEvent';

/**
 * Extended Request interface with correlation ID
 */
export interface SanitizedRequest extends Request {
  correlationId?: string;
}

/**
 * Add correlation ID to each request for tracing
 */
export const addCorrelationId = (
  req: SanitizedRequest,
  res: Response,
  next: NextFunction
): void => {
  req.correlationId = uuidv4();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
};

/**
 * Enforce Content-Type for JSON endpoints
 */
export const enforceContentType = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip for GET requests and health checks
  if (req.method === 'GET' || req.path === '/health') {
    return next();
  }

  const contentType = req.headers['content-type'];

  if (!contentType || !contentType.includes('application/json')) {
    return res.status(415).json({
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Content-Type must be application/json',
        timestamp: new Date().toISOString(),
      },
    });
  }

  next();
};

/**
 * Dangerous property names that should be stripped
 */
const DANGEROUS_PROPS = ['__proto__', 'constructor', 'prototype'];

/**
 * Dangerous MongoDB operators
 */
const DANGEROUS_OPERATORS = ['$where'];

/**
 * Maximum object nesting depth
 */
const MAX_DEPTH = 5;

/**
 * Maximum string field length
 */
const MAX_STRING_LENGTH = 10000;

/**
 * Check if object nesting exceeds maximum depth
 */
const checkDepth = (obj: any, currentDepth: number = 0): boolean => {
  if (currentDepth > MAX_DEPTH) {
    return false;
  }

  if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (!checkDepth(obj[key], currentDepth + 1)) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Sanitize object by removing dangerous properties and operators
 */
const sanitizeObject = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    // Trim strings
    if (typeof obj === 'string') {
      return obj.trim();
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};

  for (const key in obj) {
    // Skip dangerous properties
    if (DANGEROUS_PROPS.includes(key)) {
      continue;
    }

    // Skip dangerous MongoDB operators
    if (DANGEROUS_OPERATORS.includes(key)) {
      continue;
    }

    // Recursively sanitize nested objects
    sanitized[key] = sanitizeObject(obj[key]);

    // Enforce max string length
    if (typeof sanitized[key] === 'string' && sanitized[key].length > MAX_STRING_LENGTH) {
      sanitized[key] = sanitized[key].substring(0, MAX_STRING_LENGTH);
    }
  }

  return sanitized;
};

/**
 * Advanced input sanitization middleware
 */
export const sanitizeInput = async (
  req: SanitizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check object depth
    if (!checkDepth(req.body)) {
      // Log security event
      await SecurityEvent.create({
        type: 'blocked_attack',
        timestamp: new Date(),
        user_id: undefined,
        details: {
          reason: 'Object nesting exceeds maximum depth',
          threat_type: 'injection',
          ip_address: req.ip,
          correlation_id: req.correlationId,
        },
        severity: 'high',
      });

      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Request structure is too complex',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check for dangerous properties before sanitization
    const hasDangerousProps = (obj: any): boolean => {
      if (typeof obj !== 'object' || obj === null) {
        return false;
      }

      for (const key in obj) {
        if (DANGEROUS_PROPS.includes(key) || DANGEROUS_OPERATORS.includes(key)) {
          return true;
        }
        if (hasDangerousProps(obj[key])) {
          return true;
        }
      }

      return false;
    };

    if (hasDangerousProps(req.body)) {
      // Log injection attempt
      await SecurityEvent.create({
        type: 'blocked_attack',
        timestamp: new Date(),
        user_id: undefined,
        details: {
          reason: 'Dangerous property or operator detected',
          threat_type: 'injection',
          ip_address: req.ip,
          correlation_id: req.correlationId,
        },
        severity: 'critical',
      });

      return res.status(400).json({
        error: {
          code: 'INJECTION_ATTEMPT',
          message: 'Request contains potentially malicious content',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Sanitize request body
    req.body = sanitizeObject(req.body);

    // Sanitize query parameters
    req.query = sanitizeObject(req.query);

    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    
    res.status(500).json({
      error: {
        code: 'SANITIZATION_ERROR',
        message: 'Failed to process request',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Log rejected sanitization attempts
 */
export const logSanitizationViolation = async (
  type: 'INVALID_INPUT' | 'INJECTION_ATTEMPT',
  req: SanitizedRequest,
  reason: string
): Promise<void> => {
  try {
    await SecurityEvent.create({
      type: 'blocked_attack',
      timestamp: new Date(),
      user_id: undefined,
      details: {
        reason,
        threat_type: type === 'INJECTION_ATTEMPT' ? 'injection' : 'invalid_input',
        ip_address: req.ip,
        correlation_id: req.correlationId,
        path: req.path,
        method: req.method,
      },
      severity: type === 'INJECTION_ATTEMPT' ? 'critical' : 'medium',
    });
  } catch (error) {
    console.error('Failed to log sanitization violation:', error);
  }
};
