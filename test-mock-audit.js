
const { GoogleGenerativeAI } = require('./dist/utils/gemini');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
    try {
        const genAI = new GoogleGenerativeAI('FORCE_MOCK_KEY');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = 'Task: Conduct a professional security audit of the provided code/text file.\nInput: { "fileName": "config.ts", "content": "db_uri: \\"mongodb://...\\"" }';

        console.log('Testing Mock Model (JS)...');
        const res = await model.generateContent(prompt);
        const text = res.response.text();
        console.log('Response:', text);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('✅ Successfully parsed JSON!');
            console.log('Vulnerabilities found:', parsed.vulnerabilities.length);
        } else {
            console.error('❌ Failed to find JSON in response');
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
