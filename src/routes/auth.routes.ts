import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { loginSchema } from '../schemas/auth.schemas';
import { authRateLimiter } from '../middleware/security.middleware';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 * Rate limited: 5 requests per minute
 */
router.post(
  '/login',
  authRateLimiter,
  validateRequest(loginSchema),
  (req, res) => authController.login(req, res)
);

/**
 * POST /api/auth/logout
 * Invalidate user's JWT token
 */
router.post('/logout', (req, res) => authController.logout(req, res));

export default router;
