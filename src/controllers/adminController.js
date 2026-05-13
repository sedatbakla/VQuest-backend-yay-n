import User from '../models/User.js';
import Room from '../models/Room.js';
import Question from '../models/Question.js';
import Suggestion from '../models/Suggestion.js';
import amqp from 'amqplib';

// ─── RabbitMQ Sabitleri ───────────────────────────────────────────────────────
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const ACCOUNT_DELETION_QUEUE = 'account_deletion_queue';

// @desc    Admin Dashboard İstatistikleri
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const activeRooms = await Room.countDocuments({ status: 'active' });
    const totalQuestions = await Question.countDocuments({ isPrivate: { $ne: true } });
    const pendingSuggestions = await Suggestion.countDocuments({ status: 'pending' });

    res.status(200).json({
      users: userCount,
      activeRooms,
      totalQuestions,
      pendingSuggestions
    });
  } catch (error) {
    res.status(400).json({ message: 'İstatistikler alınamadı' });
  }
};

// @desc    Kullanıcı Hesabını Asenkron Olarak Sil (Kuyruk Tabanlı)
// @route   DELETE /api/admin/users/:userId
// @access  Private/Admin
//
// NOT: Bu endpoint veritabanından ANINDA silme YAPMAZ.
// userId bilgisini account_deletion_queue kuyruğuna ekler ve
// 202 Accepted yanıtı döner. Asıl silme işlemi Worker tarafından yapılır.
export const deleteUser = async (req, res) => {
  const { userId } = req.params;

  let connection = null;

  try {
    // 1. Parametre doğrulama — userId zorunlu
    if (!userId) {
      return res.status(400).json({ message: 'userId parametresi gereklidir.' });
    }

    // 2. RabbitMQ'ya bağlan ve kanalı oluştur
    connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // 3. Kuyruğu oluştur (yoksa oluşturur, varsa var olana bağlanır)
    //    durable: true → RabbitMQ yeniden başlasa bile kuyruk kaybolmaz
    await channel.assertQueue(ACCOUNT_DELETION_QUEUE, { durable: true });

    // 4. Kuyruğa gönderilecek mesajı hazırla
    const message = {
      userId,
      requestedAt: new Date().toISOString(),  // İsteğin zaman damgası
      requestedBy: req.user?.id || 'unknown'  // İşlemi başlatan admin ID'si
    };

    // 5. Mesajı kuyruğa gönder
    //    persistent: true → RabbitMQ yeniden başlasa bile mesaj kaybolmaz
    channel.sendToQueue(
      ACCOUNT_DELETION_QUEUE,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    console.log(`📬 userId: ${userId} için hesap silme isteği kuyruğa alındı.`);

    // 6. Kanalı kapat (bağlantıyı açık tutup kanalı kapatmak yeterli)
    await channel.close();

    // 7. İstemciye 202 Accepted döndür — işlem sıraya alındı, henüz tamamlanmadı
    return res.status(202).json({
      message: 'Hesap silme işlemi sıraya alındı. Kısa süre içinde tamamlanacak.',
      userId,
      status: 'queued'
    });

  } catch (error) {
    console.error(`❌ deleteUser kuyruğa ekleme hatası (userId: ${userId}):`, error.message);
    return res.status(500).json({
      message: 'Hesap silme isteği kuyruğa alınamadı. Lütfen tekrar deneyin.',
      error: error.message
    });
  } finally {
    // 8. Hata olsa da olmasa da RabbitMQ bağlantısını kapat (kaynak sızıntısı önleme)
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('⚠️  RabbitMQ bağlantısı kapatılırken hata:', closeError.message);
      }
    }
  }
};
