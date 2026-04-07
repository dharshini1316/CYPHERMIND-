
import { GoogleGenerativeAI } from '../gemini';

describe('GoogleGenerativeAI (Mock)', () => {
    let genAI: GoogleGenerativeAI;
    let model: any;

    beforeEach(() => {
        // Force mock mode
        genAI = new GoogleGenerativeAI('FORCE_MOCK_KEY');
        model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    });

    it('should return valid JSON for security audit prompts in mock mode', async () => {
        const prompt = 'Task: Conduct a professional security audit of the provided code/text file.\nInput: { "fileName": "config.ts", "content": "db_uri: \\"mongodb://...\\"" }';

        const res = await model.generateContent(prompt);
        const text = res.response.text();

        expect(text).toMatch(/\{[\s\S]*\}/);
        const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)![0]);

        expect(parsed).toHaveProperty('vulnerabilities');
        expect(parsed).toHaveProperty('summary');
        expect(parsed).toHaveProperty('corrected_code');
        expect(Array.isArray(parsed.vulnerabilities)).toBe(true);
    });

    it('should identify hardcoded secrets in mock security audit', async () => {
        const prompt = 'Task: Conduct a professional security audit of the provided code/text file.\nInput: { "fileName": "config.ts", "content": "db_uri: \\"mongodb://...\\", aws_key: \\"AKIA...\\"" }';

        const res = await model.generateContent(prompt);
        const parsed = JSON.parse(res.response.text().match(/\{[\s\S]*\}/)![0]);

        expect(parsed.vulnerabilities.some((v: any) => v.type === 'Hardcoded Credentials')).toBe(true);
    });
});
