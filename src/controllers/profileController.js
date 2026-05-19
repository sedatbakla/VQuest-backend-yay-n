import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const ACCOUNT_DELETION_QUEUE = 'account_deletion_queue';

// @desc    Profil Görüntüleme
// @route   GET /api/profile
// @access  Private (Madde 3)
export const getProfile = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      score: user.score,
    });
  } catch (error) {
    res.status(400).json({ message: 'Profil getirilemedi' });
  }
};

// @desc    Şifre Güncelleme
// @route   PUT /api/profile/password
// @access  Private (Madde 4)
export const updatePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'newPassword zorunludur' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { password: hashedPassword },
      { new: true }
    ).select('-password');

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      score: user.score,
    });
  } catch (error) {
    res.status(400).json({ message: 'Şifre güncellenemedi' });
  }
};

// @desc    Hesap Silme
// @route   DELETE /api/profile
// @access  Private (Madde 7)
export const deleteProfile = async (req, res) => {
  let connection = null;
  try {
    const userId = req.user._id.toString();

    // 1. RabbitMQ'ya bağlan
    connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // 2. Kuyruğu garantile
    await channel.assertQueue(ACCOUNT_DELETION_QUEUE, { durable: true });

    // 3. Mesaj içeriği
    const message = {
      userId,
      requestedAt: new Date().toISOString(),
      requestedBy: userId
    };

    // 4. Kuyruğa ekle
    channel.sendToQueue(
      ACCOUNT_DELETION_QUEUE,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    await channel.close();

    // İşlem kuyruğa alındı, anında yanıt dön (204 No Content veya 202 Accepted)
    res.status(204).send();
  } catch (error) {
    console.error('Hesap silme kuyruk hatası:', error.message);
    res.status(400).json({ message: 'Hesap silinemedi' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {}
    }
  }
};
