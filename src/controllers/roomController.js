import Room from '../models/Room.js';

// @desc    Oda Oluşturma (Madde 15)
// @route   POST /api/rooms
// @access  Private
export const createRoom = async (req, res) => {
  try {
    const { name, maxParticipants, duration } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'name alanı zorunludur' });
    }
    const hostId = req.user._id;
    const room = await Room.create({ name, hostId, maxParticipants, duration });
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Oda Listeleme (Madde 19)
// @route   GET /api/rooms
// @access  Private
export const listRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ status: 'active' });
    res.status(200).json(rooms);
  } catch (error) {
    res.status(401).json({ message: error.message });
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
