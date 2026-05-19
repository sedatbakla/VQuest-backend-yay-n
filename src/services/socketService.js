import { Server } from 'socket.io';
import mongoose from 'mongoose';
import Room from '../models/Room.js';
import redis from '../../services/redisService.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Geliştirme aşamasında her yerden erişim
      methods: ["GET", "POST"]
    }
  });

  const socketToRoom = new Map(); // socket.id -> { roomId, userId, isHost }

  io.on('connection', (socket) => {
    console.log('Yeni bağlantı:', socket.id);

    // Odaya Katılma
    socket.on('joinRoom', async ({ roomId, user }) => {
      try {
        // ObjectId format validation
        if (!mongoose.isValidObjectId(roomId)) {
          socket.emit('error', { message: 'Geçersiz roomId formatı' });
          return;
        }

        socket.join(roomId);
        const room = await Room.findById(roomId);
        const isHost = room?.hostId.toString() === (user?._id || user?.id);

        socketToRoom.set(socket.id, { roomId, userId: user?._id || user?.id, isHost });
        console.log(`${user?.username} odaya katıldı: ${roomId} (Host: ${isHost})`);

        const updatedRoom = await Room.findById(roomId).populate('participants.userId', 'username');
        if (updatedRoom) {
          io.to(roomId).emit('updateScoreboard', updatedRoom.participants);
        }
      } catch (err) {
        console.error('joinRoom socket error:', err);
      }
    });

    // Oyunu Başlatma (Sadece Host)
    socket.on('startGame', ({ roomId }) => {
      io.to(roomId).emit('gameStarted');
    });

    // Sonraki Soruya Geç (Host tetikler, tüm odaya yayınlanır)
    socket.on('nextQuestion', ({ roomId, questionIndex }) => {
      io.to(roomId).emit('nextQuestion', { questionIndex });
    });

    // Skor Tablosu Yayını (REST API submit'ten sonra server tetikler)
    // ⚠️ GÜVENLİK: İstemciden doğrudan skor/isCorrect kabul EDİLMEZ.
    // Bu handler yalnızca server'ın skorboard güncellemesi için kullanılır.
    socket.on('requestScoreboard', async ({ roomId }) => {
      try {
        if (!mongoose.isValidObjectId(roomId)) return;
        const updatedRoom = await Room.findById(roomId).populate('participants.userId', 'username');
        if (updatedRoom) {
          io.to(roomId).emit('updateScoreboard', updatedRoom.participants);
        }
      } catch (err) {
        console.error('requestScoreboard error:', err);
      }
    });

    // Odayı Kapatma — Socket eventi (REST API closeRoom ile paralel)
    socket.on('closeRoom', async ({ roomId }) => {
      try {
        if (!mongoose.isValidObjectId(roomId)) return;
        // Odayı silmek yerine status'u closed yap (veri kaybını önle)
        await Room.findByIdAndUpdate(roomId, { status: 'closed', isStarted: false });
        // ✅ Redis leaderboard temizle
        await redis.del(`room:${roomId}:leaderboard`);
        io.to(roomId).emit('roomClosed', { roomId });
        console.log(`Oda kapatıldı (socket): ${roomId}`);
      } catch (err) {
        console.error('closeRoom socket error:', err);
      }
    });

    socket.on('disconnect', async () => {
      try {
        const data = socketToRoom.get(socket.id);
        if (data) {
          const { roomId, isHost } = data;
          if (isHost && mongoose.isValidObjectId(roomId)) {
            console.log(`Host ayrıldı, oda kapatılıyor: ${roomId}`);
            // Silmek yerine kapat — tarihsel veriler korunur
            await Room.findByIdAndUpdate(roomId, { status: 'closed', isStarted: false });
            // ✅ Redis leaderboard temizle
            await redis.del(`room:${roomId}:leaderboard`);
            io.to(roomId).emit('roomClosed', { roomId });
          }
          socketToRoom.delete(socket.id);
        }
      } catch (err) {
        console.error('disconnect handler error:', err);
      }
      console.log('Bağlantı kesildi:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket not initialized');
  return io;
};
