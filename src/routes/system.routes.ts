import { Router } from 'express';
import { systemController } from '../controllers/system.controller';
import { authenticate, requireClearance } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/system/security-status
 * Get comprehensive security status
 * Admin only (clearance_level >= 3)
 */
router.get(
  '/security-status',
  authenticate,
  requireClearance(3),
  (req: any, res: any) => systemController.getSecurityStatus(req, res)
);

export default router;
