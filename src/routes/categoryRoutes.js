import express from 'express';
import { listCategories, addCategory, updateCategory } from '../controllers/categoryController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Kategori İşlemleri
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Kategorileri listele
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Kategori listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
router.get('/categories', listCategories);

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Yeni kategori ekle (Admin)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Yazılım Geliştirme
 *     responses:
 *       201:
 *         description: Kategori oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       401:
 *         description: Yetki hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/admin/categories', authMiddleware, addCategory);

/**
 * @swagger
 * /api/admin/categories/{categoryId}:
 *   put:
 *     summary: Kategori güncelle (Admin)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Kategori ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tarih
 *     responses:
 *       200:
 *         description: Kategori güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       404:
 *         description: Kategori bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/admin/categories/:categoryId', authMiddleware, updateCategory);

export default router;

