import Suggestion from '../models/Suggestion.js';
import { sendToQueue } from '../../services/rabbitService.js';

// @desc    Soru Önerisi Yapma
// @route   POST /api/suggestions
// @access  Private (Madde 24)
export const makeSuggestion = async (req, res) => {
  try {
    const { questionText, options, correctAnswer, category } = req.body;

    // "undefined" metni string olarak gelirse veritabanı çökmesin diye null yapıyoruz
    const safeCategory = (category === 'undefined' || !category) ? undefined : category;

    const newSuggestion = await Suggestion.create({
      user: req.user._id,
      questionText,
      options,
      correctAnswer,
      category: safeCategory,
      status: 'pending' // Varsayılan değer
    });

    // RabbitMQ'ya bildirim gönder (opsiyonel — başarısız olursa öneri yine kaydedilir)
    try {
      await sendToQueue({
        type: 'SUGGESTION_CREATED',
        message: 'Sisteme yeni bir soru önerisi yapıldı!',
        suggestionId: newSuggestion._id,
        userId: req.user._id,
        timestamp: new Date()
      });
    } catch (mqErr) {
      console.warn('[Suggestion] RabbitMQ bildirimi gönderilemedi (önemli değil):', mqErr.message);
    }

    res.status(201).json(newSuggestion);
  } catch (error) {
    res.status(400).json({ message: 'Geçersiz veri: Öneri kaydedilemedi', error: error.message });
  }
};

// @desc    Önerilen Soruları Listeleme
// @route   GET /api/admin/suggestions
// @access  Private/Admin (Madde 27)
export const listSuggestions = async (req, res) => {
  try {
    const suggestions = await Suggestion.find()
      .populate('user', 'username email')
      .populate('category', 'name')
      .sort({ createdAt: -1 });
      
    res.status(200).json(suggestions);
  } catch (error) {
    res.status(400).json({ message: 'Öneriler listelenemedi', error: error.message });
  }
};

// @desc    Önerilen Soruyu Reddetme (Silme)
// @route   DELETE /api/admin/suggestions/:suggestionId
// @access  Private/Admin (Madde 29)
export const rejectSuggestion = async (req, res) => {
  try {
    const suggestionId = req.params.suggestionId;
    const suggestion = await Suggestion.findById(suggestionId);

    if (!suggestion) {
      return res.status(404).json({ message: 'Öneri bulunamadı' });
    }

    await Suggestion.findByIdAndDelete(suggestionId);
    
    // RabbitMQ'ya bildirim gönder (opsiyonel)
    try {
      await sendToQueue({
        type: 'SUGGESTION_REJECTED',
        message: 'Bir soru önerisi yönetici tarafından reddedildi.',
        suggestionId: suggestionId,
        userId: suggestion.user,
        timestamp: new Date()
      });
    } catch (mqErr) {
      console.warn('[Suggestion] RabbitMQ bildirimi gönderilemedi (önemli değil):', mqErr.message);
    }

    res.status(204).send(); // 204 No Content
  } catch (error) {
    res.status(400).json({ message: 'Öneri silinemedi/reddedilemedi', error: error.message });
  }
};
