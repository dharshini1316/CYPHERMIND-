import { Router } from 'express';
import { githubController } from '../controllers/github.controller';
import { authenticate, requireABAC } from '../middleware/auth.middleware';

const router = Router();

router.post('/analyze', authenticate, requireABAC('github:create-pr'), (req, res) => githubController.analyzeCode(req, res));
router.post('/create-pr', authenticate, requireABAC('github:create-pr'), (req, res) => githubController.createPR(req, res));

export default router;
