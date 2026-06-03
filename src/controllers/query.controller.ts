import { Request, Response } from 'express';
import { ragService } from '../services/rag.service';

export const processQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;
    const user = (req as any).user;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Prompt is required', timestamp: new Date().toISOString() },
      });
      return;
    }

    const result = await ragService.query(prompt, user);
    res.status(200).json({ success: true, data: result });

  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    const statusCode = error.status || 500;

    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'QUERY_PROCESSING_FAILED',
        message: msg,
        timestamp: new Date().toISOString(),
        // Pass ABAC decision through so frontend can display it
        abac_decision: error.abac_decision || null,
      },
    });
  }
};
