import Redis from 'ioredis';
import crypto from 'crypto';
import amqp from 'amqplib';

// ==========================================
// 1. BAĞLANTILAR (Redis & RabbitMQ)
// ==========================================
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'emir_api_events';
let channel = null;

// RabbitMQ'ya bağlanma ve Exchange oluşturma
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    console.log(`✅ RabbitMQ bağlantısı başarılı. Exchange: ${EXCHANGE_NAME}`);
  } catch (error) {
    console.error('❌ RabbitMQ bağlantı hatası:', error.message);
  }
}

// Uygulama başlarken bağlantıyı başlat
connectRabbitMQ();

// ==========================================
// 2. ORTAK EVENT FIRLATICI (Publisher)
// ==========================================
async function publishEvent(routingKey, data) {
  try {
    if (!channel) {
      console.warn(`⚠️ RabbitMQ kanalı hazır değil. Mesaj atılamadı: ${routingKey}`);
      return;
    }
    const message = Buffer.from(JSON.stringify(data));
    channel.publish(EXCHANGE_NAME, routingKey, message);
    console.log(`📤 [RabbitMQ] Event fırlatıldı -> Routing Key: ${routingKey}`);
  } catch (error) {
    console.error(`❌ [RabbitMQ] Event fırlatılamadı (${routingKey}):`, error.message);
  }
}

/* =========================================
   3. SORULAR (QUESTIONS) SERVİSİ
   ========================================= */

export async function getAllQuestions() {
  try {
    const questionsHash = await redis.hgetall('questions');
    return Object.values(questionsHash).map(item => JSON.parse(item));
  } catch (error) {
    console.error('❌ Soru getirme hatası:', error.message);
    throw error;
  }
}

export async function addQuestion(questionData) {
  try {
    const id = crypto.randomUUID();
    const dataToSave = { id, ...questionData };
    
    await redis.hset('questions', id, JSON.stringify(dataToSave));
    
    // Olayı Fırlat
    await publishEvent('question.created', { action: 'CREATE', data: dataToSave });
    
    return dataToSave;
  } catch (error) {
    console.error('❌ Soru ekleme hatası:', error.message);
    throw error;
  }
}

export async function updateQuestion(id, updatedData) {
  try {
    const dataToSave = { id, ...updatedData };
    
    await redis.hset('questions', id, JSON.stringify(dataToSave));
    
    // Olayı Fırlat
    await publishEvent('question.updated', { action: 'UPDATE', data: dataToSave });
    
    return dataToSave;
  } catch (error) {
    console.error('❌ Soru güncelleme hatası:', error.message);
    throw error;
  }
}

export async function deleteQuestion(id) {
  try {
    await redis.hdel('questions', id);
    
    // Olayı Fırlat
    await publishEvent('question.deleted', { action: 'DELETE', data: { id } });
    
    return { success: true, message: `Soru ${id} silindi.` };
  } catch (error) {
    console.error('❌ Soru silme hatası:', error.message);
    throw error;
  }
}

/* =========================================
   4. KATEGORİLER (CATEGORIES) SERVİSİ
   ========================================= */

export async function getAllCategories() {
  try {
    const categoriesHash = await redis.hgetall('categories');
    return Object.values(categoriesHash).map(item => JSON.parse(item));
  } catch (error) {
    console.error('❌ Kategori getirme hatası:', error.message);
    throw error;
  }
}

export async function addCategory(categoryData) {
  try {
    const id = crypto.randomUUID();
    const dataToSave = { id, ...categoryData };
    
    await redis.hset('categories', id, JSON.stringify(dataToSave));
    
    // Olayı Fırlat
    await publishEvent('category.created', { action: 'CREATE', data: dataToSave });
    
    return dataToSave;
  } catch (error) {
    console.error('❌ Kategori ekleme hatası:', error.message);
    throw error;
  }
}

export async function updateCategory(id, updatedData) {
  try {
    const dataToSave = { id, ...updatedData };
    
    await redis.hset('categories', id, JSON.stringify(dataToSave));
    
    // Olayı Fırlat
    await publishEvent('category.updated', { action: 'UPDATE', data: dataToSave });
    
    return dataToSave;
  } catch (error) {
    console.error('❌ Kategori güncelleme hatası:', error.message);
    throw error;
  }
}

export async function deleteCategory(id) {
  try {
    await redis.hdel('categories', id);
    
    // Olayı Fırlat
    await publishEvent('category.deleted', { action: 'DELETE', data: { id } });
    
    return { success: true, message: `Kategori ${id} silindi.` };
  } catch (error) {
    console.error('❌ Kategori silme hatası:', error.message);
    throw error;
  }
}
