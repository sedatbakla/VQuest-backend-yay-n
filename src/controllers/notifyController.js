import Notification from '../models/Notification.js';
import { getIO } from '../services/socketService.js';
import redis from '../../services/redisService.js';
import { sendToQueue } from '../../services/rabbitService.js';

// @desc    Bildirim Gönderme
// @route   POST /api/admin/notifications
// @access  Private/Admin
export const sendNotification = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Mesaj alanı gereklidir' });
    }

    const notification = await Notification.create({
      message,
    });

    // RabbitMQ ile kuyruğa gönder (Asenkron işleme)
    try {
      await sendToQueue({
        _id: notification._id,
        message: notification.message,
        isRead: false,
        createdAt: notification.createdAt
      });
    } catch (rabbitErr) {
      console.error('RabbitMQ send error:', rabbitErr.message);
      // Fallback: RabbitMQ çalışmazsa doğrudan socket ile gönder
      const io = getIO();
      io.emit('newNotification', {
        _id: notification._id,
        message: notification.message,
        isRead: false,
        createdAt: notification.createdAt
      });
    }

    // Redis önbelleğini temizle
    try {
      const keys = await redis.keys('notifications:*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log('🗑️ Bildirim önbelleği temizlendi.');
      }
    } catch (redisErr) {
      console.error('Redis cache clear error:', redisErr.message);
    }

    res.status(201).json({
      _id: notification._id,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt
    });
  } catch (error) {
    res.status(400).json({ message: 'Bildirim gönderilemedi' });
  }
};

// @desc    Bildirim Görüntüleme
// @route   GET /api/notifications
// @access  Private
export const listNotifications = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : 'global';
    const cacheKey = `notifications:${userId}`;

    // Önce Redis'e bak
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        console.log('⚡ Bildirimler Redis\'ten getirildi.');
        return res.status(200).json(JSON.parse(cachedData));
      }
    } catch (redisErr) {
      console.error('Redis get error:', redisErr.message);
    }

    // Fetch user specific and global notifications
    const notifications = await Notification.find({
      $or: [
        { userId: req.user ? req.user._id : null },
        { userId: { $exists: false } },
        { userId: null }
      ]
    }).sort({ createdAt: -1 });

    const formattedNotifications = notifications.map(n => ({
      _id: n._id,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt
    }));

    // Redis'e kaydet (5 dakika süreli)
    try {
      await redis.set(cacheKey, JSON.stringify(formattedNotifications), 'EX', 300);
      console.log('💾 Bildirimler Redis\'e kaydedildi.');
    } catch (redisErr) {
      console.error('Redis set error:', redisErr.message);
    }

    res.status(200).json(formattedNotifications);
  } catch (error) {
    res.status(400).json({ message: 'Bildirimler listelenemedi' });
  }
};

// @desc    Bildirim Okundu İşaretleme
// @route   PUT /api/notifications/:notifId/read
// @access  Private
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.notifId);

    if (!notification) {
      return res.status(404).json({ message: 'Bildirim bulunamadı' });
    }

    notification.isRead = true;
    await notification.save();

    // Redis önbelleğini temizle
    const userId = req.user ? req.user._id : 'global';
    await redis.del(`notifications:${userId}`);

    res.status(200).json({
      _id: notification._id,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt
    });
  } catch (error) {
    res.status(400).json({ message: 'Bildirim güncellenemedi' });
  }
};

// @desc    Bildirim Silme
// @route   DELETE /api/notifications/:notifId
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.notifId);

    if (!notification) {
      return res.status(404).json({ message: 'Bildirim bulunamadı' });
    }

    await notification.deleteOne();

    // Redis önbelleğini temizle — silinen bildirim cache'de kalmasın
    try {
      const userId = req.user ? req.user._id : 'global';
      const keys = await redis.keys('notifications:*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log('🗑️ Bildirim silme sonrası önbellek temizlendi.');
      }
    } catch (redisErr) {
      console.error('Redis cache clear error (delete):', redisErr.message);
    }

    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: 'Bildirim silinemedi' });
  }
};
