import User from '../models/User.js';

// @desc    Kullanıcı Listeleme
// @route   GET /api/admin/users
// @access  Private/Admin (Madde 6)
export const listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(400).json({ message: 'Kullanıcılar listelenemedi' });
  }
};

// @desc    Kullanıcı Engelleme
// @route   PUT /api/admin/users/:userId/block
// @access  Private/Admin (Madde 5)
export const blockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isBlocked: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      score: user.score,
    });
  } catch (error) {
    res.status(400).json({ message: 'Kullanıcı engellenemedi' });
  }
};
