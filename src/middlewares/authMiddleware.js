import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Kimlik doğrulama başarısız' });
  }

  const token = authHeader.split(' ')[1];

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
    return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token' });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Yetkiniz bulunmuyor (Admin gerekli)' });
};
