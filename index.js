import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import categoryRoutes from './src/routes/categoryRoutes.js';
import questionRoutes from './src/routes/questionRoutes.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Rotaları uygulamaya ekle
app.use('/api', categoryRoutes);
app.use('/api', questionRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: `VQuest Backend is running on port ${port}!` });
});

// Veritabanı Bağlantısı ve Sunucuyu Başlatma
// Docker ortamında 'mongo' servis ismini kullanıyoruz.
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/vquest')
  .then(() => {
    console.log('MongoDB bağlantısı başarılı.');
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB bağlantı hatası:', err.message);
  });
