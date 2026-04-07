import { Request, Response } from 'express';
import { securityAuditorService } from '../services/security-auditor.service';
import { AuditLog } from '../models/AuditLog';

/**
 * Security Auditor Controller
 * handles file upload and security analysis requests.
 */
export class SecurityAuditorController {
    /**
     * Analyze file content for security vulnerabilities
     * POST /api/security-auditor/analyze
     */
    async analyzeFile(req: Request, res: Response): Promise<void> {
        try {
            const { content, fileName } = req.body;
            const user = (req as any).user;

            if (!content) {
                res.status(400).json({ success: false, error: 'File content is required' });
                return;
            }

            console.log(`[SecurityAuditorController] 🕵️ Starting audit for ${fileName || 'unnamed_file'}...`);
            const auditResult = await securityAuditorService.analyzeVulnerableFile(content, fileName);

            // Log the audit attempt
            await AuditLog.create({
                action: 'security_file_audit',
                user_id: user?.user_id || 'anonymous',
                resource: 'security_auditor',
                result: 'success',
                timestamp: new Date(),
                metadata: {
                    file_name: fileName,
                    risks_found: auditResult.vulnerabilities.length,
                    severity_summary: auditResult.summary
                }
            });

            res.status(200).json({
                success: true,
                data: auditResult
            });
        } catch (error: any) {
            console.error('[SecurityAuditorController] Audit failed:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to perform security audit'
            });
        }
    }
}

export const securityAuditorController = new SecurityAuditorController();
