import { Request, Response, NextFunction } from 'express';
import { validateToken, TokenPayload } from '../utils/jwt';
import { AuditLog } from '../models/AuditLog';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

// ─── RBAC Permission Matrix ────────────────────────────────────────────────
// Defines what each role is allowed to do at the API level
export const RBAC_PERMISSIONS: Record<string, string[]> = {
  security_admin: [
    'query:all',
    'events:read',
    'events:stats',
    'audit:read',
    'system:status',
    'github:create-pr',
    'security-auditor:analyze',
  ],
  junior_employee: [
    'query:restricted',
    'events:stats',
  ],
};

// ─── ABAC Attribute Policy ─────────────────────────────────────────────────
// Fine-grained access based on user attributes + resource attributes
export interface ABACContext {
  userRole: string;
  clearanceLevel: number;
  resourceClearance?: number;
  action: string;
}

export const evaluateABAC = (ctx: ABACContext): { allowed: boolean; reason: string } => {
  // Rule 1: Clearance level must meet or exceed resource clearance
  if (ctx.resourceClearance !== undefined && ctx.clearanceLevel < ctx.resourceClearance) {
    return {
      allowed: false,
      reason: `Insufficient clearance. Required: ${ctx.resourceClearance}, Your level: ${ctx.clearanceLevel}`,
    };
  }

  // Rule 2: Role must have the required permission
  const permissions = RBAC_PERMISSIONS[ctx.userRole] || [];
  const hasPermission = permissions.some(p => {
    if (p === ctx.action) return true;
    // Wildcard match: 'query:all' covers 'query:restricted'
    const [pResource] = p.split(':');
    const [aResource] = ctx.action.split(':');
    return pResource === aResource && p.endsWith(':all');
  });

  if (!hasPermission) {
    return {
      allowed: false,
      reason: `Role '${ctx.userRole}' does not have permission for action '${ctx.action}'`,
    };
  }

  return { allowed: true, reason: 'Access granted' };
};

// ─── Middleware: JWT Authentication ───────────────────────────────────────
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: { code: 'MISSING_TOKEN', message: 'Authorization token is required', timestamp: new Date().toISOString() }
      });
      return;
    }

    const token = authHeader.substring(7);
    const payload = validateToken(token);
    req.user = payload;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token validation failed';
    res.status(401).json({
      error: { code: 'INVALID_TOKEN', message, timestamp: new Date().toISOString() }
    });
  }
};

// ─── Middleware: RBAC — require minimum clearance level ───────────────────
export const requireClearance = (minLevel: number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required' } });
      return;
    }

    if (req.user.clearance_level < minLevel) {
      logAccessDenial(req.user, `clearance:${minLevel}`, 'INSUFFICIENT_CLEARANCE');
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_CLEARANCE',
          message: `This resource requires clearance level ${minLevel}. Your level: ${req.user.clearance_level}`,
          timestamp: new Date().toISOString(),
        }
      });
      return;
    }
    next();
  };
};

// ─── Middleware: RBAC — require specific role ─────────────────────────────
export const authorize = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required' } });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logAccessDenial(req.user, `role:${roles.join('|')}`, 'INSUFFICIENT_ROLE');
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `This action requires one of these roles: ${roles.join(', ')}. Your role: ${req.user.role}`,
          timestamp: new Date().toISOString(),
        }
      });
      return;
    }
    next();
  };
};

// ─── Middleware: ABAC — evaluate full attribute policy ────────────────────
export const requireABAC = (action: string, resourceClearance?: number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required' } });
      return;
    }

    const result = evaluateABAC({
      userRole: req.user.role,
      clearanceLevel: req.user.clearance_level,
      resourceClearance,
      action,
    });

    if (!result.allowed) {
      logAccessDenial(req.user, action, 'ABAC_DENIED');
      res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: result.reason,
          timestamp: new Date().toISOString(),
        }
      });
      return;
    }
    next();
  };
};

// ─── Helper: Log access denial to audit trail ─────────────────────────────
const logAccessDenial = async (user: TokenPayload, resource: string, code: string): Promise<void> => {
  try {
    await AuditLog.create({
      action: 'access_denied',
      user_id: user.user_id,
      resource,
      result: 'failure',
      timestamp: new Date(),
      metadata: { code, role: user.role, clearance_level: user.clearance_level },
    });
  } catch { /* non-blocking */ }
};
