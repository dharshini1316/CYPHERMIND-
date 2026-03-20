import { Request, Response, NextFunction } from 'express';
import { validateToken, TokenPayload } from '../utils/jwt';

/**
 * Extend Express Request to include user payload
 */
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * JWT authentication middleware
 * Validates JWT token and attaches user payload to request
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    // Validate token
    const payload = validateToken(token);

    // Attach user payload to request
    req.user = payload;

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token validation failed';

    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: errorMessage,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Clearance level middleware factory
 * Creates middleware that requires a minimum clearance level
 * @param minLevel - Minimum required clearance level (1-3)
 * @returns Express middleware function
 */
export const requireClearance = (minLevel: number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // Ensure user is authenticated
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Check clearance level
    if (req.user.clearance_level < minLevel) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_CLEARANCE',
          message: 'You do not have permission to access this resource',
          details: {
            required_level: minLevel,
            user_level: req.user.clearance_level
          },
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};
