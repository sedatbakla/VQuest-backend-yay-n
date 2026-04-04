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

// @desc    Kullanıcı Engelleme/Kaldırma Tıklama
// @route   PUT /api/admin/users/:userId/block
// @access  Private/Admin
export const toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      _id: user._id,
      username: user.username,
      isBlocked: user.isBlocked
    });
  } catch (error) {
    res.status(400).json({ message: 'İşlem başarısız' });
  }
};
