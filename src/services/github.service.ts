import { config } from '../config/env';

export interface AnalysisResult {
    isDuplicate: boolean;
    similarity: number;
    existingFile?: string;
    suggestion?: string;
}

/**
 * GitHub Remediation Service
 * Handles automated PR creation for security vulnerabilities.
 */
export class GitHubService {
    private readonly baseUrl = 'https://api.github.com';
    private readonly pat = config.github.pat;
    private readonly repo = this.normalizeRepo(config.github.repo);

    private normalizeRepo(repo: string): string {
        if (repo.includes('github.com/')) {
            return repo.split('github.com/')[1].replace(/\/$/, '');
        }
        return repo.trim();
    }

    /**
     * Fetch all files in the repository recursively
     */
    private async fetchRepoFiles(): Promise<{ path: string; url: string }[]> {
        const headers = {
            'Authorization': `token ${this.pat}`,
            'Accept': 'application/vnd.github.v3+json'
        };

        try {
            // Get default branch
            const repoRes = await fetch(`${this.baseUrl}/repos/${this.repo}`, { headers });
            if (repoRes.status !== 200) return [];
            const repoData: any = await repoRes.json();
            const branch = repoData.default_branch || 'main';

            // Get recursive tree
            const treeRes = await fetch(`${this.baseUrl}/repos/${this.repo}/git/trees/${branch}?recursive=1`, { headers });
            const treeData: any = await treeRes.json();

            if (!treeData.tree) return [];
            return treeData.tree.filter((item: any) => item.type === 'blob');
        } catch (e) {
            return [];
        }
    }

    /**
     * Analyze code for duplicates and similarity
     */
    async analyzeCode(newCode: string): Promise<AnalysisResult> {
        console.log(`[GitHubService] 🔍 Analyzing code for repository: ${this.repo}`);
        try {
            const files = await this.fetchRepoFiles();
            const headers = { 'Authorization': `token ${this.pat}` };

            for (const file of files) {
                // Skip large files or non-code files
                if (!file.path.match(/\.(ts|js|py|go|java|cpp|txt|md)$/)) continue;

                try {
                    const fileRes = await fetch(file.url, { headers });
                    const fileData: any = await fileRes.json();
                    const existingContent = Buffer.from(fileData.content, 'base64').toString('utf-8');

                    // Exact match
                    if (existingContent.trim() === newCode.trim()) {
                        return {
                            isDuplicate: true,
                            similarity: 1.0,
                            existingFile: file.path,
                            suggestion: `Exact duplicate found in ${file.path}. Please modify the existing file instead of creating a new one.`
                        };
                    }

                    // Simple similarity detection
                    if (existingContent.includes(newCode.substring(0, 100)) || newCode.includes(existingContent.substring(0, 100))) {
                        return {
                            isDuplicate: false,
                            similarity: 0.8,
                            existingFile: file.path,
                            suggestion: `Similar logic detected in ${file.path}. Consider refactoring or merging your changes into this file.`
                        };
                    }
                } catch (e) {
                    continue;
                }
            }

            return { isDuplicate: false, similarity: 0 };
        } catch (error) {
            console.error('[GitHubService] Analysis failed:', error);
            return { isDuplicate: false, similarity: 0 };
        }
    }

