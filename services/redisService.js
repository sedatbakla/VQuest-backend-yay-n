import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL;

const redis = REDIS_URL 
  ? new Redis(REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 50, 2000)
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

redis.on('connect', () => {
  console.log('✅ Redis bağlantısı başarılı.');
});

redis.on('error', (err) => {
  console.error('❌ Redis hatası:', err);
});

export default redis;
