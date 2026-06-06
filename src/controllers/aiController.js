import Analysis from '../models/Analysis.js';
import Notification from '../models/Notification.js';
import SystemConfig from '../models/SystemConfig.js';
import User from '../models/User.js';
import { generateAnalysis } from '../services/geminiServices.js';

// @desc    Mevcut AI Promptu Getir
// @route   GET /api/admin/ai/prompt
// @access  Private/Admin
export const getAiPrompt = async (req, res) => {
  try {
    const config = await SystemConfig.findOne({ key: 'AI_PROMPT' });
    const promptText = config ? config.value : 'Kullanıcının bu oyundaki performansını analiz et ve SADECE 1 CÜMLELİK kısa bir tavsiye veya geri bildirim ver. Başka hiçbir şey yazma. Türkçe cevap ver.';
    res.status(200).json({ promptText });
  } catch (error) {
    res.status(500).json({ message: 'Prompt alınamadı' });
  }
};

// @desc    Kişisel Analiz Başlatma
// @route   POST /api/ai/analysis
// @access  Private
export const startAnalysis = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const performanceData = req.body?.performanceData; // Array of { category, isCorrect }

    let userStats;
    let isManualStart = false;

    if (performanceData && performanceData.length > 0) {
      // Aggregate performance by category
      const stats = performanceData.reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = { correct: 0, total: 0 };
        acc[curr.category].total += 1;
        if (curr.isCorrect) acc[curr.category].correct += 1;
        return acc;
      }, {});

      userStats = {
        type: 'Oyun Sonu Performans Analizi',
        performance: stats,
        totalQuestions: performanceData.length,
        timestamp: new Date().toISOString()
      };
    } else {
      // Manual start from AnalysisScreen without performanceData
      isManualStart = true;
      let user = null;
      if (userId) user = await User.findById(userId);
      
      userStats = {
        type: 'Genel Profil Analizi',
        globalScore: user ? user.score : 0,
        level: user ? (user.score > 500 ? 'İleri' : user.score > 100 ? 'Orta' : 'Başlangıç') : 'Başlangıç',
        message: 'Kullanıcı genel profil değerlendirmesi talep ediyor.',
        timestamp: new Date().toISOString()
      };
    }
    
    console.log('--- AI Analysis Start ---');
    console.log('User Stats:', JSON.stringify(userStats));

    let systemPromptConfig = await SystemConfig.findOne({ key: 'AI_PROMPT' });
    let promptText = systemPromptConfig ? systemPromptConfig.value : 'Kullanıcının bu performansını analiz et ve SADECE 1 CÜMLELİK kısa bir tavsiye veya geri bildirim ver. Başka hiçbir şey yazma. Türkçe cevap ver.';

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
      
      // FALLBACK: AI çalışmazsa kullanıcıya boş dönmek yerine istatistiklerden akıllıca bir rapor üretelim
      if (isManualStart) {
        const score = userStats.globalScore;
        if (score >= 500) {
          const variants = [
            `Muazzam bir gelişim gösteriyorsun! Toplam ${score} puan ile ileri seviyedesin, zihinsel reflekslerin çok keskin.`,
            `${score} puanla rakiplerine fark atıyorsun, stratejik zekan ve bilgi birikimin üst seviyede.`,
            `Harika! ${score} puan toplamak kolay değil, bu alandaki ustalığını kanıtlamış durumdasın.`
          ];
          analysisText = variants[Math.floor(Math.random() * variants.length)];
        } else if (score >= 100) {
          const variants = [
            `Gelişim potansiyelin yüksek. Şu ana kadar ${score} puan topladın, istikrarlı pratikle zirveye çıkabilirsin.`,
            `Ortalama bir performansın var (${score} puan), farklı kategorilerde kendini zorlayarak bir üst seviyeye geçebilirsin.`,
            `Doğru yoldasın! ${score} puana ulaşmışsın, detaylara biraz daha odaklanırsan hatalarını kolayca kapatırsın.`
          ];
          analysisText = variants[Math.floor(Math.random() * variants.length)];
        } else {
          const variants = [
            `Henüz yolun başındasın (${score} puan). Her yeni soru senin için bir öğrenme fırsatı, denemekten vazgeçme.`,
            `Temel becerilerini geliştirmek için harika bir noktadasın, sabırla devam edersen puanların hızla artacaktır.`,
            `Küçük adımlarla büyük başarılar gelir; mevcut puanını artırmak için sevdiğin kategorilere ağırlık ver.`
          ];
          analysisText = variants[Math.floor(Math.random() * variants.length)];
        }
      } else {
        const stats = userStats.performance;
        const entries = Object.entries(stats);
        if (entries.length > 0) {
          const topCategory = entries.sort((a,b) => b[1].total - a[1].total)[0];
          const categoryName = topCategory[0];
          const accuracy = Math.round((topCategory[1].correct / topCategory[1].total) * 100);
          
          if (accuracy >= 80) {
            analysisText = `${categoryName} alanındaki bilgin gerçekten etkileyici, neredeyse kusursuz bir performans sergiledin!`;
          } else if (accuracy >= 50) {
            analysisText = `${categoryName} kategorisinde fena sayılmazsın, spesifik konularda pratik yapmak seni zirveye taşıyacaktır.`;
          } else {
            analysisText = `${categoryName} soruları şu an için zorlamış olabilir, ancak moral bozmadan eksiklerini kapatmaya odaklanabilirsin.`;
          }
        } else {
          analysisText = 'Son performansın hakkında yeterli veri bulunamadı, ancak bol bol pratik yaparak kendini her zaman geliştirebilirsin.';
        }
      }
      
      console.log('Using Fallback Analysis:', analysisText);
    }

    const newAnalysis = await Analysis.create({
      userId,
      analysisText
    });

    res.status(202).json({
      _id: newAnalysis._id,
      analysisText: newAnalysis.analysisText,
      createdAt: newAnalysis.createdAt
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
      analysisText: report.analysisText,
      createdAt: report.createdAt
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
