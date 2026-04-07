import { z } from 'zod';

/**
 * Query request schema with NoSQL injection prevention
 */
export const querySchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt cannot be empty')
    .max(2000, 'Prompt is too long')
    .refine(
      (val) => {
        // Prevent NoSQL injection characters
        const dangerousChars = /[${}]/;
        return !dangerousChars.test(val);
      },
      { message: 'Prompt contains invalid characters' }
    ),
  token: z.string().optional() // Token is in header, but can be in body for some clients
});

/**
 * Query request type
 */
export type QueryRequest = z.infer<typeof querySchema>;

/**
 * RAG response schema for LLM output validation
 */
export const ragResponseSchema = z.object({
  answer: z.string().min(1, 'Answer cannot be empty'),
  sources: z.array(z.object({
    document_id: z.string(),
    chunk_index: z.number(),
    relevance_score: z.number()
  })),
  redactions_count: z.number().min(0),
  processing_time_ms: z.number().min(0)
});

/**
 * RAG response type
 */
export type RAGResponse = z.infer<typeof ragResponseSchema>;
