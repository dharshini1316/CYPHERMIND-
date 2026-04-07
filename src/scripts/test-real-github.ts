import { githubService } from '../services/github.service';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verifyGithubIntegration() {
    console.log('🧪 Starting Real GitHub Integration Test...');

    const testCode = `
import { SecurityEvent } from '../models/SecurityEvent';
// Security Fix: Masking sensitive vector inputs
export const maskInputs = (event: any) => {
  return { ...event, details: { ...event.details, masked: true } };
};
  `;

    try {
        // 1. Test Analysis
        console.log('\nStep 1: Testing Code Analysis...');
        const analysis = await githubService.analyzeCode(testCode);
        console.log('Analysis Result:', JSON.stringify(analysis, null, 2));

        // 2. Test PR Creation (Manual confirmation skip, using a test file name)
        console.log('\nStep 2: Testing Real PR Creation...');
        console.log('⚠️ This will create a real PR on dharshini1316/cypher-fix if credentials are valid.');

        // We'll use a unique file name to avoid conflicts
        const testFileName = `remidiate-test-${Date.now()}.md`;
        const prUrl = await githubService.createRemediationPR(
            'Test Security Vulnerability Detection',
            testCode,
            testFileName
        );

        console.log('✅ PR Created Successfully!');
        console.log('🔗 PR URL:', prUrl);

    } catch (error: any) {
        console.error('❌ Integration Test Failed:', error.message);
        if (error.message.includes('401')) {
            console.error('💡 Hint: Your GITHUB_PAT might be invalid or expired.');
        }
    }
}

verifyGithubIntegration();
