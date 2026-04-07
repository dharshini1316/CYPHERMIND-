
import { GoogleGenerativeAI } from './src/utils/gemini';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('Using API Key:', apiKey);
    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = 'Task: Conduct a professional security audit of the provided code/text file.\nInput: { "fileName": "test.js", "content": "console.log(\"hello\")" }\nOutput: A JSON object with these keys: "vulnerabilities", "summary", "corrected_code"';

    try {
        console.log('Attempting real API call...');
        const res = await model.generateContent(prompt);
        const text = res.response.text();
        console.log('Response:', text);
    } catch (error) {
        console.error('API Call failed:', error);
    }
}

test();
