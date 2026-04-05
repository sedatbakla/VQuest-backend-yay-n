import Room from '../models/Room.js';
import Question from '../models/Question.js';
import Package from '../models/Package.js';
import mongoose from 'mongoose';
import { getIO } from '../services/socketService.js';

// @desc    Oda Oluşturma (Madde 15)
// @route   POST /api/rooms
// @access  Private
export const createRoom = async (req, res) => {
  try {
    const { name, maxParticipants, duration, category, packageId, isPublic, newQuestions } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'name alanı zorunludur' });
    }
    const hostId = req.user._id;

    let questionIds = [];
    
    // 1. Özel Soru oluşturulduysa (sourceType: 'custom' durumu)
    if (newQuestions && Array.isArray(newQuestions) && newQuestions.length > 0) {
      const created = await Promise.all(newQuestions.map(q => 
        Question.create({ ...q, category: name || 'Özel Yarışma', isPrivate: true, creator: hostId })
      ));
      questionIds = created.map(q => q._id);
    } 
    // 2. Hazır Soru Paketinden al
    else if (packageId) {
      const pkg = await Package.findById(packageId);
      if (pkg) questionIds = pkg.questions;
    } 
    // 3. Kategoriden (Hazır Paket Mantığı) al
    else if (category) {
      const questions = await Question.find({ category, isPrivate: { $ne: true } });
      questionIds = questions.map(q => q._id);
    }

    if (questionIds.length === 0) {
       // Hiç soru bulunamadıysa varsayılan 10 tane genel soru ekleyelim
       const fallback = await Question.find({ isPrivate: { $ne: true } }).limit(10);
       questionIds = fallback.map(q => q._id);
    }

    // Join Code oluştur (6 hane rastgele)
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const room = await Room.create({ 
      name, 
      hostId, 
      maxParticipants, 
      duration, 
      category: category || (packageId ? 'Özel Paket' : 'Özel Sorular'),
      questions: questionIds,
      packageId: packageId || null,
      isPublic: isPublic !== undefined ? isPublic : true,
      joinCode,
      participants: [{ userId: hostId, score: 0 }]
    });
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Oda Listeleme - Sadece Public olanlar (Madde 19)
// @route   GET /api/rooms
// @access  Private
export const listRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ status: 'active', isPublic: true, isStarted: false });
    res.status(200).json(rooms);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// @desc    Kod/PIN ile Odaya Katıl (Kahoot PIN Mantığı)
export const joinByCode = async (req, res) => {
  try {
    const { code } = req.body;
    const room = await Room.findOne({ joinCode: code.toUpperCase(), status: 'active' });
    if (!room) return res.status(404).json({ message: 'Geçersiz PIN' });
    if (room.isStarted) return res.status(400).json({ message: 'Oyun zaten başladı' });

    const alreadyJoined = room.participants.some(p => p.userId.toString() === req.user._id.toString());
    if (!alreadyJoined) {
      room.participants.push({ userId: req.user._id, score: 0 });
      await room.save();
    }

    // Socket üzerinden katılımcı listesini güncelle
    const io = getIO();
    const updatedRoom = await Room.findById(room._id).populate('participants.userId', 'username');
    io.to(room._id.toString()).emit('updateScoreboard', updatedRoom.participants);

    res.status(200).json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Oda Başlat (Socket üzerinden senkronize)
export const startRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Oda bulunamadı' });
    if (room.hostId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Yetkisiz işlem' });

    room.isStarted = true;
    await room.save();

    // Socket ile tüm odaya duyur
    const io = getIO();
    io.to(req.params.roomId).emit('gameStarted');

    res.status(200).json({ message: 'Oyun başlatıldı' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Cevap Gönderme (Madde 16)
// @route   POST /api/rooms/:roomId/answers
// @access  Private
export const submitAnswer = async (req, res) => {
  try {
    const { questionId, answer } = req.body;
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Oda bulunamadı' });
    }
    if (room.status === 'closed') {
      return res.status(400).json({ message: 'Oda kapalı' });
    }
    // Gerçek cevap doğrulama mantığı buraya eklenebilir.
    // Şimdilik mock: gönderilen cevabın doğru olduğunu varsayıyoruz.
    const isCorrect = true;

    // Katılımcının skorunu güncelle
    const participant = room.participants.find(
      (p) => p.userId.toString() === req.user._id.toString()
    );
    if (participant && isCorrect) {
      participant.score += 10;
      await room.save();
    }

    res.status(200).json({ isCorrect });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// @desc    Odaya Katılma (Madde 17)
// @route   PUT /api/rooms/:roomId/join
// @access  Private
export const joinRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Oda bulunamadı' });
    }
    if (room.status === 'closed') {
      return res.status(400).json({ message: 'Oda kapalı' });
    }
    if (room.participants.length >= room.maxParticipants) {
      return res.status(400).json({ message: 'Oda kapasitesi dolu' });
    }

    const alreadyJoined = room.participants.some(
      (p) => p.userId.toString() === req.user._id.toString()
    );
    if (!alreadyJoined) {
      room.participants.push({ userId: req.user._id, score: 0 });
      await room.save();
    }

    res.status(200).json(room);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// @desc    Oda Ayarı Güncelleme (Madde 18)
// @route   PUT /api/rooms/:roomId/settings
// @access  Private (Oda Sahibi)
export const updateRoomSettings = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Oda bulunamadı' });
    }
    if (room.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bu işlem için oda sahibi olmanız gerekiyor' });
    }

    const { maxParticipants, duration } = req.body;
    if (maxParticipants !== undefined) room.maxParticipants = maxParticipants;
    if (duration !== undefined) room.duration = duration;
    await room.save();

    res.status(200).json(room);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// @desc    Puan Tablosu Görüntüleme (Madde 20)
// @route   GET /api/rooms/:roomId/leaderboard
// @access  Private
export const getLeaderboard = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Oda bulunamadı' });
    }

    const leaderboard = room.participants
      .map((p) => ({ userId: p.userId, score: p.score }))
      .sort((a, b) => b.score - a.score);

    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// @desc    Odadan Katılımcı Çıkarma (Madde 21)
// @route   DELETE /api/rooms/:roomId/participants/:userId
// @access  Private (Oda Sahibi)
export const kickParticipant = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Oda bulunamadı' });
    }
    if (room.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bu işlem için oda sahibi olmanız gerekiyor' });
    }

    const participantIndex = room.participants.findIndex(
      (p) => p.userId.toString() === req.params.userId
    );
    if (participantIndex === -1) {
      return res.status(404).json({ message: 'Katılımcı bulunamadı' });
    }

    room.participants.splice(participantIndex, 1);
    await room.save();

    res.status(204).send();
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// @desc    Oda Kapatma/Silme (Madde 22)
// @route   DELETE /api/rooms/:roomId
// @access  Private (Oda Sahibi)
export const closeRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Oda bulunamadı' });
    }
    if (room.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bu işlem için oda sahibi olmanız gerekiyor' });
    }

    room.status = 'closed';
    await room.save();

    res.status(204).send();
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// @desc    Oda Detayı Getir
// @route   GET /api/rooms/:roomId
// @access  Private
export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate('hostId', 'username')
      .populate('participants.userId', 'username')
      .populate('questions');
    if (!room) return res.status(404).json({ message: 'Oda bulunamadı' });
    res.status(200).json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
