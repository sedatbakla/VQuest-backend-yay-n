import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redisClient from './redisClient.js';

/**
 * Rate Limiter Konfigürasyonu
 *
 * İki ayrı limiter tanımlanmıştır:
 *  1. authLimiter   → Login/Register/Forgot-Password gibi hassas auth rotaları
 *  2. generalLimiter → Genel API rotaları
 *
 * Graceful Degradation: Redis erişilemezse otomatik olarak bellek içi (in-memory)
 * store'a geçer; uygulama çalışmaya devam eder.
 */

// -----------------------------------------------------------
// Yardımcı: Redis store'u güvenli oluştur
// -----------------------------------------------------------
function createRedisStore(prefix) {
  try {
    return new RedisStore({
      // rate-limit-redis v4+ sendCommand kullanır
      sendCommand: (...args) => redisClient.call(...args),
      prefix,
    });
  } catch (err) {
    console.error(`⚠️  Rate-limit Redis store oluşturulamadı (${prefix}):`, err.message);
    // Fallback: undefined → express-rate-limit varsayılan bellek store'u kullanır
    return undefined;
  }
}

// -----------------------------------------------------------
// 1. AUTH LİMİTER — Hassas rotalar için sıkı kısıtlama
//    Pencere: 15 dakika | Maks: 5 istek
// -----------------------------------------------------------
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 dakika
  max: 5,                    // pencere başına maks istek sayısı
  standardHeaders: true,     // RateLimit-* başlıklarını ekle (RFC 6585)
  legacyHeaders: false,      // X-RateLimit-* eski başlıklarını kaldır
  store: createRedisStore('rl:auth:'),

  // HTTP 429 yanıtı
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Çok fazla deneme yaptınız. Lütfen 15 dakika sonra tekrar deneyin.',
      retryAfter: Math.ceil(req.rateLimit?.resetTime
        ? (req.rateLimit.resetTime - Date.now()) / 1000
        : 900),
    });
  },

  // İstek sayısını artırmadan önce hata durumunu atla
  skip: (req, res) => false,
});

// -----------------------------------------------------------
// 2. GENEL LİMİTER — Tüm /api rotaları için esnek kısıtlama
//    Pencere: 1 dakika | Maks: 100 istek
// -----------------------------------------------------------
export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('rl:general:'),

  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'API istek limitine ulaştınız. Lütfen bir dakika sonra tekrar deneyin.',
      retryAfter: Math.ceil(req.rateLimit?.resetTime
        ? (req.rateLimit.resetTime - Date.now()) / 1000
        : 60),
    });
  },
});
