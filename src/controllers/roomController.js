import Room from '../models/Room.js';
import Question from '../models/Question.js';
import Package from '../models/Package.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { getIO } from '../services/socketService.js';
import redis from '../../services/redisService.js';
import { publishActivityLog } from '../../services/rabbitmqService.js';

// ─── Yardımcı: Kurucu veya Admin mi? ─────────────────────────────────────────
const isHostOrAdmin = (room, user) =>
  room.hostId.toString() === user._id.toString() || user.role === 'admin';

// ─── Yardımcı: joinCode üret (VQ-XXXX formatı) ───────────────────────────────
const generateJoinCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'VQ-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

// ─── Yardımcı: MongoDB ObjectId formatı doğrulama ────────────────────────────
// CastError'ı önceden yakalamak için tüm ID parametreleri buradan geçirilmeli.
const validateObjectId = (id, fieldName = 'id') => {
  if (!mongoose.isValidObjectId(id)) {
    const err = new Error(`Geçersiz ${fieldName} formatı`);
    err.status = 400;
    return { valid: false, error: err };
  }
  return { valid: true };
};

// @desc    Oda Oluşturma
// @route   POST /api/rooms
// @access  Private
// Body: { roomName, categoryId, maxParticipants, duration, packageId, isPublic, newQuestions }
export const createRoom = async (req, res) => {
  try {
    const {
      roomName,
      name,
      categoryId,
      category,
      maxParticipants,
      duration,
      packageId,
      isPublic,
      newQuestions
    } = req.body;

    const roomNameResolved = roomName || name;
    if (!roomNameResolved) {
      return res.status(400).json({ message: 'roomName alanı zorunludur' });
    }

    // packageId ObjectId doğrulama
    if (packageId) {
      const pkgCheck = validateObjectId(packageId, 'packageId');
      if (!pkgCheck.valid) return res.status(400).json({ message: pkgCheck.error.message });
    }

    const hostId = req.user._id;
    let questionIds = [];

    if (newQuestions && Array.isArray(newQuestions) && newQuestions.length > 0) {
      const created = await Promise.all(
        newQuestions.map(q =>
          Question.create({ ...q, category: roomNameResolved, isPrivate: true, creator: hostId })
        )
      );
      questionIds = created.map(q => q._id);
    } else if (packageId) {
      const pkg = await Package.findById(packageId);
      if (!pkg) return res.status(404).json({ message: 'Soru paketi bulunamadı' });
      questionIds = pkg.questions;
    } else if (categoryId) {
      const questions = await Question.find({ category: categoryId, isPrivate: { $ne: true } });
      questionIds = questions.map(q => q._id);
    } else if (category) {
      const questions = await Question.find({ category, isPrivate: { $ne: true } });
      questionIds = questions.map(q => q._id);
    }

    if (questionIds.length === 0) {
      const fallback = await Question.find({ isPrivate: { $ne: true } }).limit(10);
      questionIds = fallback.map(q => q._id);
    }

    // Benzersiz joinCode üret
    let joinCode;
    let attempts = 0;
    do {
      joinCode = generateJoinCode();
      attempts++;
    } while ((await Room.findOne({ joinCode })) && attempts < 10);

    const room = await Room.create({
      name: roomNameResolved,
      hostId,
      maxParticipants: maxParticipants || 10,
      duration: duration || 30,
      category: categoryId || category || (packageId ? 'Özel Paket' : 'Özel Sorular'),
      questions: questionIds,
      packageId: packageId || null,
      isPublic: isPublic !== undefined ? isPublic : true,
      joinCode,
      participants: [{ userId: hostId, score: 0 }]
    });

    // Redis leaderboard — kurucu 0 puanla başlar
    await redis.zadd(`room:${room._id}:leaderboard`, 0, hostId.toString());

    // RabbitMQ aktivite logu
    publishActivityLog({
      userId: hostId.toString(),
      action: 'created_room',
      roomId: room._id.toString(),
      timestamp: new Date().toISOString()
    });

    res.status(201).json(room);
  } catch (error) {
    console.error('createRoom error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Oda Listeleme
// @route   GET /api/rooms
// @access  Private
export const listRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ status: 'active', isPublic: true, isStarted: false })
      .populate('hostId', 'username')
      .select('-questions');
    res.status(200).json(rooms);
  } catch (error) {
    console.error('listRooms error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Oda Detayı
// @route   GET /api/rooms/:roomId
// @access  Private
export const getRoomById = async (req, res) => {
  try {
    // ✅ CastError önleme: roomId formatı doğrula
    const check = validateObjectId(req.params.roomId, 'roomId');
    if (!check.valid) return res.status(400).json({ message: check.error.message });

    const room = await Room.findById(req.params.roomId)
      .populate('hostId', 'username')
      .populate('participants.userId', 'username')
      .populate('questions');
    if (!room) return res.status(404).json({ message: 'Oda bulunamadı' });
    res.status(200).json(room);
  } catch (error) {
    console.error('getRoomById error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Kod/PIN ile Odaya Katıl
// @route   POST /api/rooms/join-code
// @access  Private
// Body: { code: "VQ-7A3B" }
export const joinByCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ message: 'code alanı zorunludur ve string olmalıdır' });
    }

    const room = await Room.findOne({ joinCode: code.toUpperCase().trim(), status: 'active' });
    if (!room) return res.status(404).json({ message: 'Geçersiz davet kodu veya oda bulunamadı' });
    if (room.isStarted) return res.status(400).json({ message: 'Oyun zaten başladı, katılamazsınız' });
    if (room.participants.length >= room.maxParticipants) {
      return res.status(400).json({ message: 'Oda kapasitesi dolu' });
    }

    const alreadyJoined = room.participants.some(
      p => p.userId.toString() === req.user._id.toString()
    );
    if (!alreadyJoined) {
      room.participants.push({ userId: req.user._id, score: 0 });
      await room.save();
      await redis.zadd(`room:${room._id}:leaderboard`, 0, req.user._id.toString());

      publishActivityLog({
        userId: req.user._id.toString(),
        action: 'joined_room_by_code',
        roomId: room._id.toString(),
        timestamp: new Date().toISOString()
      });
    }

    const io = getIO();
    const updatedRoom = await Room.findById(room._id).populate('participants.userId', 'username');
    io.to(room._id.toString()).emit('participantJoined', updatedRoom.participants);

    res.status(200).json({ message: 'Odaya katıldınız', room: updatedRoom });
  } catch (error) {
    console.error('joinByCode error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Oyunu Başlat
// @route   POST /api/rooms/:roomId/start
// @access  Private (Oda Kurucusu)
export const startRoom = async (req, res) => {
  try {
    // ✅ CastError önleme
    const check = validateObjectId(req.params.roomId, 'roomId');
    if (!check.valid) return res.status(400).json({ message: check.error.message });

    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Oda bulunamadı' });

    if (room.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Oyunu sadece oda kurucusu başlatabilir' });
    }
    if (room.isStarted) {
      return res.status(400).json({ message: 'Oyun zaten başlatılmış' });
    }

    room.isStarted = true;
    await room.save();

    const io = getIO();
    io.to(req.params.roomId).emit('gameStarted', { roomId: req.params.roomId });

    publishActivityLog({
      userId: req.user._id.toString(),
      action: 'started_room',
      roomId: req.params.roomId,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ message: 'Oyun başlatıldı' });
  } catch (error) {
    console.error('startRoom error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cevap Gönderme
// @route   POST /api/rooms/:roomId/answers
// @access  Private
// Body: { questionId, answer }
export const submitAnswer = async (req, res) => {
  try {
    const { questionId, answer } = req.body;

    // ✅ Alan varlığı
    if (!questionId || answer === undefined || answer === null) {
      return res.status(400).json({ message: 'questionId ve answer alanları zorunludur' });
    }

    // ✅ CastError önleme: roomId ve questionId formatı doğrula
    const roomCheck = validateObjectId(req.params.roomId, 'roomId');
    if (!roomCheck.valid) return res.status(400).json({ message: roomCheck.error.message });

    const qCheck = validateObjectId(questionId, 'questionId');
    if (!qCheck.valid) return res.status(400).json({ message: qCheck.error.message });

    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Oda bulunamadı' });
    if (room.status === 'closed') return res.status(400).json({ message: 'Oda kapalı' });
    if (!room.isStarted) return res.status(400).json({ message: 'Oyun henüz başlamadı' });

    const participant = room.participants.find(
      p => p.userId.toString() === req.user._id.toString()
    );
    if (!participant) {
      return res.status(403).json({ message: 'Bu odanın katılımcısı değilsiniz' });
    }

    // Sorunun odaya ait olup olmadığını kontrol et (mongoose ObjectId karşılaştırması)
    const questionBelongsToRoom = room.questions.some(
      qId => qId.toString() === questionId.toString()
    );
    if (!questionBelongsToRoom) {
      return res.status(400).json({ message: 'Bu soru bu odaya ait değil' });
    }

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: 'Soru bulunamadı' });

    // Cevap doğrulama — trim ve case-insensitive
    const isCorrect =
      question.correctAnswer.trim().toLowerCase() === String(answer).trim().toLowerCase();
    const points = isCorrect ? 10 : 0;

    if (isCorrect) {
      participant.score += points;
      await room.save();

      // Redis leaderboard güncelle
      await redis.zincrby(`room:${req.params.roomId}:leaderboard`, points, req.user._id.toString());

      // Socket: anlık skor güncellemesi
      const io = getIO();
      io.to(req.params.roomId).emit('scoreUpdated', {
        userId: req.user._id,
        username: req.user.username,
        score: participant.score
      });
    }

    // Yanlış cevapta doğru cevabı döndürme (bilgi sızıntısı riski — istenirse kaldırılabilir)
    res.status(200).json({
      isCorrect,
      points,
      correctAnswer: isCorrect ? null : question.correctAnswer
    });
  } catch (error) {
    console.error('submitAnswer error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Odaya Katılma (açık odalar)
// @route   PUT /api/rooms/:roomId/join
// @access  Private
export const joinRoom = async (req, res) => {
  try {
    // ✅ CastError önleme
    const check = validateObjectId(req.params.roomId, 'roomId');
    if (!check.valid) return res.status(400).json({ message: check.error.message });

    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Oda bulunamadı' });
    if (room.status === 'closed') return res.status(400).json({ message: 'Oda kapalı' });
    if (!room.isPublic) return res.status(403).json({ message: 'Bu oda özel, davet kodu gerekiyor' });
    if (room.isStarted) return res.status(400).json({ message: 'Oyun başladı, katılamazsınız' });
    if (room.participants.length >= room.maxParticipants) {
      return res.status(400).json({ message: 'Oda kapasitesi dolu' });
    }

    const alreadyJoined = room.participants.some(
      p => p.userId.toString() === req.user._id.toString()
    );
    if (!alreadyJoined) {
      room.participants.push({ userId: req.user._id, score: 0 });
      await room.save();
      await redis.zadd(`room:${room._id}:leaderboard`, 0, req.user._id.toString());
    }

    publishActivityLog({
      userId: req.user._id.toString(),
      action: 'joined_room',
      roomId: req.params.roomId,
      timestamp: new Date().toISOString()
    });

    const io = getIO();
    io.to(req.params.roomId).emit('participantJoined', {
      userId: req.user._id,
      username: req.user.username
    });

    res.status(200).json(room);
  } catch (error) {
    console.error('joinRoom error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Oda Ayarlarını Güncelleme
// @route   PUT /api/rooms/:roomId/settings
// @access  Private (Oda Kurucusu)
// Body: { maxParticipants, timeLimit } — timeLimit = duration alias
export const updateRoomSettings = async (req, res) => {
  try {
    // ✅ CastError önleme
    const check = validateObjectId(req.params.roomId, 'roomId');
    if (!check.valid) return res.status(400).json({ message: check.error.message });

    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Oda bulunamadı' });

    if (room.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bu işlem için oda kurucusu olmanız gerekiyor' });
    }
    if (room.isStarted) {
      return res.status(400).json({ message: 'Oyun başladıktan sonra ayarlar değiştirilemez' });
    }

    const { maxParticipants, timeLimit, duration } = req.body;

    if (maxParticipants !== undefined) {
      if (typeof maxParticipants !== 'number' || maxParticipants < 2) {
        return res.status(400).json({ message: 'maxParticipants en az 2 olmalıdır' });
      }
      if (maxParticipants < room.participants.length) {
        return res.status(400).json({ message: 'Maksimum katılımcı mevcut katılımcı sayısından az olamaz' });
      }
      room.maxParticipants = maxParticipants;
    }
    // timeLimit ve duration her ikisi de kabul edilir
    const newDuration = timeLimit !== undefined ? timeLimit : duration;
    if (newDuration !== undefined) {
      if (typeof newDuration !== 'number' || newDuration < 1) {
        return res.status(400).json({ message: 'timeLimit/duration en az 1 dakika olmalıdır' });
      }
      room.duration = newDuration;
    }

    await room.save();
    res.status(200).json(room);
  } catch (error) {
    console.error('updateRoomSettings error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Anlık Liderlik Tablosu
// @route   GET /api/rooms/:roomId/leaderboard
// @access  Private
export const getLeaderboard = async (req, res) => {
  try {
    // ✅ CastError önleme
    const check = validateObjectId(req.params.roomId, 'roomId');
    if (!check.valid) return res.status(400).json({ message: check.error.message });

    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Oda bulunamadı' });

    const redisKey = `room:${req.params.roomId}:leaderboard`;
    const redisData = await redis.zrevrange(redisKey, 0, -1, 'WITHSCORES');

    const leaderboard = [];

    if (redisData.length > 0) {
      const userIds = [];
      for (let i = 0; i < redisData.length; i += 2) userIds.push(redisData[i]);

      const users = await User.find({ _id: { $in: userIds } }).select('username');
      const userMap = {};
      users.forEach(u => (userMap[u._id.toString()] = u.username));

      for (let i = 0; i < redisData.length; i += 2) {
        leaderboard.push({
          rank: Math.floor(i / 2) + 1,
          userId: redisData[i],
          username: userMap[redisData[i]] || 'Bilinmeyen Kullanıcı',
          score: parseInt(redisData[i + 1], 10)
        });
      }
    } else {
      // Fallback: MongoDB participants
      const sorted = [...room.participants].sort((a, b) => b.score - a.score);
      if (sorted.length > 0) {
        const pIds = sorted.map(p => p.userId);
        const pUsers = await User.find({ _id: { $in: pIds } }).select('username');
        const pMap = {};
        pUsers.forEach(u => (pMap[u._id.toString()] = u.username));
        sorted.forEach((p, idx) => {
          leaderboard.push({
            rank: idx + 1,
            userId: p.userId,
            username: pMap[p.userId.toString()] || 'Bilinmeyen Kullanıcı',
            score: p.score
          });
        });
      }
    }

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('getLeaderboard error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Odadan Katılımcı Atma
// @route   DELETE /api/rooms/:roomId/participants/:userId
// @access  Private (Oda Kurucusu VEYA Admin)
export const kickParticipant = async (req, res) => {
  try {
    // ✅ CastError önleme: roomId ve userId
    const roomCheck = validateObjectId(req.params.roomId, 'roomId');
    if (!roomCheck.valid) return res.status(400).json({ message: roomCheck.error.message });

    const userCheck = validateObjectId(req.params.userId, 'userId');
    if (!userCheck.valid) return res.status(400).json({ message: userCheck.error.message });

    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Oda bulunamadı' });

    if (!isHostOrAdmin(room, req.user)) {
      return res.status(403).json({ message: 'Bu işlem için oda kurucusu veya admin olmanız gerekiyor' });
    }

    if (req.params.userId === room.hostId.toString()) {
      return res.status(400).json({ message: 'Oda kurucusu kendini atamaz' });
    }

    const idx = room.participants.findIndex(
      p => p.userId.toString() === req.params.userId
    );
    if (idx === -1) return res.status(404).json({ message: 'Katılımcı bulunamadı' });

    room.participants.splice(idx, 1);
    await room.save();

    // Redis leaderboard'dan da çıkar
    await redis.zrem(`room:${req.params.roomId}:leaderboard`, req.params.userId);

    const io = getIO();
    io.to(req.params.roomId).emit('participantKicked', { userId: req.params.userId });

    publishActivityLog({
      userId: req.params.userId,
      action: 'kicked_from_room',
      roomId: req.params.roomId,
      timestamp: new Date().toISOString()
    });

    // Gereksinim: 204 No Content
    res.status(204).send();
  } catch (error) {
    console.error('kickParticipant error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Odayı Kapatma / Sonlandırma
// @route   DELETE /api/rooms/:roomId
// @access  Private (Oda Kurucusu VEYA Admin)
export const closeRoom = async (req, res) => {
  try {
    // ✅ CastError önleme
    const check = validateObjectId(req.params.roomId, 'roomId');
    if (!check.valid) return res.status(400).json({ message: check.error.message });

    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Oda bulunamadı' });

    if (!isHostOrAdmin(room, req.user)) {
      return res.status(403).json({ message: 'Bu işlem için oda kurucusu veya admin olmanız gerekiyor' });
    }

    room.status = 'closed';
    room.isStarted = false;
    await room.save();

    // Redis leaderboard temizle
    await redis.del(`room:${req.params.roomId}:leaderboard`);

    const io = getIO();
    io.to(req.params.roomId).emit('roomClosed', { roomId: req.params.roomId });

    publishActivityLog({
      userId: req.user._id.toString(),
      action: 'closed_room',
      roomId: req.params.roomId,
      timestamp: new Date().toISOString()
    });

    // Gereksinim: 204 No Content
    res.status(204).send();
  } catch (error) {
    console.error('closeRoom error:', error);
    res.status(500).json({ message: error.message });
  }
};
