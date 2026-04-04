import Package from '../models/Package.js';

// @desc    Soru Paketi Oluşturma
// @route   POST /api/packages
// @access  Private (Madde 23)
export const createPackage = async (req, res) => {
  try {
    const { title, description, isPublic, questions } = req.body;

    const newPackage = await Package.create({
      title,
      description,
      isPublic,
      questions: questions || [],
      creator: req.user._id,
    });

    res.status(201).json(newPackage);
  } catch (error) {
    res.status(400).json({ message: 'Geçersiz veri: Paket oluşturulamadı', error: error.message });
  }
};

// @desc    Soru Paketi Listeleme
// @route   GET /api/packages
// @access  Private (Madde 26)
export const listPackages = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      // Normal kullanıcılar sadece genel paketleri veya kendi oluşturduklarını görebilir
      query = { $or: [{ isPublic: true }, { creator: req.user._id }] };
    }
    
    const packages = await Package.find(query).populate('creator', 'username').sort({ createdAt: -1 });
    res.status(200).json(packages);
  } catch (error) {
    res.status(400).json({ message: 'Paketler listelenemedi', error: error.message });
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
