import express from 'express';
import { listQuestions, addQuestion, updateQuestion, deleteQuestion } from '../controllers/questionController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Questions
 *   description: Soru İşlemleri
 */

/**
 * @swagger
 * /api/questions:
 *   get:
 *     summary: Soruları listele
 *     tags: [Questions]
 *     responses:
 *       200:
 *         description: Soru listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Question'
 */
router.get('/questions', listQuestions);

/**
 * @swagger
 * /api/admin/questions:
 *   post:
 *     summary: Yeni soru ekle (Admin)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - options
 *               - correctAnswer
 *             properties:
 *               text:
 *                 type: string
 *                 example: JavaScript'de closure nedir?
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Bir fonksiyon", "İç içe fonksiyon kapsamı", "Nesne yöntemi", "Döngü yapısı"]
 *               correctAnswer:
 *                 type: string
 *                 example: İç içe fonksiyon kapsamı
 *     responses:
 *       201:
 *         description: Soru oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Question'
 *       400:
 *         description: Hata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/admin/questions', authMiddleware, addQuestion);

/**
 * @swagger
 * /api/admin/questions/{questionId}:
 *   put:
 *     summary: Soru güncelle (Admin)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Soru ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correctAnswer:
 *                 type: string
 *     responses:
 *       200:
 *         description: Soru güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Question'
 *       404:
 *         description: Soru bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Soru sil (Admin)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Soru ID
 *     responses:
 *       204:
 *         description: Soru silindi
 *       404:
 *         description: Soru bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/admin/questions/:questionId', authMiddleware, updateQuestion);
router.delete('/admin/questions/:questionId', authMiddleware, deleteQuestion);

export default router;

