import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
  try {
    const list = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels(); // This is not how listModels works in new versions
    // Actually listModels is often on the root genAI or you have to fetch it differently.
    // In newer SDKs, you use:
    // const results = await genAI.listModels(); 
     console.log('Fetching models...');
     // Not available directly on genAI in all versions, let's try fetch:
     const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_KEY}`);
     const data = await response.json();
     console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('List models failed:', err);
  }
}

listModels();
