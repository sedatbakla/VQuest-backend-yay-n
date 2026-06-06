/**
 * accountDeletionWorker.js
 *
 * Bu Worker, account_deletion_queue kuyruğunu sürekli dinler.
 * Kuyruktan gelen her userId için veritabanı temizliği simüle eder
 * ve işlem tamamlandığında RabbitMQ'ya ack() onayı gönderir.
 *
 * Çalıştırma: node workers/accountDeletionWorker.js
 */

import amqp from 'amqplib';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';

dotenv.config();

// ─── Sabitler ─────────────────────────────────────────────────────────────────
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const ACCOUNT_DELETION_QUEUE = 'account_deletion_queue';
const RECONNECT_DELAY_MS = 5000; // Bağlantı kopunca tekrar deneme süresi (ms)

// ─── Yardımcı: Asenkron Bekleme ───────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Gerçek Veritabanı Silme ──────────────────────────────────────────────────
/**
 * Kullanıcıyı MongoDB'den kalıcı olarak siler.
 *
 * @param {string} userId - Silinecek kullanıcının ID'si
 */
const deleteUserFromDB = async (userId) => {
  console.log(`\n🗑️  userId: ${userId} için veritabanı silme işlemi başlıyor...`);

  const deletedUser = await User.findByIdAndDelete(userId);

  if (deletedUser) {
    console.log(`✅ userId: ${userId} (${deletedUser.username}) MongoDB'den başarıyla silindi.`);
  } else {
    console.warn(`⚠️  userId: ${userId} bulunamadı — zaten silinmiş olabilir.`);
  }
};

// ─── Ana Worker Fonksiyonu ────────────────────────────────────────────────────
/**
 * RabbitMQ'ya bağlanır, account_deletion_queue kuyruğunu dinlemeye başlar.
 * Her mesaj için veritabanı temizliğini çalıştırır ve ack() onayı gönderir.
 * Bağlantı kopması durumunda otomatik olarak yeniden bağlanmayı dener.
 */
export const startAccountDeletionWorker = async () => {
  // Veritabanı bağlantısı yoksa kur (index.js üzerinden çalışırken zaten bağlı olur)
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }
  let connection = null;

  try {
    // 1. RabbitMQ'ya bağlan
    connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    console.log('🚀 Account Deletion Worker başlatıldı.');
    console.log(`🎧 "${ACCOUNT_DELETION_QUEUE}" kuyruğu dinleniyor...\n`);

    // 2. Kuyruğu tanımla (Producer ile aynı ayarlar olmalı)
    await channel.assertQueue(ACCOUNT_DELETION_QUEUE, { durable: true });

    // 3. Bir seferde yalnızca 1 mesaj işle — işlem bitmeden yeni mesaj alma
    //    Bu sayede ağır işlemler sırasında kuyruk taşmaz (backpressure kontrolü)
    channel.prefetch(1);

    // 4. Kuyruğu dinlemeye başla
    channel.consume(ACCOUNT_DELETION_QUEUE, async (msg) => {
      // Geçersiz mesaj kontrolü
      if (msg === null) {
        console.warn('⚠️  Geçersiz (null) mesaj alındı, atlanıyor.');
        return;
      }

      let payload;

      try {
        // 5. Mesaj içeriğini parse et
        payload = JSON.parse(msg.content.toString());
        const { userId, requestedAt, requestedBy } = payload;

        console.log(`📩 Yeni silme isteği alındı:`);
        console.log(`   → userId      : ${userId}`);
        console.log(`   → requestedBy : ${requestedBy}`);
        console.log(`   → requestedAt : ${requestedAt}`);

        // 6. Kullanıcıyı veritabanından gerçekten sil
        await deleteUserFromDB(userId);

        // 7. İşlem başarılı → RabbitMQ'ya ack() gönder (mesajı kuyruktan düşür)
        channel.ack(msg);
        console.log(`📌 userId: ${userId} mesajı kuyruktan kaldırıldı (ack).\n`);

      } catch (processingError) {
        // 8. İşlem hatası → mesajı kuyruğa geri al (requeue: true)
        //    Böylece mesaj kaybolmaz, tekrar işlenmeye çalışılır.
        console.error(`❌ Mesaj işleme hatası (userId: ${payload?.userId || 'bilinmiyor'}):`, processingError.message);
        channel.nack(msg, false, true); // (msg, allUpTo, requeue)
      }
    });

    // 9. Bağlantı kapanırsa otomatik yeniden bağlan
    connection.on('close', () => {
      console.error('⚠️  RabbitMQ bağlantısı kapandı. Yeniden bağlanılıyor...');
      setTimeout(startAccountDeletionWorker, RECONNECT_DELAY_MS);
    });

    connection.on('error', (err) => {
      console.error('❌ RabbitMQ bağlantı hatası:', err.message);
      // 'close' eventi de tetikleneceği için burada tekrar bağlanmaya gerek yok
    });

  } catch (error) {
    console.error('❌ Worker başlatılamadı:', error.message);

    // Bağlantı hiç kurulamazsa belirli süre sonra tekrar dene
    console.log(`🔄 ${RECONNECT_DELAY_MS / 1000} saniye sonra tekrar denenecek...`);
    setTimeout(startAccountDeletionWorker, RECONNECT_DELAY_MS);
  }
};

// ─── Doğrudan çalıştırıldığında başlat (node workers/accountDeletionWorker.js) ──
// index.js üzerinden import edildiğinde bu blok çalışmaz.
if (process.argv[1]?.endsWith('accountDeletionWorker.js')) {
  startAccountDeletionWorker();
}
