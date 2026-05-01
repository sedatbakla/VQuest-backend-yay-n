import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import redisClient from '../config/redisClient.js'; // JWT kara liste için Redis client

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

// @desc    Güvenli Çıkış — Token'ı Redis Kara Listesine Alır
// @route   POST /api/auth/logout
// @access  Private (authMiddleware gerektirir)
export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    // Header kontrolü (authMiddleware zaten doğruladı, ama savunmacı programlama)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ message: 'Token bulunamadı' });
    }

    const token = authHeader.split(' ')[1];

    // Token'ın geri kalan geçerlilik süresini hesapla
    const decoded = jwt.decode(token); // verify değil, decode — zaten middleware doğruladı
    const now = Math.floor(Date.now() / 1000); // Unix timestamp (saniye)
    const ttl = decoded?.exp ? decoded.exp - now : 60 * 60 * 24 * 7; // Fallback: 7 gün

    if (ttl > 0) {
      try {
        // Redis'e kara liste kaydı: BL_<token> = 'blacklisted' | TTL = kalan süre (sn)
        await redisClient.set(`BL_${token}`, 'blacklisted', 'EX', ttl);
        console.log(`🔒 Token kara listeye alındı. TTL: ${ttl}s | Kullanıcı: ${req.user?._id}`);
      } catch (redisErr) {
        // Redis yazma hatası: logluyoruz ama işlemi durdurmuyoruz (graceful degradation)
        console.error('❌ Redis kara liste yazma hatası:', redisErr.message);
      }
    }

    return res.status(200).json({ message: 'Başarıyla çıkış yapıldı' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Çıkış işlemi başarısız' });
  }
};

// @desc    Admin Onarma
// @route   GET /api/auth/fix-admin
// @access  Public
export const fixAdmin = async (req, res) => {
  try {
    let existing = await User.findOne({ email: 'admin@vquest.com' });
    const password = await bcrypt.hash('admin123', 10);
    if (!existing) {
      await User.create({
        username: 'VQuestAdmin',
        email: 'admin@vquest.com',
        password,
        role: 'admin'
      });
      return res.status(200).json({ message: 'Admin kullanıcısı başarıyla oluşturuldu! (Email: admin@vquest.com, Şifre: admin123)' });
    } else {
      existing.password = password;
      existing.role = 'admin';
      await existing.save();
      return res.status(200).json({ message: 'Mevcut Admin kullanıcısı güncellendi! (Email: admin@vquest.com, Şifre: admin123)' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
