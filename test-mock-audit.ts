
import { GoogleGenerativeAI } from './src/utils/gemini';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    // Force mock mode by using a non-standard API key (or any key that triggers the constructor's mock logic)
    const genAI = new GoogleGenerativeAI('INVALID_KEY_TO_FORCE_MOCK');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = 'Task: Conduct a professional security audit of the provided code/text file.\nInput: { "fileName": "config.ts", "content": "export const config = { db_uri: \\"mongodb://...\\" }" }\nOutput: A JSON object with these keys: "vulnerabilities", "summary", "corrected_code"';

    try {
        console.log('Testing Mock Model...');
        const res = await model.generateContent(prompt);
        const text = res.response.text();
        console.log('Response:', text);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('Successfully parsed JSON!');
            console.log('Vulnerabilities found:', parsed.vulnerabilities.length);
        } else {
            console.error('Failed to find JSON in response');
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
