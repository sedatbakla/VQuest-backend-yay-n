import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb+srv://VQuest_DB:VQuestPass@vquest.6psj6lq.mongodb.net/?appName=VQuest';

async function createAdmin() {
  try {
    console.log('Veritabanına bağlanılıyor...');
    await mongoose.connect(mongoUri);
    console.log('Bağlantı başarılı.');

    const username = 'admin';
    const password = 'admin';
    const email = 'admin@vquest.com';

    // Önce aynı kullanıcı adı veya e-posta ile biri var mı kontrol edelim
    let existingUser = await User.findOne({ 
      $or: [{ username: username }, { email: email }] 
    });

    if (existingUser) {
      console.log('Bu kullanıcı zaten mevcut. Mevcut olanı siliyorum veya güncelliyorum...');
      await User.deleteOne({ _id: existingUser._id });
      console.log('Mevcut kullanıcı silindi.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const adminUser = new User({
      username: username,
      email: email,
      password: hashedPassword,
      role: 'admin'
    });

    await adminUser.save();
    console.log(`Yeni admin hesabı başarıyla oluşturuldu!`);
    console.log(`Kullanıcı Adı: ${username}`);
    console.log(`Şifre: ${password}`);
    console.log(`Rol: admin`);

  } catch (error) {
    console.error('Hata oluştu:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

createAdmin();
