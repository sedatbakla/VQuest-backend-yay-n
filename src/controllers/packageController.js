import Package from '../models/Package.js';
import Question from '../models/Question.js';

// @desc    Soru Paketi Oluşturma (Birleşik Akış)
// @route   POST /api/packages
// @access  Private
export const createPackage = async (req, res) => {
  try {
    const { title, description, isPublic, questions, newQuestions } = req.body;

    let questionIds = questions || [];

    // Yeni Soruları oluştur ve ID'lerini al
    if (newQuestions && Array.isArray(newQuestions) && newQuestions.length > 0) {
      const created = await Promise.all(newQuestions.map(q => 
        Question.create({ ...q, creator: req.user._id, isPrivate: false })
      ));
      questionIds = [...questionIds, ...created.map(q => q._id)];
    }

    const newPackage = await Package.create({
      title,
      description,
      isPublic,
      questions: questionIds,
      creator: req.user._id,
    });

    res.status(201).json(newPackage);
  } catch (error) {
    res.status(400).json({ message: 'Paket oluşturulamadı', error: error.message });
  }
};

// @desc    Soru Paketi Listeleme
// @route   GET /api/packages
// @access  Private (Madde 26)
export const listPackages = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      // Kullanıcılar sadece adminlerin oluşturduğu paketleri görebilsin (Hazır Paket mantığı)
      // Önce adminlerin ID'lerini bulalım veya doğrudan creator role üzerinden gidelim
      const User = mongoose.model('User');
      const admins = await User.find({ role: 'admin' }).select('_id');
      const adminIds = admins.map(a => a._id);
      
      query = { 
        $or: [
          { creator: { $in: adminIds } },
          { isPublic: true }
        ]
      };
    }
    
    const packages = await Package.find(query)
      .populate('creator', 'username role')
      .populate('questions');
    res.status(200).json(packages);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Soru Paketi Güncelleme
// @route   PUT /api/packages/:packageId
// @access  Private (Madde 25)
export const updatePackage = async (req, res) => {
  try {
    const packageId = req.params.packageId;
    const existingPackage = await Package.findById(packageId);

    if (!existingPackage) {
      return res.status(404).json({ message: 'Paket bulunamadı' });
    }

    // Yalnızca oluşturan kişi veya admin güncelleyebilir
    if (existingPackage.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Kimlik doğrulama başarısız: Yetkisiz işlem' });
    }

    const { title, description, isPublic, questions } = req.body;
    
    existingPackage.title = title || existingPackage.title;
    existingPackage.description = description !== undefined ? description : existingPackage.description;
    existingPackage.isPublic = isPublic !== undefined ? isPublic : existingPackage.isPublic;
    if (questions) existingPackage.questions = questions;

    const updatedPackage = await existingPackage.save();
    res.status(200).json(updatedPackage);

  } catch (error) {
    res.status(400).json({ message: 'Paket güncellenemedi', error: error.message });
  }
};

// @desc    Soru Paketi Silme
// @route   DELETE /api/packages/:packageId
// @access  Private (Madde 28)
export const deletePackage = async (req, res) => {
  try {
    const packageId = req.params.packageId;
    const existingPackage = await Package.findById(packageId);

    if (!existingPackage) {
      return res.status(404).json({ message: 'Paket bulunamadı' });
    }

    if (existingPackage.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Kimlik doğrulama başarısız: Yetkisiz işlem' });
    }

    await Package.findByIdAndDelete(packageId);
    res.status(204).send(); // 204 No Content

  } catch (error) {
    res.status(400).json({ message: 'Paket silinemedi', error: error.message });
  }
};
