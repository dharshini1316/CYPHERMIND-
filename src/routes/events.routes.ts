import { Router } from 'express';
import { getEvents, getEventStats } from '../controllers/events.controller';
import { authenticate, requireClearance } from '../middleware/auth.middleware';

const router = Router();

/**
 * All event routes require Security_Admin role (clearance level 3)
 */

/**
 * GET /api/events
 * Get security events with filters
 * Requires: Security_Admin (clearance level 3)
 */
router.get(
  '/',
  authenticate,
  requireClearance(3),
  getEvents
);

/**
 * GET /api/events/stats
 * Get event statistics
 * Requires: Security_Admin (clearance level 3)
 */
router.get(
  '/stats',
  authenticate,
  requireClearance(3),
  getEventStats
);

export default router;
