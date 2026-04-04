import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  score: { type: Number, default: 0 },
});
const User = mongoose.model('UserSeeder', userSchema, 'users');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true }
});
const Category = mongoose.model('CategorySeeder', categorySchema, 'categories');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
  category: { type: String, default: 'Genel Kültür' }
});
const Question = mongoose.model('QuestionSeeder', questionSchema, 'questions');

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    console.log('Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');
    
    // 1. Admin Seed
    const existing = await User.findOne({ email: 'admin@vquest.com' });
    if (!existing) {
      const password = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'VQuestAdmin',
        email: 'admin@vquest.com',
        password,
        role: 'admin'
      });
      console.log('Admin user created (pw: admin123)');
    }

    // 2. Categories Seed
    const cats = ['Yazılım', 'Genel Kültür', 'Spor', 'Sinema', 'Tarih', 'Bilim'];
    for (const name of cats) {
        const exist = await Category.findOne({ name });
        if (!exist) await Category.create({ name });
    }
    console.log('Categories seeded');

    // 3. Questions Seed
    // Mevcut soruları silip temiz bir başlangıç yapabiliriz veya sadece ekleyebiliriz
    await Question.deleteMany({}); // Temiz başlangıç
    await Question.create([
        { text: 'React hangi şirket tarafından geliştirilmiştir?', options: ['Google', 'Facebook', 'Microsoft', 'Apple'], correctAnswer: 'Facebook', category: 'Yazılım' },
        { text: 'Hangisi bir JavaScript framework/library değildir?', options: ['React', 'Vue', 'Angular', 'Django'], correctAnswer: 'Django', category: 'Yazılım' },
        { text: 'Node.js hangi motoru (engine) kullanır?', options: ['V8', 'SpiderMonkey', 'Chakra', 'Gecko'], correctAnswer: 'V8', category: 'Yazılım' },
        { text: 'Türkiye\'nin başkenti neresidir?', options: ['İstanbul', 'Ankara', 'İzmir', 'Bursa'], correctAnswer: 'Ankara', category: 'Genel Kültür' },
        { text: 'Dünyanın en yüksek dağı hangisidir?', options: ['K2', 'Everest', 'Lhotse', 'Makalu'], correctAnswer: 'Everest', category: 'Genel Kültür' },
        { text: 'Hangi gezegen "Kızıl Gezegen" olarak bilinir?', options: ['Venüs', 'Mars', 'Jüpiter', 'Satürn'], correctAnswer: 'Mars', category: 'Bilim' },
        { text: '0 Celsius kaç Fahrenheit\'tır?', options: ['32', '212', '0', '100'], correctAnswer: '32', category: 'Bilim' }
    ]);
    console.log('Questions seeded');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

seed();
