import Question from '../models/Question.js';

// @desc    Soru Ekleme (Madde 8)
// @route   POST /api/admin/questions
// @access  Admin
export const addQuestion = async (req, res) => {
  try {
    const { text, options, correctAnswer, category } = req.body;
    if (!text || !options || !correctAnswer) {
      return res.status(400).json({ message: 'text, options ve correctAnswer alanları zorunludur' });
    }
    const question = await Question.create({ text, options, correctAnswer, category });
    res.status(201).json(question);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Soru Güncelleme (Madde 10)
// @route   PUT /api/admin/questions/:questionId
// @access  Admin
export const updateQuestion = async (req, res) => {
  try {
    const { text, options, correctAnswer, category } = req.body;
    const question = await Question.findByIdAndUpdate(
      req.params.questionId,
      { text, options, correctAnswer, category },
      { new: true }
    );
    if (!question) {
      return res.status(404).json({ message: 'Soru bulunamadı' });
    }
    res.status(200).json(question);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// @desc    Soru Silme (Madde 14)
// @route   DELETE /api/admin/questions/:questionId
// @access  Admin
export const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.questionId);
    if (!question) {
      return res.status(404).json({ message: 'Soru bulunamadı' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// @desc    Soru Listeleme - Sadece genel/kullanılmak üzere olan sorular
// @route   GET /api/questions
// @access  Private
export const listQuestions = async (req, res) => {
  try {
    // Özel soruları (odalar için yaratılan) asla genel listede gösterme
    const questions = await Question.find({ isPrivate: { $ne: true } });
    res.status(200).json(questions);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};
