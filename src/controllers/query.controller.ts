import { Request, Response } from 'express';
import { ragService } from '../services/rag.service';

/**
 * Query controller
 * Handles RAG query requests
 */

/**
 * Process a RAG query
 * POST /api/query
 */
export const processQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;
    const user = (req as any).user; // Attached by auth middleware

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Prompt is required and must be a string',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Process query through RAG pipeline
    const result = await ragService.query(prompt, user);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Query processing error:', error);

    // Check if it's a security violation
    if (error instanceof Error && error.message.includes('Security violation')) {
      res.status(403).json({
        error: {
          code: 'SECURITY_VIOLATION',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'QUERY_PROCESSING_FAILED',
        message: 'Failed to process your query. Please try again.',
        timestamp: new Date().toISOString(),
      },
    });
  }
};
