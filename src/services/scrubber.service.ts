import { GoogleGenerativeAI } from '../utils/gemini';
import { env } from '../config/env';
import { SecurityEvent } from '../models/SecurityEvent';

/**
 * PII types that can be detected
 */
export type PIIType = 'email' | 'ssn' | 'phone' | 'credit_card' | 'name' | 'address' | 'date_of_birth';

/**
 * PII match information
 */
export interface PIIMatch {
  type: PIIType;
  original: string;
  placeholder: string;
  start: number;
  end: number;
}

/**
 * Redaction result
 */
export interface RedactionResult {
  redacted_chunks: string[];
  redactions: PIIMatch[];
  redactions_count: number;
}

/**
 * Regex patterns for PII detection
 */
const PII_PATTERNS = {
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    placeholder: '[REDACTED_EMAIL]',
  },
  ssn: {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    placeholder: '[REDACTED_SSN]',
  },
  phone: {
    pattern: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    placeholder: '[REDACTED_PHONE]',
  },
  credit_card: {
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    placeholder: '[REDACTED_CC]',
  },
};

/**
 * The Scrubber - Semantic Redaction Engine
 * Detects and redacts PII from text using dual-pass approach:
 * 1. Regex-based detection (fast, pattern-matching)
 * 2. Semantic detection with Gemini (contextual, AI-powered)
 */
export class ScrubberService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Redact PII from document chunks
   * @param chunks - Array of document chunks to redact
   * @param userId - User ID for logging (optional)
   * @returns Redaction result with redacted chunks and redaction details
   */
  async redact(chunks: string[], userId?: string): Promise<RedactionResult> {
    try {
      const allRedactions: PIIMatch[] = [];
      const redactedChunks: string[] = [];

      let chunkIdx = 0;
      for (const chunk of chunks) {
        chunkIdx++;
        console.log(`[Scrubber] Redacting chunk ${chunkIdx}/${chunks.length}...`);

        // Pass 1: Regex-based PII detection
        const { redactedText: regexRedacted, matches: regexMatches } =
          this.detectRegexPII(chunk);
        console.log(`[Scrubber] Regex pass complete. Found ${regexMatches.length} matches.`);

        // Pass 2: Semantic PII detection with Gemini
        const { redactedText: finalRedacted, matches: semanticMatches } =
          await this.detectSemanticPII(regexRedacted);
        console.log(`[Scrubber] Semantic pass complete. Found ${semanticMatches.length} matches.`);

        redactedChunks.push(finalRedacted);
        allRedactions.push(...regexMatches, ...semanticMatches);
      }

      // Log redaction events
      if (allRedactions.length > 0) {
        await this.logRedactionEvent(allRedactions, userId);
      }

      return {
        redacted_chunks: redactedChunks,
        redactions: allRedactions,
        redactions_count: allRedactions.length,
      };
    } catch (error) {
      console.error('Redaction failed:', error);
      throw new Error(`Redaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pass 1: Detect PII using regex patterns
   * @param text - Text to scan for PII
   * @returns Redacted text and matches
   */
  private detectRegexPII(text: string): { redactedText: string; matches: PIIMatch[] } {
    let redactedText = text;
    const matches: PIIMatch[] = [];

    // Scan for each PII type
    for (const [type, config] of Object.entries(PII_PATTERNS)) {
      const pattern = new RegExp(config.pattern);
      let match;

      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          type: type as PIIType,
          original: match[0],
          placeholder: config.placeholder,
          start: match.index,
          end: match.index + match[0].length,
        });

        // Replace PII with placeholder
        redactedText = redactedText.replace(match[0], config.placeholder);
      }
    }

    return { redactedText, matches };
  }

  /**
   * Pass 2: Detect contextual PII using Gemini
   * @param text - Text to scan for contextual PII
   * @returns Redacted text and matches
   */
  private async detectSemanticPII(text: string): Promise<{ redactedText: string; matches: PIIMatch[] }> {
    try {
      // Skip if text is already heavily redacted
      if (text.includes('[REDACTED_') && text.split('[REDACTED_').length > 5) {
        return { redactedText: text, matches: [] };
      }

      const prompt = `
Task: Identify PII (names, addresses, IDs) in text that pattern matching might miss.
Input: { "text": "${text}" }
Output: A JSON array of objects with "text", "type", "start", "end".
Constraints: Types must be: name, address, date_of_birth, account_number. Return [] if none.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      // Parse Gemini response
      const piiMatches = this.parseGeminiResponse(response);

      // Redact detected PII
      let redactedText = text;
      const matches: PIIMatch[] = [];

      // Sort matches by position (descending) to avoid index shifting
      piiMatches.sort((a, b) => b.start - a.start);

      for (const match of piiMatches) {
        const placeholder = `[REDACTED_${match.type.toUpperCase()}]`;

        matches.push({
          type: match.type as PIIType,
          original: match.text,
          placeholder,
          start: match.start,
          end: match.end,
        });

        // Replace PII with placeholder
        redactedText =
          redactedText.substring(0, match.start) +
          placeholder +
          redactedText.substring(match.end);
      }

      return { redactedText, matches };
    } catch (error) {
      // console.error('Semantic PII detection failed:', error); // Log strictly to avoid Windows native crashes
      // Return original text if semantic detection fails
      return { redactedText: text, matches: [] };
    }
  }

  /**
   * Parse Gemini response to extract PII matches
   * @param response - Gemini API response
   * @returns Array of PII matches
   */
  private parseGeminiResponse(response: string): Array<{ text: string; type: string; start: number; end: number }> {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(item =>
        item.text && item.type &&
        typeof item.start === 'number' &&
        typeof item.end === 'number'
      );
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      return [];
    }
  }

  /**
   * Log redaction event to SecurityEvent collection
   * @param redactions - Array of redactions performed
   * @param userId - User ID (optional)
   */
  private async logRedactionEvent(redactions: PIIMatch[], userId?: string): Promise<void> {
    try {
      // Group redactions by type
      const redactionsByType = redactions.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      await SecurityEvent.create({
        type: 'redaction',
        timestamp: new Date(),
        user_id: userId,
        details: {
          pii_type: Object.keys(redactionsByType).join(', '),
          redactions_count: redactions.length,
          redactions_by_type: redactionsByType,
        },
        severity: 'medium',
      });
    } catch (error) {
      console.error('Failed to log redaction event:', error);
    }
  }
}

export const scrubberService = new ScrubberService();
