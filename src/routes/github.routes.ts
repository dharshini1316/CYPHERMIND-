import { Router } from 'express';
import { githubController } from '../controllers/github.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/github/analyze
 * @desc    Analyze code for duplicates before PR creation
 * @access  Private (Authenticated)
 */
router.post('/analyze', authenticate, (req, res) => githubController.analyzeCode(req, res));

/**
 * @route   POST /api/github/create-pr
 * @desc    Create a real remediation Pull Request
 * @access  Private (Authenticated)
 */
router.post('/create-pr', authenticate, (req, res) => githubController.createPR(req, res));

export default router;
