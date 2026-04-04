import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. API'yi başlatıyoruz
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
// 2. Modeli seçiyoruz (1.5-flash şu an en mantıklı olanı)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Generate analysis report using Gemini API.
 */
export const generateAnalysis = async (userData, systemPrompt) => {
  try {
    const defaultPrompt = 'Sen bir yapay zeka analizörüsün. Kullanıcının yarışma verilerine bakarak analiz ve tavsiyeler üret.';
    const finalPrompt = systemPrompt || defaultPrompt;

    const userContext = `Kullanıcı Verileri:\n${JSON.stringify(userData, null, 2)}`;

    // 3. BURASI DEĞİŞTİ: Doğrudan model üzerinden çağırıyoruz
    console.log('Sending to Gemini...');
    const result = await model.generateContent(`${finalPrompt}\n\n${userContext}`);

    // 4. BURASI DEĞİŞTİ: Yanıtı metne çeviriyoruz
    const response = await result.response;
    const text = response.text();
    console.log('Gemini Result Text:', text);
    return text;

  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Yapay zeka analiz oluştururken bir hata meydana geldi.');
  }
};