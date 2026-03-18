import express from 'express';
import { makeSuggestion, listSuggestions, rejectSuggestion } from '../controllers/suggestionController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Suggestions
 *   description: Soru Önerileri (Kullanıcı & Admin)
 */

/**
 * @swagger
 * /api/suggestions:
 *   post:
 *     summary: Soru Önerisi Yapma (Madde 24)
 *     tags: [Suggestions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questionText:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correctAnswer:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Öneri gönderildi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Kimlik doğrulama başarısız
 */
router.post('/suggestions', authMiddleware, makeSuggestion);

/**
 * @swagger
 * /api/admin/suggestions:
 *   get:
 *     summary: Önerilen Soruları Listeleme (Madde 27)
 *     tags: [Suggestions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Öneriler listelendi
 *       401:
 *         description: Kimlik doğrulama başarısız
 *       403:
 *         description: Yetkisiz erişim (Admin gerekli)
 */
router.get('/admin/suggestions', authMiddleware, adminMiddleware, listSuggestions);

/**
 * @swagger
 * /api/admin/suggestions/{suggestionId}:
 *   delete:
 *     summary: Önerilen Soruyu Reddetme (Madde 29)
 *     tags: [Suggestions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: suggestionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Öneri ID
 *     responses:
 *       204:
 *         description: Öneri reddedildi ve silindi
 *       401:
 *         description: Kimlik doğrulama başarısız
 *       403:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Öneri bulunamadı
 */
router.delete('/admin/suggestions/:suggestionId', authMiddleware, adminMiddleware, rejectSuggestion);

export default router;
