import express from 'express';
import {
  createRoom,
  listRooms,
  submitAnswer,
  joinRoom,
  updateRoomSettings,
  getLeaderboard,
  kickParticipant,
  closeRoom,
  joinByCode,
  startRoom,
  getRoomById
} from '../controllers/roomController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Madde 15 - Oda Oluşturma
router.post('/rooms', authMiddleware, createRoom);

// Madde 19 - Oda Listeleme
router.get('/rooms', authMiddleware, listRooms);
router.get('/rooms/:roomId', authMiddleware, getRoomById);

// Yeni - Kodla Katılma & Başlatma
router.post('/rooms/join-code', authMiddleware, joinByCode);
router.post('/rooms/:roomId/start', authMiddleware, startRoom);

// Madde 16 - Cevap Gönderme
router.post('/rooms/:roomId/answers', authMiddleware, submitAnswer);

// Madde 17 - Odaya Katılma
router.put('/rooms/:roomId/join', authMiddleware, joinRoom);

// Madde 18 - Oda Ayarı Güncelleme
router.put('/rooms/:roomId/settings', authMiddleware, updateRoomSettings);

// Madde 20 - Puan Tablosu Görüntüleme
router.get('/rooms/:roomId/leaderboard', authMiddleware, getLeaderboard);

// Madde 21 - Odadan Katılımcı Çıkarma
router.delete('/rooms/:roomId/participants/:userId', authMiddleware, kickParticipant);

// Madde 22 - Oda Kapatma/Silme
router.delete('/rooms/:roomId', authMiddleware, closeRoom);

export default router;
