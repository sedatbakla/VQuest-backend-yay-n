import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import connectDB from './src/config/db.js';

import aiRoutes from './src/routes/aiRoutes.js';
import notifyRoutes from './src/routes/notifyRoutes.js';

const app = express();
connectDB();
const port = process.env.PORT || 3000;

app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: `VQuest Backend is running on port ${port}!` });
});

// API Routes
app.use('/api', aiRoutes);
app.use('/api', notifyRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
