

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';

import cors from 'cors';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';
import Category from './src/models/Category.js';
import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './src/config/swagger.js';
import { initSocket, getIO } from './src/services/socketService.js';
import { connectRabbit, consumeQueue } from './services/rabbitService.js';
import { generalLimiter } from './src/config/rateLimiter.js'; // Genel API rate limiter
import { consumeActivityLogs } from './services/rabbitmqService.js';
import { startAccountDeletionWorker } from './workers/accountDeletionWorker.js';

import aiRoutes from './src/routes/aiRoutes.js';
import notifyRoutes from './src/routes/notifyRoutes.js';
import categoryRoutes from './src/routes/categoryRoutes.js';
import questionRoutes from './src/routes/questionRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import profileRoutes from './src/routes/profileRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import packageRoutes from './src/routes/packageRoutes.js';
import suggestionRoutes from './src/routes/suggestionRoutes.js';
import roomRoutes from './src/routes/roomRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';

const app = express();
app.use(cors()); // Allow requests from local frontend (localhost:5173)
const httpServer = createServer(app);
initSocket(httpServer);

await connectDB();
consumeActivityLogs();
const port = process.env.PORT || 3000;

// Env Check (Safe)
if (!process.env.JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET is missing!');
} else {
  console.log('✅ JWT_SECRET is present (Length:', process.env.JWT_SECRET.length, ')');
}

// Redis Env Check
if (!process.env.REDIS_URL) {
  console.warn('⚠️  REDIS_URL tanımlanmadı. Varsayılan redis://localhost:6379 kullanılacak.');
} else {
  console.log('✅ REDIS_URL mevcut:', process.env.REDIS_URL);
}

app.use(express.json());

// Genel API Rate Limiter — Tüm /api rotalarına uygulanır (1 dakikada maks 100 istek)
app.use('/api', generalLimiter);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'VQuest API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
}));

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: `VQuest Backend is running on port ${port}! Docs: https://vquest-backend-api.onrender.com/api-docs` });
});

// API Routes
app.use('/api', adminRoutes);
app.use('/api', aiRoutes);
app.use('/api', notifyRoutes);
app.use('/api', categoryRoutes);
app.use('/api', questionRoutes);
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', userRoutes);
app.use('/api', packageRoutes);
app.use('/api', suggestionRoutes);
app.use('/api', roomRoutes);

// Start the server
httpServer.listen(port, () => {
  console.log(`Server is running at ${process.env.NODE_ENV === 'production' ? 'https://vquest-backend-api.onrender.com' : 'http://localhost:' + port}`);
  console.log(`API Docs: https://vquest-backend-api.onrender.com/api-docs`);

  // Auto Seed Admin
  const seedAdmin = async () => {
    try {
      const adminExists = await User.findOne({ role: 'admin' });
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await User.create({
          username: 'VQuestAdmin',
          email: 'admin@vquest.com',
          password: hashedPassword,
          role: 'admin'
        });
        console.log('✅ Default Admin created: admin@vquest.com / admin123');
      }
    } catch (err) {
      console.error('❌ Admin seeding failed:', err.message);
    }
  };
  seedAdmin();

  // RabbitMQ ve Consumer Başlatma
  const startRabbit = async () => {
    try {
      await connectRabbit();
      consumeQueue((data) => {
        const io = getIO();
        io.emit('newNotification', data);
        console.log('📢 Bildirim kuyruktan alındı ve Socket.io ile gönderildi.');
      });
    } catch (err) {
      console.error('❌ RabbitMQ başlatılamadı:', err.message);
    }
  };
  startRabbit();

  // Account Deletion Worker — account_deletion_queue'yu dinler
  // Sunucu ile aynı process'te çalışır, ayrı terminal gerekmez
  startAccountDeletionWorker();
});
