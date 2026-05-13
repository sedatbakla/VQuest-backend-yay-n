import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const queueName = 'notifications_queue';

let connection = null;
let channel = null;

export const connectRabbit = async () => {
  try {
    connection = await amqp.connect(rabbitUrl);
    channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });
    console.log('✅ RabbitMQ bağlantısı başarılı ve kuyruk hazır.');
    return channel;
  } catch (error) {
    console.error('❌ RabbitMQ bağlantı hatası:', error.message);
    // Bağlantı başarısız olursa belli bir süre sonra tekrar dene
    setTimeout(connectRabbit, 5000);
  }
};

export const sendToQueue = async (data) => {
  if (!channel) {
    console.error('❌ RabbitMQ kanalı hazır değil!');
    return false;
  }
  try {
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });
    console.log('📬 Mesaj RabbitMQ kuyruğuna eklendi:', data.message);
    return true;
  } catch (error) {
    console.error('❌ Kuyruğa mesaj gönderilemedi:', error.message);
    return false;
  }
};

export const consumeQueue = async (callback) => {
  if (!channel) {
    await connectRabbit();
  }
  // connectRabbit başarısız olursa channel hâlâ null olabilir
  if (!channel) {
    console.error('❌ RabbitMQ kanalı kurulamadı, consumeQueue atlanıyor.');
    return;
  }
  channel.consume(queueName, (msg) => {
    if (msg !== null) {
      const content = JSON.parse(msg.content.toString());
      callback(content);
      channel.ack(msg);
    }
  });
};

export default {
  connectRabbit,
  sendToQueue,
  consumeQueue
};
