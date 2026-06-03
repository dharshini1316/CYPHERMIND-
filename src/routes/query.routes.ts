import { Router } from 'express';
import { processQuery } from '../controllers/query.controller';
import { authenticate, requireABAC } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { querySchema } from '../schemas/query.schemas';

const router = Router();

/**
 * POST /api/query
 * All authenticated users can query — ABAC + Guardian enforce what they can access
 */
router.post('/', authenticate, requireABAC('query:restricted'), validateRequest(querySchema), processQuery);

export default router;
