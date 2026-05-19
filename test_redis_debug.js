import Redis from 'ioredis';
import 'dotenv/config';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
console.log('Connecting to Redis at:', redisUrl);

const redis = new Redis(redisUrl);

redis.on('connect', () => console.log('✅ Connected successfully to Redis!'));
redis.on('error', (err) => console.error('❌ Redis Connection Error:', err));

async function checkData() {
  try {
    const keys = await redis.keys('*');
    console.log('All keys in Redis:', keys);

    const categories = await redis.hgetall('categories');
    console.log('Categories in hash "categories":', categories);

    const questions = await redis.hgetall('questions');
    console.log('Questions in hash "questions":', questions);
  } catch (err) {
    console.error('Error fetching data:', err);
  } finally {
    redis.disconnect();
  }
}

setTimeout(checkData, 1000);
