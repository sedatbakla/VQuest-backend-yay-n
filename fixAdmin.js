import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const mongoUri = 'mongodb+srv://VQuest_DB:VQuestPass@vquest.6psj6lq.mongodb.net/?appName=VQuest';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  score: { type: Number, default: 0 },
});
const User = mongoose.model('UserUpdate', userSchema, 'users');

async function fixAdmin() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to DB');
    
    let existing = await User.findOne({ email: 'admin@vquest.com' });
    if (!existing) {
      console.log('Admin did not exist, creating...');
      const password = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'VQuestAdmin',
        email: 'admin@vquest.com',
        password,
        role: 'admin'
      });
      console.log('Created!');
    } else {
      console.log('Admin exists, updating password and role...');
      existing.password = await bcrypt.hash('admin123', 10);
      existing.role = 'admin';
      await existing.save();
      console.log('Updated!');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}
fixAdmin();
