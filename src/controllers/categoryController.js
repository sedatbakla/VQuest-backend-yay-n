import Category from '../models/Category.js';
import * as redisDataService from '../../services/redisDataService.js';

// @desc    Yeni kategori ekle (Madde 9)
// @route   POST /api/admin/categories
// @access  Admin
export const addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(401).json({ message: 'name alanı zorunludur' });
    }
    const category = await Category.create({ name });

    // Redis ve RabbitMQ'ya gönder
    await redisDataService.addCategory({ mongoId: category._id.toString(), name });

    res.status(201).json(category);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// @desc    Kategori güncelleme (Madde 11)
// @route   PUT /api/admin/categories/:categoryId
// @access  Admin
export const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(401).json({ message: 'name alanı zorunludur' });
    }
    const category = await Category.findByIdAndUpdate(
      req.params.categoryId,
      { name },
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }

    // Redis ve RabbitMQ'da güncelle
    await redisDataService.updateCategory(category._id.toString(), { name });

    res.status(200).json(category);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// @desc    Kategori Listeleme (Madde 13)
// @route   GET /api/categories
// @access  Public
export const listCategories = async (req, res) => {
  try {
    // Önce Redis'ten çekmeyi deneyelim
    const redisCategories = await redisDataService.getAllCategories();

    if (redisCategories && redisCategories.length > 0) {
      return res.status(200).json(redisCategories);
    }

    // Fallback: MongoDB'den çek
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// @desc    Kategori Silme
// @route   DELETE /api/admin/categories/:categoryId
// @access  Admin
export const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Geçerli MongoDB ObjectId mi kontrol et
    const isValidObjectId = /^[a-f\d]{24}$/i.test(categoryId);

    if (isValidObjectId) {
      // MongoDB'den sil
      const category = await Category.findByIdAndDelete(categoryId);
      if (!category) {
        // MongoDB'de yoksa Redis'te de temizle ve başarılı say
        await redisDataService.deleteCategory(categoryId);
        return res.status(204).send();
      }
      // Redis ve RabbitMQ'dan sil
      await redisDataService.deleteCategory(categoryId);
    } else {
      // UUID formatında ID — sadece Redis'ten sil (eski/test verisi)
      await redisDataService.deleteCategory(categoryId);
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
