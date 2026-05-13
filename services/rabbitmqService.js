import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'activity_log_queue';

let channel = null;

// RabbitMQ bağlantısını başlatır
export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`✅ RabbitMQ bağlantısı başarılı. Kuyruk: ${QUEUE_NAME}`);
  } catch (error) {
    console.error('❌ RabbitMQ bağlantı hatası:', error.message);
  }
};

// Kuyruğa mesaj gönderir
export const publishActivityLog = async (logData) => {
  try {
    if (!channel) await connectRabbitMQ();
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(logData)), { persistent: true });
  } catch (error) {
    console.error('❌ RabbitMQ Mesaj Gönderme Hatası:', error.message);
  }
};

// Kuyruktan mesaj okur
export const consumeActivityLogs = async () => {
  try {
    if (!channel) await connectRabbitMQ();

    // RabbitMQ yoksa (RABBITMQ_URL tanımsız / bağlanamadı) sessizce çık
    if (!channel) {
      console.warn('⚠️  RabbitMQ kanalı yok, consumeActivityLogs atlanıyor.');
      return;
    }

    console.log(`🎧 RabbitMQ dinleniyor: ${QUEUE_NAME}...`);

    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        const logData = JSON.parse(msg.content.toString());

        // Renkli log formatı oluşturma
        const time = logData.timestamp || new Date().toISOString();
        let actionText = '';
        if (logData.action === 'joined_room') actionText = '\x1b[32mjoined room\x1b[0m'; // Yeşil
        else if (logData.action === 'kicked_from_room') actionText = '\x1b[31mkicked from room\x1b[0m'; // Kırmızı
        else actionText = logData.action;

        console.log(`\x1b[36m[ACTIVITY LOG]\x1b[0m User \x1b[33m${logData.userId}\x1b[0m ${actionText} \x1b[35m${logData.roomId}\x1b[0m at ${time}`);

        // İşlem bitti, kuyruktan düşür
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error('❌ RabbitMQ Mesaj Dinleme Hatası:', error.message);
  }
};
