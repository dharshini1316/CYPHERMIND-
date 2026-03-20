import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getDatabaseStatus } from '../config/database';
import { env } from '../config/env';
import { checkJWTSecret, checkHTTPS, checkGeminiKey } from '../utils/security-checks';

/**
 * System controller for admin endpoints
 */
export class SystemController {
  /**
   * Get security status
   * GET /api/system/security-status
   * Admin only (clearance_level >= 3)
   */
  async getSecurityStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Run security checks
      const jwtCheck = checkJWTSecret();
      const httpsCheck = checkHTTPS();
      const geminiCheck = checkGeminiKey();

      // Get database status
      const dbStatus = getDatabaseStatus();

      // Compile security status
      const securityStatus = {
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        security_controls: {
          headers: {
            active: true,
            helmet_enabled: true,
            csp_enabled: true,
            hsts_enabled: env.NODE_ENV === 'production',
          },
          rate_limiting: {
            active: true,
            auth_limit: '5 requests/minute',
            query_limit: '30 requests/minute',
            global_limit: '100 requests/minute',
          },
          authentication: {
            active: true,
            jwt_enabled: true,
            jwt_secret_strong: jwtCheck.passed,
            token_expiration: env.JWT_EXPIRATION,
            blacklist_enabled: true,
          },
          input_validation: {
            active: true,
            zod_schemas: true,
            sanitization: true,
            content_type_enforcement: true,
            size_limits: '10KB',
          },
          cors: {
            active: true,
            strict_origin_check: true,
            allowed_origins: env.FRONTEND_URL.split(',').length,
          },
          database: {
            status: dbStatus,
            connection_retry: true,
            connection_pooling: true,
          },
          logging: {
            active: true,
            security_events: true,
            audit_logs: true,
            correlation_ids: true,
          },
        },
        security_checks: {
          jwt_secret: {
            status: jwtCheck.passed ? 'pass' : 'fail',
            message: jwtCheck.message,
            severity: jwtCheck.severity,
          },
          https: {
            status: httpsCheck.passed ? 'pass' : 'fail',
            message: httpsCheck.message,
            severity: httpsCheck.severity,
          },
          gemini_api: {
            status: geminiCheck.passed ? 'pass' : 'fail',
            message: geminiCheck.message,
            severity: geminiCheck.severity,
          },
        },
        recommendations: [
          env.NODE_ENV === 'production' && !httpsCheck.passed
            ? 'Configure HTTPS in reverse proxy'
            : null,
          !jwtCheck.passed
            ? 'Use a stronger JWT secret (32+ random characters)'
            : null,
          !geminiCheck.passed
            ? 'Configure Gemini API key for Guardian and Scrubber'
            : null,
        ].filter(Boolean),
      };

      res.status(200).json({
        success: true,
        data: securityStatus,
      });
    } catch (error) {
      console.error('Failed to get security status:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve security status',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}

export const systemController = new SystemController();
