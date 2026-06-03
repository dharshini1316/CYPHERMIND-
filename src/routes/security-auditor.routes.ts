import { Router } from 'express';
import { securityAuditorController } from '../controllers/security-auditor.controller';
import { authenticate, requireABAC } from '../middleware/auth.middleware';

const router = Router();

router.post('/analyze', authenticate, requireABAC('security-auditor:analyze'), (req, res) => securityAuditorController.analyzeFile(req, res));

export default router;
