import express from 'express';
import {
  createRoom,
  listRooms,
  getRoomById,
  joinByCode,
  startRoom,
  submitAnswer,
  joinRoom,
  updateRoomSettings,
  getLeaderboard,
  kickParticipant,
  closeRoom,
} from '../controllers/roomController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ─── POST /api/rooms — Oda Oluşturma (Gereksinim #1)
router.post('/rooms', authMiddleware, createRoom);

// ─── GET /api/rooms — Aktif Odaları Listeleme (Gereksinim #2a)
router.get('/rooms', authMiddleware, listRooms);

// ─── POST /api/rooms/join-code — Davet Kodu ile Katılma (Gereksinim #4a)
// ⚠️ Bu route GET /api/rooms/:roomId 'den ÖNCE gelmeli (sabit path önceliği)
router.post('/rooms/join-code', authMiddleware, joinByCode);

// ─── GET /api/rooms/:roomId — Oda Detayı (Gereksinim #2b)
router.get('/rooms/:roomId', authMiddleware, getRoomById);

// ─── PUT /api/rooms/:roomId/join — Açık Odaya Katılma (Gereksinim #3)
router.put('/rooms/:roomId/join', authMiddleware, joinRoom);

// ─── PUT /api/rooms/:roomId/settings — Oda Ayarları (Gereksinim #5, sadece kurucu)
router.put('/rooms/:roomId/settings', authMiddleware, updateRoomSettings);

// ─── POST /api/rooms/:roomId/start — Oyunu Başlat (Gereksinim #4b)
router.post('/rooms/:roomId/start', authMiddleware, startRoom);

// ─── POST /api/rooms/:roomId/answers — Cevap Gönder (Gereksinim #6)
router.post('/rooms/:roomId/answers', authMiddleware, submitAnswer);

// ─── GET /api/rooms/:roomId/leaderboard — Liderlik Tablosu (Gereksinim #7, Redis)
router.get('/rooms/:roomId/leaderboard', authMiddleware, getLeaderboard);

// ─── DELETE /api/rooms/:roomId/participants/:userId — Katılımcı At (Gereksinim #8)
router.delete('/rooms/:roomId/participants/:userId', authMiddleware, kickParticipant);

// ─── DELETE /api/rooms/:roomId — Oda Kapat (Gereksinim #9, kurucu veya admin)
router.delete('/rooms/:roomId', authMiddleware, closeRoom);

export default router;
