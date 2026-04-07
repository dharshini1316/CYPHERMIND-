import { Router } from 'express';
import { securityAuditorController } from '../controllers/security-auditor.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/security-auditor/analyze
 * @desc    Analyze file content for security vulnerabilities and remediate
 * @access  Private (Authenticated)
 */
router.post('/analyze', authenticate, (req, res) => securityAuditorController.analyzeFile(req, res));

export default router;
