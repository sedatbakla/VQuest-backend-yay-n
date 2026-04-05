import express from 'express';
import { getProfile, updatePassword, deleteProfile } from '../controllers/profileController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: Profil ve Hesap İşlemleri
 */

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Profil Görüntüleme (Madde 3)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 score:
 *                   type: integer
 *       401:
 *         description: Kimlik doğrulama başarısız
 *   delete:
 *     summary: Hesap Silme (Madde 7)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Hesap başarıyla silindi
 *       401:
 *         description: Kimlik doğrulama başarısız
 */
router.get('/profile', authMiddleware, getProfile);
router.delete('/profile', authMiddleware, deleteProfile);

/**
 * @swagger
 * /api/profile/password:
 *   put:
 *     summary: Şifre Güncelleme (Madde 4)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 example: YeniSifre456!
 *     responses:
 *       200:
 *         description: Şifre güncellendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Kimlik doğrulama başarısız
 */
router.put('/profile/password', authMiddleware, updatePassword);

export default router;
