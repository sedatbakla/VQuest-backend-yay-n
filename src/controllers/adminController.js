import User from '../models/User.js';
import Room from '../models/Room.js';
import Question from '../models/Question.js';
import Suggestion from '../models/Suggestion.js';

// @desc    Admin Dashboard İstatistikleri
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const activeRooms = await Room.countDocuments({ status: 'active' });
    const totalQuestions = await Question.countDocuments({ isPrivate: { $ne: true } });
    const pendingSuggestions = await Suggestion.countDocuments({ status: 'pending' });

    res.status(200).json({
      users: userCount,
      activeRooms,
      totalQuestions,
      pendingSuggestions
    });
  } catch (error) {
    res.status(400).json({ message: 'İstatistikler alınamadı' });
  }
};
