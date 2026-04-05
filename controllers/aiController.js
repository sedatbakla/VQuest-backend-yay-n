import Analysis from '../models/Analysis.js';
import Notification from '../models/Notification.js';
import SystemConfig from '../models/SystemConfig.js';
import { generateAnalysis } from '../services/geminiServices.js';

// @desc    Kişisel Analiz Başlatma
// @route   POST /api/ai/analysis
// @access  Private
export const startAnalysis = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : 'dummy-user-id'; // Fallback for testing without auth
    
    // In a real app, you would aggregate user's stats from DB
    // Here we'll simulate some stats for the API scope
    const userStats = {
      playedCategories: ['Yazılım Geliştirme', 'Tarih'],
      correctPercentage: 75,
      averageResponseTime: '12s',
      lastCompetitions: 5
    };

    let systemPromptConfig = await SystemConfig.findOne({ key: 'AI_PROMPT' });
    let promptText = systemPromptConfig ? systemPromptConfig.value : '';

    const analysisText = await generateAnalysis(userStats, promptText);

    const newAnalysis = await Analysis.create({
      userId,
      analysisText
    });

    res.status(202).json({
      _id: newAnalysis._id,
      analysisText: newAnalysis.analysisText
    });

  } catch (error) {
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
