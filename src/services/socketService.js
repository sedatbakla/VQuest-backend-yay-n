import { Server } from 'socket.io';
import Room from '../models/Room.js';

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
      socket.join(roomId);
      
      const room = await Room.findById(roomId);
      const isHost = room?.hostId.toString() === (user?._id || user?.id);
      
      socketToRoom.set(socket.id, { roomId, userId: user?._id || user?.id, isHost });
      console.log(`${user.username} odaya katıldı: ${roomId} (Host: ${isHost})`);

      try {
        const updatedRoom = await Room.findById(roomId).populate('participants.userId', 'username');
        if (updatedRoom) {
          io.to(roomId).emit('updateScoreboard', updatedRoom.participants);
        }
      } catch (err) {
        console.error('joinRoom Error:', err);
      }
    });

    // Oyunu Başlatma (Sadece Host)
    socket.on('startGame', ({ roomId }) => {
      io.to(roomId).emit('gameStarted');
    });

    // Soru Cevaplama ve Skor Güncelleme
    socket.on('submitAnswer', async ({ roomId, userId, isCorrect, score }) => {
      try {
        const room = await Room.findById(roomId);
        if (room) {
          const pIdx = room.participants.findIndex(p => p.userId.toString() === userId);
          if (pIdx > -1) {
            room.participants[pIdx].score += (isCorrect ? score : 0);
            await room.save();
            const updatedRoom = await Room.findById(roomId).populate('participants.userId', 'username');
            io.to(roomId).emit('updateScoreboard', updatedRoom.participants);
          }
        }
      } catch (err) {
        console.error('submitAnswer Error:', err);
      }
    });

    // Odayı Kapatma (Manuel)
    socket.on('closeRoom', async ({ roomId }) => {
      try {
        await Room.findByIdAndDelete(roomId);
        io.to(roomId).emit('roomClosed');
        console.log(`Oda kapatıldı: ${roomId}`);
      } catch (err) {
        console.error('closeRoom Error:', err);
      }
    });

    socket.on('disconnect', async () => {
      const data = socketToRoom.get(socket.id);
      if (data) {
        const { roomId, isHost } = data;
        if (isHost) {
          console.log(`Host ayrıldı, oda kapatılıyor: ${roomId}`);
          await Room.findByIdAndDelete(roomId);
          io.to(roomId).emit('roomClosed');
        }
        socketToRoom.delete(socket.id);
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
