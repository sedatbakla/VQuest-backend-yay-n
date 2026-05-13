import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// REDIS_URL varsa onu kullan (Upstash / cloud), yoksa host:port ile bağlan
const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

const redisOptions = {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null,
};

const redis = redisUrl
  ? new Redis(redisUrl, redisOptions)   // Upstash / rediss:// destekli
  : new Redis({ host: redisHost, port: redisPort, ...redisOptions });

redis.on('connect', () => {
  console.log('✅ Redis bağlantısı kuruldu');
});

redis.on('ready', () => {
  console.log('🚀 Redis kullanıma hazır');
});

redis.on('error', (err) => {
  console.error('❌ Redis hatası:', err.message || err);
});

export default redis;
