import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generate analysis report using Gemini API.
 */
export const generateAnalysis = async (userData, systemPrompt) => {
  try {
    const key = process.env.GEMINI_KEY;
    if (!key || key.includes('Key')) {
       throw new Error('Geçersiz veya eksik API anahtarı. Lütfen .env dosyasını kontrol edin.');
    }

    const genAI = new GoogleGenerativeAI(key);
    // 1.5-flash veya 1.5-pro deneyelim
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const defaultPrompt = 'Sen bir yapay zeka analizörüsün. Kullanıcının yarışma verilerine bakarak analiz ve tavsiyeler üret.';
    const finalPrompt = systemPrompt || defaultPrompt;

    const userContext = `Kullanıcı Verileri:\n${JSON.stringify(userData, null, 2)}`;

    console.log('Sending to Gemini (1.5-flash)...');
    const result = await model.generateContent(`${finalPrompt}\n\n${userContext}`);

    const response = await result.response;
    const text = response.text();
    console.log('Gemini Result Text:', text);
    return text;

  } catch (error) {
    console.error('Gemini API Error details:', error);
    
    // Eğer 404 aldıysak veya başka bir API hatasıysa, üst katmana fırlat ki fallback çalışsın
    if (error.message?.includes('404') || error.message?.includes('not found')) {
       throw new Error('MODEL_NOT_FOUND');
    }
    
    throw new Error('Yapay zeka analiz oluştururken bir hata meydana geldi: ' + error.message);
  }
};