import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI;

async function checkUsers() {
  try {
    console.log('Veritabanına bağlanılıyor...');
    await mongoose.connect(mongoUri);
    console.log('Bağlantı başarılı.');

    const users = await User.find({}, 'username email role');
    console.log('Kullanıcılar:');
    users.forEach(u => {
      console.log(`- Username: ${u.username}, Email: ${u.email}, Role: ${u.role}`);
    });

  } catch (error) {
    console.error('Hata:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

checkUsers();
