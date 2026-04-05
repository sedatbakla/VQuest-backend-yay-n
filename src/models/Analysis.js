import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  analysisText: {
    type: String,
    required: true,
  },
}, { timestamps: true });

export default mongoose.model('Analysis', analysisSchema);
