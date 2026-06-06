import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Auth middleware ile korunuyor; edge case'lerde null olabilir
  },
  analysisText: {
    type: String,
    required: true,
  },
}, { timestamps: true });

export default mongoose.model('Analysis', analysisSchema);
