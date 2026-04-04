import Analysis from '../models/Analysis.js';
import Notification from '../models/Notification.js';
import SystemConfig from '../models/SystemConfig.js';
import { generateAnalysis } from '../services/geminiServices.js';

// @desc    Kişisel Analiz Başlatma
// @route   POST /api/ai/analysis
// @access  Private
export const startAnalysis = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const { performanceData } = req.body; // Array of { category, isCorrect }

    // Aggregate performance by category
    const stats = performanceData ? performanceData.reduce((acc, curr) => {
      if (!acc[curr.category]) acc[curr.category] = { correct: 0, total: 0 };
      acc[curr.category].total += 1;
      if (curr.isCorrect) acc[curr.category].correct += 1;
      return acc;
    }, {}) : {};

    const userStats = {
      performance: stats,
      totalQuestions: performanceData?.length || 0,
      timestamp: new Date().toISOString()
    };
    
    console.log('--- AI Analysis Start ---');
    console.log('User Stats:', JSON.stringify(userStats));

    let systemPromptConfig = await SystemConfig.findOne({ key: 'AI_PROMPT' });
    let promptText = systemPromptConfig ? systemPromptConfig.value : 'Kullanıcının bu oyundaki performansını analiz et ve SADECE 1 CÜMLELİK kısa bir tavsiye veya geri bildirim ver. Başka hiçbir şey yazma. Türkçe cevap ver.';

    const finalPrompt = promptText + "\nDİKKAT KATI KURAL: Vereceğin yanıt istisnasız SADECE VE SADECE 1 CÜMLE olacaktır. Ne olursa olsun ikinci bir cümleye geçme!";
    console.log('Final Prompt:', finalPrompt);

    let analysisText;
    try {
      // 30 saniye timeout ekleyelim
      const analysisPromise = generateAnalysis(userStats, finalPrompt);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI timeout')), 30000)
      );
      analysisText = await Promise.race([analysisPromise, timeoutPromise]);
      console.log('AI Analysis Result:', analysisText);
    } catch (aiErr) {
      console.error('AI Error during generation:', aiErr);
      
      // FALLBACK: AI çalışmazsa kullanıcıya boş dönmek yerine istatistiklerden basit rapor üretelim
      const topCategory = Object.entries(stats).sort((a,b) => b[1].total - a[1].total)[0];
      const categoryName = topCategory ? topCategory[0] : 'Genel';
      const accuracy = topCategory ? Math.round((topCategory[1].correct / topCategory[1].total) * 100) : 0;
      
      analysisText = `${categoryName} kategorisindeki performansın %${accuracy} seviyesinde. ${accuracy > 70 ? 'Harika bir iş çıkardın, böyle devam et!' : 'Biraz daha pratik yaparak bu alanda kendini geliştirebilirsin.'}`;
      console.log('Using Fallback Analysis:', analysisText);
    }

    const newAnalysis = await Analysis.create({
      userId,
      analysisText
    });

    res.status(202).json({
      _id: newAnalysis._id,
      analysisText: newAnalysis.analysisText
    });

  } catch (error) {
    console.error('General AI Controller Error:', error);
    res.status(400).json({ message: error.message || 'Analiz başlatılamadı' });
  }
};

// @desc    Analiz Sonucu Görüntüleme
// @route   GET /api/ai/reports/:reportId
// @access  Private
export const getReport = async (req, res) => {
  try {
    const report = await Analysis.findById(req.params.reportId);

    if (!report) {
      return res.status(404).json({ message: 'Rapor bulunamadı' });
    }

    res.status(200).json({
      _id: report._id,
      analysisText: report.analysisText
    });
  } catch (error) {
    res.status(400).json({ message: 'Rapor getirilemedi' });
  }
};

// @desc    Eski Analizleri Silme
// @route   DELETE /api/ai/reports/:reportId
// @access  Private
export const deleteReport = async (req, res) => {
  try {
    const report = await Analysis.findById(req.params.reportId);

    if (!report) {
      return res.status(404).json({ message: 'Rapor bulunamadı' });
    }

    await report.deleteOne();

    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: 'Rapor silinemedi' });
  }
};

// @desc    Yapay Zeka Komutu Güncelleme
// @route   PUT /api/admin/ai/prompt
// @access  Private/Admin
export const updateAiPrompt = async (req, res) => {
  try {
    const { promptText } = req.body;

    if (!promptText) {
      return res.status(400).json({ message: 'promptText gereklidir' });
    }

    let config = await SystemConfig.findOne({ key: 'AI_PROMPT' });

    if (config) {
      config.value = promptText;
      await config.save();
    } else {
      config = await SystemConfig.create({
        key: 'AI_PROMPT',
        value: promptText
      });
    }

    res.status(200).json({ message: 'Prompt güncellendi' });
  } catch (error) {
    res.status(400).json({ message: 'Prompt güncellenemedi' });
  }
};
