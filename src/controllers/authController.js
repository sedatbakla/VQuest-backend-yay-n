import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// @desc    Yeni Kullanıcı Kaydı
// @route   POST /api/auth/register
// @access  Public (Madde 1)
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email ve password zorunludur' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu e-posta veya kullanıcı adı zaten kullanımda' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      score: user.score,
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Kayıt başarısız' });
  }
};

// @desc    Kullanıcı Girişi
// @route   POST /api/auth/login
// @access  Public (Madde 2)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email ve password zorunludur' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Hatalı e-posta veya şifre' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Hesabınız engellenmiştir' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Hatalı e-posta veya şifre' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({ 
      token, 
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        score: user.score
      } 
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Giriş başarısız' });
  }
};
