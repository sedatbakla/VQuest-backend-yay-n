import Category from '../models/Category.js';

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
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};
