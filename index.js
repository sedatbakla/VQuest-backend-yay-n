import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import connectDB from './config/db.js';

const app = express();
connectDB();
const port = process.env.PORT || 3000;

app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: `VQuest Backend is running on port ${port}!` });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
