import { GoogleGenerativeAI } from '../utils/gemini';
import { env } from '../config/env';

export interface AuditResult {
    vulnerabilities: {
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        line?: number;
    }[];
    original_code: string;
    corrected_code: string;
    summary: string;
}

/**
 * Security Auditor Service
 * Performs AI-driven vulnerability analysis and remediation on uploaded files.
 */
export class SecurityAuditorService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    /**
     * Analyze file content for security vulnerabilities
     * @param content - Raw file content
     * @param fileName - Optional file name for context
     */
    async analyzeVulnerableFile(content: string, fileName: string = 'unknown'): Promise<AuditResult> {
        console.log(`[SecurityAuditor] 🔎 Auditing file: ${fileName}`);

        try {
            const prompt = `
Task: Conduct a professional security audit of the provided code/text file.
Input: { "fileName": "${fileName}", "content": "${content.substring(0, 10000)}" }

Output: A JSON object with these keys:
- "vulnerabilities": Array of { "type", "severity", "description", "line" }
- "summary": A brief professional summary of the risks found.
- "corrected_code": The entire file content with all identified vulnerabilities fixed.

Constraints:
1. Focus on: SQL Injection, XSS, Hardcoded Credentials, PII leaks, and broken access control.
2. The "corrected_code" MUST be a complete, drop-in replacement.
3. Be clinical and professional. Output MUST be raw JSON only.`;

            const result = await this.genAI.withRetry(async () => {
                const res = await this.model.generateContent(prompt);
                return res.response.text();
            });

            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error('[SecurityAuditor] Invalid AI Response Format. Raw output:', result);
                throw new Error('AI failed to generate a valid security audit report format.');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                vulnerabilities: parsed.vulnerabilities || [],
                original_code: content,
                corrected_code: parsed.corrected_code || content,
                summary: parsed.summary || 'Audit complete. No major vulnerabilities identified.'
            };
        } catch (error) {
            console.error('[SecurityAuditor] Audit failed:', error);
            throw new Error(`Security Audit Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

export const securityAuditorService = new SecurityAuditorService();
