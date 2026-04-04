import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    default: 0
  }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  maxParticipants: {
    type: Number,
    default: 10
  },
  duration: {
    type: Number, // dakika cinsinden
    default: 30
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  },
  participants: {
    type: [participantSchema],
    default: []
  }
}, { timestamps: true, versionKey: false });

export default mongoose.model('Room', roomSchema);
