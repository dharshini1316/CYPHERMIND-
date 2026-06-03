import { Router } from 'express';
import { getAuditLogs, getAuditStats } from '../controllers/audit.controller';
import { authenticate, requireABAC } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, requireABAC('audit:read', 3), getAuditLogs);
router.get('/stats', authenticate, requireABAC('audit:read', 3), getAuditStats);

export default router;
