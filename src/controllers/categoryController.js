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
