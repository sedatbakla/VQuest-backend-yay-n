import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// User Schema (minimal for seeder)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
});

const User = mongoose.model('UserSeeder', userSchema, 'users');

async function createAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is not defined in .env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const hashedPassword = await bcrypt.hash('admin', 10);
    
    // Attempt to update or create
    const result = await User.findOneAndUpdate(
      { username: 'admin' },
      { 
        username: 'admin', 
        email: 'admin@admin.com', 
        password: hashedPassword, 
        role: 'admin' 
      },
      { upsert: true, new: true }
    );

    console.log('Admin account created/restored:');
    console.log(`Username: ${result.username}`);
    console.log(`Password: admin`);
    console.log(`Email: ${result.email}`);
    console.log(`Role: ${result.role}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
