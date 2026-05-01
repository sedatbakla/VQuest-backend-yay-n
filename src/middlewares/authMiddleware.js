import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import redisClient from '../config/redisClient.js'; // Kara liste kontrolü için Redis client

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Kimlik doğrulama başarısız' });
  }

  const token = authHeader.split(' ')[1];

  // --- JWT KARA LİSTE KONTROLÜ ---
  // Token doğrulamadan ÖNCE Redis'te blacklist kaydı var mı kontrol et.
  // Kullanıcı logout yaptıktan sonra aynı token ile istek atmaya çalışırsa burada durdurulur.
  try {
    const isBlacklisted = await redisClient.get(`BL_${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token geçersiz kılınmış. Lütfen tekrar giriş yapın.' });
    }
  } catch (redisErr) {
    // Redis erişilemezse: logluyoruz ama isteği bloklamamak için devam ediyoruz (graceful degradation).
    // NOT: Production ortamında Redis zorunlu yapılmak istenirse burada 503 dönülebilir.
    console.error('⚠️  Redis kara liste kontrol hatası (devam ediliyor):', redisErr.message);
  }
  // ---------------------------------

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Kimlik doğrulama başarısız' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Hesabınız engellenmiştir' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Jwt Verify Error:', error.message);
    return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token' });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Yetkiniz bulunmuyor (Admin gerekli)' });
};
