import { Request, Response } from 'express';
import { githubService } from '../services/github.service';
import { AuditLog } from '../models/AuditLog';

/**
 * GitHub Remediation Controller
 * handles PR creation and code analysis.
 */
export class GitHubController {
    /**
     * Analyze code for duplicates before PR creation
     * POST /api/github/analyze
     */
    async analyzeCode(req: Request, res: Response): Promise<void> {
        try {
            const { code } = req.body;
            if (!code) {
                res.status(400).json({ success: false, error: 'Code content is required' });
                return;
            }

            const analysis = await githubService.analyzeCode(code);
            res.status(200).json({ success: true, data: analysis });
        } catch (error: any) {
            console.error('[GitHubController] Analysis failed:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Create a real Pull Request
     * POST /api/github/create-pr
     */
    async createPR(req: Request, res: Response): Promise<void> {
        try {
            const { issue, suggestedFix, fileName } = req.body;
            const user = (req as any).user;

            if (!issue || !suggestedFix) {
                res.status(400).json({
                    success: false,
                    error: { code: 'MISSING_DATA', message: 'Issue and suggested fix are required' }
                });
                return;
            }

            console.log(`[GitHubController] 🚀 Initiating Real PR for: ${issue.substring(0, 50)}...`);
            const prUrl = await githubService.createRemediationPR(issue, suggestedFix, fileName);

            // Log successful remediation
            await AuditLog.create({
                action: 'github_pr_created_real',
                user_id: user?.user_id || 'anonymous',
                resource: 'github_remediation',
                result: 'success',
                timestamp: new Date(),
                metadata: { pr_url: prUrl, issue: issue.substring(0, 100) }
            });

            res.status(200).json({ success: true, data: { pr_url: prUrl } });
        } catch (error: any) {
            console.error('[GitHubController] PR creation failed:', error);
            res.status(500).json({
                success: false,
                error: { code: 'GITHUB_ERROR', message: error.message || 'Failed to create real GitHub PR' }
            });
        }
    }
}

export const githubController = new GitHubController();
