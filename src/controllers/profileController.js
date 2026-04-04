import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// @desc    Profil Görüntüleme
// @route   GET /api/profile
// @access  Private (Madde 3)
export const getProfile = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      score: user.score,
    });
  } catch (error) {
    res.status(400).json({ message: 'Profil getirilemedi' });
  }
};

// @desc    Şifre Güncelleme
// @route   PUT /api/profile/password
// @access  Private (Madde 4)
export const updatePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'newPassword zorunludur' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { password: hashedPassword },
      { new: true }
    ).select('-password');

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      score: user.score,
    });
  } catch (error) {
    res.status(400).json({ message: 'Şifre güncellenemedi' });
  }
};

// @desc    Hesap Silme
// @route   DELETE /api/profile
// @access  Private (Madde 7)
export const deleteProfile = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: 'Hesap silinemedi' });
  }
};
