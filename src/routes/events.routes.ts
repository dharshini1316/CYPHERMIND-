import { Router } from 'express';
import { getEvents, getEventStats } from '../controllers/events.controller';
import { authenticate, requireABAC } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/events
 * Full forensic event stream — admin only
 */
router.get('/', authenticate, requireABAC('events:read', 3), getEvents);

/**
 * GET /api/events/stats
 * Event statistics — all authenticated users (for role-filtered dashboard)
 */
router.get('/stats', authenticate, requireABAC('events:stats'), getEventStats);

export default router;
