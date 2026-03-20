import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { AuditLog } from '../models/AuditLog';

/**
 * Authentication controller
 */
export class AuthController {
  /**
   * Handle user login
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Request body is already validated by middleware
      const { email, password } = req.body;

      // Authenticate user
      const authResponse = await authService.login(email, password);

      // Log successful authentication
      await AuditLog.create({
        action: 'login',
        user_id: authResponse.user.id,
        resource: 'auth',
        result: 'success',
        metadata: {
          email: email,
          ip_address: req.ip
        }
      });

      res.status(200).json({
        success: true,
        data: authResponse
      });
    } catch (error) {
      // Log failed authentication attempt
      if (req.body.email) {
        await AuditLog.create({
          action: 'login',
          user_id: null as any, // No user ID for failed login
          resource: 'auth',
          result: 'failure',
          metadata: {
            email: req.body.email,
            ip_address: req.ip,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }).catch(() => {}); // Ignore audit log errors
      }

      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Invalid credentials',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Handle user logout
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      const user = (req as any).user; // Attached by auth middleware
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization token is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Invalidate token
      await authService.logout(token, user?.user_id);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Failed to logout',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

export const authController = new AuthController();
