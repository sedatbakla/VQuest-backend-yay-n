import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Kimlik Doğrulama İşlemleri
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Yeni Kullanıcı Kaydı (Madde 1)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: vdev_omer
 *               email:
 *                 type: string
 *                 example: omer@vquest.com
 *               password:
 *                 type: string
 *                 example: Sifre123!
 *     responses:
 *       201:
 *         description: Kullanıcı başarıyla oluşturuldu
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
 *       400:
 *         description: Geçersiz istek verisi
 */
router.post('/auth/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı Girişi (Madde 2)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: omer@vquest.com
 *               password:
 *                 type: string
 *                 example: Sifre123!
 *     responses:
 *       200:
 *         description: Giriş başarılı, token döndürüldü
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         description: Geçersiz istek verisi
 *       401:
 *         description: Hatalı e-posta veya şifre
 */
router.post('/auth/login', login);

export default router;
