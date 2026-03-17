import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

/**
 * Generate analysis report using Gemini API.
 * 
 * @param {Object} userData - User performance data (e.g. correct/wrong answers, time).
 * @param {String} systemPrompt - Prompt retrieved from SystemConfig (or default).
 * @returns {String} - Generated analysis text.
 */
export const generateAnalysis = async (userData, systemPrompt) => {
  try {
    const defaultPrompt = 'Sen bir yapay zeka analizörüsün. Kullanıcının yarışma verilerine bakarak analiz ve tavsiyeler üret.';
    const finalPrompt = systemPrompt || defaultPrompt;
    
    const userContext = `Kullanıcı Verileri:\n${JSON.stringify(userData, null, 2)}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${finalPrompt}\n\n${userContext}`,
    });

    return response.text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Yapay zeka analiz oluştururken bir hata meydana geldi.');
  }
};
