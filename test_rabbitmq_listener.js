import amqp from 'amqplib';
import 'dotenv/config';

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'emir_api_events';

console.log('Connecting to RabbitMQ at:', rabbitmqUrl);

async function startListener() {
  try {
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();
    
    // Exchange'in var olduğundan emin olalım
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    
    // Geçici, anonim ve sadece bu terminale özel bir kuyruk oluşturalım
    const q = await channel.assertQueue('', { exclusive: true });
    console.log(`✅ Connected successfully to RabbitMQ!`);
    console.log(`Temporary Queue: ${q.queue}`);
    
    // Hem soru (question.#) hem de kategori (category.#) eventlerine abone olalım
    await channel.bindQueue(q.queue, EXCHANGE_NAME, 'question.#');
    await channel.bindQueue(q.queue, EXCHANGE_NAME, 'category.#');
    
    console.log(`🎧 Real-time RabbitMQ Event Listener is ACTIVE!`);
    console.log(`Waiting for events from Postman actions (Create/Update/Delete Questions & Categories)...`);
    console.log(`----------------------------------------------------------------------`);

    channel.consume(q.queue, (msg) => {
      if (msg.content) {
        const routingKey = msg.fields.routingKey;
        const data = JSON.parse(msg.content.toString());
        console.log(`📥 [NEW EVENT RECEIVED]`);
        console.log(`   Routing Key: ${routingKey}`);
        console.log(`   Action:      ${data.action}`);
        console.log(`   Data Payload:`, JSON.stringify(data.data, null, 2));
        console.log(`----------------------------------------------------------------------`);
      }
    }, { noAck: true });

  } catch (error) {
    console.error('❌ RabbitMQ Listener Error:', error.message);
  }
}

startListener();
