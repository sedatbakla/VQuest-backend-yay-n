import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './src/config/swagger.js';
import { createServer } from 'http';
import { initSocket } from './src/services/socketService.js';

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

const app = express();
const httpServer = createServer(app);
initSocket(httpServer);

connectDB();
const port = process.env.PORT || 3000;

app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'VQuest API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
}));

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: `VQuest Backend is running on port ${port}! Docs: http://localhost:${port}/api-docs` });
});

// API Routes
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
  console.log(`Server is running at http://localhost:${port}`);
  console.log(`API Docs: http://localhost:${port}/api-docs`);
});
