import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questionText: {
    type: String,
    required: [true, 'Soru metni zorunludur'],
  },
  options: {
    type: [String],
    required: [true, 'Şıklar zorunludur'],
    validate: {
      validator: function(v) {
        return v && v.length >= 2;
      },
      message: 'En az 2 şık girilmelidir.'
    }
  },
  correctAnswer: {
    type: String,
    required: [true, 'Doğru cevap zorunludur'],
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  }
}, { timestamps: true });

export default mongoose.model('Suggestion', suggestionSchema);
