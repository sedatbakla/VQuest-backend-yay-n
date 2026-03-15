export const authMiddleware = (req, res, next) => {
  // Bu geçici bir mock middleware'dir.
  // Gerçek yetkilendirme (JWT) başka bir ekip arkadaşı tarafından eklenecektir.
  // YAML'daki 401 ve 403 hatalarını simüle etmek için kullanılabilir.
  
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ message: 'Kimlik doğrulama başarısız' });
  }
  
  // Örnek: Admin yetkisi kontrolü
  // if (req.user.role !== 'admin') return res.status(403).json({ message: 'Yetkisiz erişim' });
  
  next();
};
