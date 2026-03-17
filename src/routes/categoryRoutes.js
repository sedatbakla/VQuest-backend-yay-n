import express from 'express';
import { listCategories, addCategory, updateCategory } from '../controllers/categoryController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/categories', listCategories);
router.post('/admin/categories', authMiddleware, addCategory);
router.put('/admin/categories/:categoryId', authMiddleware, updateCategory);

export default router;
