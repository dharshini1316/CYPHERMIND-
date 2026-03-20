import { Router } from 'express';
import { getAuditLogs, getAuditStats } from '../controllers/audit.controller';
import { authenticate, requireClearance } from '../middleware/auth.middleware';

const router = Router();

/**
 * All audit routes require Security_Admin role (clearance level 3)
 */

/**
 * GET /api/audit-logs
 * Get audit logs with filters
 * Requires: Security_Admin (clearance level 3)
 */
router.get(
  '/',
  authenticate,
  requireClearance(3),
  getAuditLogs
);

/**
 * GET /api/audit-logs/stats
 * Get audit statistics
 * Requires: Security_Admin (clearance level 3)
 */
router.get(
  '/stats',
  authenticate,
  requireClearance(3),
  getAuditStats
);

export default router;
