import { Router } from 'express';
import { processQuery } from '../controllers/query.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { querySchema } from '../schemas/query.schemas';

const router = Router();

/**
 * POST /api/query
 * Process a RAG query
 * Requires authentication
 */
router.post(
  '/',
  authenticate,
  validateRequest(querySchema),
  processQuery
);

export default router;
