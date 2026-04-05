import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Paket adı zorunludur'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  isPublic: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

export default mongoose.model('Package', packageSchema);