    /**
     * Create a real Pull Request
     * (With Demo Mode fallback if GITHUB_PAT is missing or invalid)
     */
    async createRemediationPR(issue: string, suggestedFix: string, fileName: string = 'SECURITY_FIX.md'): Promise<string> {
        console.log(`[GitHubService] 🛡️ Initiating Real PR Pipeline for ${this.repo}`);
        const headers = {
            'Authorization': `token ${this.pat}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        const branchName = `security-fix-${Date.now()}`;

        try {
            // 1. Get Default Branch & SHA
            const repoRes = await fetch(`${this.baseUrl}/repos/${this.repo}`, { headers });
            const repoData: any = await repoRes.json();
            const defaultBranch = repoData.default_branch || 'main';

            const refRes = await fetch(`${this.baseUrl}/repos/${this.repo}/git/ref/heads/${defaultBranch}`, { headers });
            const refData: any = await refRes.json();

            let latestCommitSha: string;

            // Handle Empty Repository case or missing branch
            if (refRes.status !== 200 || !refData.object || !refData.object.sha) {
                console.log(`[GitHubService] ℹ️ Repository or branch ${defaultBranch} appears empty/missing. Initializing...`);

                // Create an initial commit to establish the branch
                const initRes = await fetch(`${this.baseUrl}/repos/${this.repo}/contents/README.md`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({
                        message: 'initial commit: initialized via CypherMIND',
                        content: Buffer.from('# CypherMIND Security Repository\n\nRemediation and governance log repository.').toString('base64')
                    })
                });

                const initData: any = await initRes.json();
                if (initRes.status !== 201) {
                    throw new Error(`Failed to initialize repository: ${initData.message || 'Unknown Error'}`);
                }
                latestCommitSha = initData.commit.sha;
            } else {
                latestCommitSha = refData.object.sha;
            }

            // 2. Create New Branch
            const createBranchRes = await fetch(`${this.baseUrl}/repos/${this.repo}/git/refs`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: latestCommitSha })
            });
            const createBranchData: any = await createBranchRes.json();
            if (createBranchRes.status !== 201) {
                console.error(`[GitHubService] ❌ Branch Creation Failed (Status ${createBranchRes.status}):`, createBranchData.message);
                throw new Error(`Failed to create branch: ${createBranchData.message || 'Unknown Error'}`);
            }

            // 3. Commit File (Checking for existing SHA to avoid "sha wasn't supplied" error)
            const getFileRes = await fetch(`${this.baseUrl}/repos/${this.repo}/contents/${fileName}?ref=${branchName}`, { headers });
            let existingSha: string | undefined;
            if (getFileRes.status === 200) {
                const existingFileData: any = await getFileRes.json();
                existingSha = existingFileData.sha;
                console.log(`[GitHubService] ℹ️ Updating existing file: ${fileName} (sha: ${existingSha})`);
            }

            const contentBase64 = Buffer.from(suggestedFix).toString('base64');
            const fileRes = await fetch(`${this.baseUrl}/repos/${this.repo}/contents/${fileName}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    message: `security(fix): remediate ${issue.substring(0, 30)}...`,
                    content: contentBase64,
                    branch: branchName,
                    sha: existingSha // Required for updates
                })
            });
            const fileData: any = await fileRes.json();
            if (fileRes.status !== 201 && fileRes.status !== 200) {
                console.error(`[GitHubService] ❌ File Commit Failed (Status ${fileRes.status}):`, fileData.message);
                throw new Error(`Failed to commit file: ${fileData.message || 'Unknown Error'}`);
            }

            // 4. Create Pull Request
            const prRes = await fetch(`${this.baseUrl}/repos/${this.repo}/pulls`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: `🛡️ Security Fix: ${issue.substring(0, 50)}...`,
                    body: `## CypherMIND Autonomous Remediation\n\n**Issue**: ${issue}\n\n**Analysis**: Refactored logic to address security vulnerability.\n\nGenerated by CypherMIND Engine.`,
                    head: branchName,
                    base: defaultBranch
                })
            });

            const prData: any = await prRes.json();
            if (prRes.status !== 201) {
                console.error(`[GitHubService] ❌ PR Creation Failed (Status ${prRes.status}):`, prData.message);
                throw new Error(`PR Creation Failed: ${prData.message || 'Unknown Error'}`);
            }

            console.log(`[GitHubService] ✅ Real PR Created: ${prData.html_url}`);
            return prData.html_url;
        } catch (error: any) {
            console.error('[GitHubService] ❌ Real PR Integration Failed:', error.message);
            throw error; // Propagate error for proper UI feedback
        }
    }
}

export const githubService = new GitHubService();
