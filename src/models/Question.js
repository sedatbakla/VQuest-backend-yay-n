import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        if (!Array.isArray(v)) return false;
        return v.filter(opt => opt && opt.trim() !== '').length >= 2;
      },
      message: 'Şıkların en az 2 tanesinin doldurulması zorunluluğu vardır.'
    }
  },
  correctAnswer: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'Genel Kültür'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true, versionKey: false });

export default mongoose.model('Question', questionSchema);
