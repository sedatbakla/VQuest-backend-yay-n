import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'activity_log_queue';
const RECONNECT_DELAY_MS = 5000; // 5 sn bekleyip yeniden bağlan

let channel = null;
let connection = null;
let isConnecting = false;

// ─── RabbitMQ bağlantısını başlatır (reconnect destekli) ─────────────────────
export const connectRabbitMQ = async () => {
  if (isConnecting) return; // eş zamanlı bağlanma girişimlerini önle
  isConnecting = true;
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`✅ RabbitMQ bağlantısı başarılı. Kuyruk: ${QUEUE_NAME}`);

    // Bağlantı kapanırsa otomatik yeniden bağlan
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ bağlantı hatası:', err.message);
      channel = null;
      connection = null;
      scheduleReconnect();
    });
    connection.on('close', () => {
      console.warn('⚠️  RabbitMQ bağlantısı kapandı. Yeniden bağlanılıyor...');
      channel = null;
      connection = null;
      scheduleReconnect();
    });
  } catch (error) {
    console.error('❌ RabbitMQ bağlantı hatası:', error.message);
    channel = null;
    connection = null;
    scheduleReconnect();
  } finally {
    isConnecting = false;
  }
};

const scheduleReconnect = () => {
  console.log(`🔄 RabbitMQ ${RECONNECT_DELAY_MS / 1000}sn sonra yeniden bağlanacak...`);
  setTimeout(connectRabbitMQ, RECONNECT_DELAY_MS);
};

// ─── Kuyruğa mesaj gönderir ───────────────────────────────────────────────────
export const publishActivityLog = async (logData) => {
  try {
    if (!channel) {
      console.warn('⚠️  RabbitMQ kanalı hazır değil, bağlantı deneniyor...');
      await connectRabbitMQ();
    }
    // Kanal hâlâ yoksa (bağlantı başarısız) mesajı yoksay, uygulamayı çökertme
    if (!channel) {
      console.error('❌ RabbitMQ: Kanal kurulamadı, mesaj atlandı.');
      return;
    }
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(logData)), { persistent: true });
  } catch (error) {
    console.error('❌ RabbitMQ Mesaj Gönderme Hatası:', error.message);
  }
};

// ─── Kuyruktan mesaj okur ─────────────────────────────────────────────────────
export const consumeActivityLogs = async () => {
  try {
    if (!channel) await connectRabbitMQ();
    if (!channel) {
      console.error('❌ RabbitMQ: Kanal yok, consumer başlatılamadı.');
      return;
    }

    console.log(`🎧 RabbitMQ dinleniyor: ${QUEUE_NAME}...`);

    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        try {
          const logData = JSON.parse(msg.content.toString());
          const time = logData.timestamp || new Date().toISOString();
          let actionText = logData.action;
          if (logData.action === 'joined_room') actionText = '\x1b[32mjoined room\x1b[0m';
          else if (logData.action === 'kicked_from_room') actionText = '\x1b[31mkicked from room\x1b[0m';
          else if (logData.action === 'created_room') actionText = '\x1b[34mcreated room\x1b[0m';
          else if (logData.action === 'started_room') actionText = '\x1b[33mstarted room\x1b[0m';
          else if (logData.action === 'closed_room') actionText = '\x1b[35mclosed room\x1b[0m';

          console.log(`\x1b[36m[ACTIVITY LOG]\x1b[0m User \x1b[33m${logData.userId}\x1b[0m ${actionText} \x1b[35m${logData.roomId || '-'}\x1b[0m at ${time}`);
          channel.ack(msg);
        } catch (parseErr) {
          console.error('❌ RabbitMQ mesaj parse hatası:', parseErr.message);
          channel.nack(msg, false, false); // Bozuk mesajı dead-letter queue'ya at
        }
      }
    });
  } catch (error) {
    console.error('❌ RabbitMQ Mesaj Dinleme Hatası:', error.message);
  }
};
