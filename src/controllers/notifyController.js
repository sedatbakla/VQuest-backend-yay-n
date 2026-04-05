import Notification from '../models/Notification.js';
import { getIO } from '../services/socketService.js';

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

    // Socket.io ile anlık bildirim gönder (Tüm bağlı kullanıcılara)
    try {
      const io = getIO();
      io.emit('newNotification', {
        _id: notification._id,
        message: notification.message,
        isRead: false,
        createdAt: notification.createdAt
      });
    } catch (socketErr) {
      console.error('Socket notification emit error:', socketErr.message);
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
    const userId = req.user ? req.user._id : null;

    // Fetch user specific and global notifications
    const notifications = await Notification.find({
      $or: [
        { userId: userId },
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

    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: 'Bildirim silinemedi' });
  }
};
