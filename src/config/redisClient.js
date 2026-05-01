import Redis from 'ioredis';

/**
 * Redis Client Modülü
 *
 * - Singleton pattern: Tüm uygulama aynı bağlantıyı paylaşır.
 * - Graceful Degradation: Redis çökerse uygulama çökmez; hatalar loglanır.
 * - Otomatik yeniden bağlanma (reconnect) ioredis tarafından yönetilir.
 *
 * Çevre değişkeni: REDIS_URL (örn. redis://localhost:6379)
 */

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = new Redis(REDIS_URL, {
  // Bağlantı yeniden deneme stratejisi
  retryStrategy(times) {
    // Her denemede artan bekleme (maks 30 sn)
    const delay = Math.min(times * 500, 30000);
    console.warn(`⚠️  Redis: Yeniden bağlanılıyor (deneme: ${times}, bekleme: ${delay}ms)`);
    return delay;
  },
  // Komut göndermeden önce bağlantı hazır değilse hata fırlatmak yerine kuyruğa al
  enableOfflineQueue: true,
  // Bağlantı zaman aşımı
  connectTimeout: 10000,
  // Maksimum yeniden deneme sayısı (-1 = sonsuz)
  maxRetriesPerRequest: 3,
});

// Başarılı bağlantı logu
redisClient.on('connect', () => {
  console.log('✅ Redis bağlantısı kuruldu');
});

// Hazır durumu (komut kabul edebilir)
redisClient.on('ready', () => {
  console.log('🚀 Redis kullanıma hazır');
});

// Hata logu — uygulamayı çökertmez
redisClient.on('error', (err) => {
  console.error('❌ Redis Hatası:', err.message);
});

// Bağlantı kapandı
redisClient.on('close', () => {
  console.warn('⚠️  Redis bağlantısı kapandı');
});

// Yeniden bağlanma (ioredis retryStrategy ile zaten yönetiliyor)
redisClient.on('reconnecting', () => {
  console.warn('🔄 Redis: Yeniden bağlanılıyor...');
});

export default redisClient;
