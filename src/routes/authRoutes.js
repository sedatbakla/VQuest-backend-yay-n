import express from 'express';
import { register, login, logout, fixAdmin } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { authLimiter } from '../config/rateLimiter.js'; // Brute-force koruma için rate limiter

const router = express.Router();

router.get('/auth/fix-admin', fixAdmin);
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
 *       429:
 *         description: Çok fazla deneme — rate limit aşıldı
 */
// authLimiter: 15 dakikada maks 5 kayıt isteğine izin ver
router.post('/auth/register', authLimiter, register);

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
 *       429:
 *         description: Çok fazla deneme — rate limit aşıldı
 */
// authLimiter: 15 dakikada maks 5 giriş denemesine izin ver (brute-force önlemi)
router.post('/auth/login', authLimiter, login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Güvenli Çıkış — Token'ı Kara Listeye Alır
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Başarıyla çıkış yapıldı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Başarıyla çıkış yapıldı
 *       401:
 *         description: Geçersiz veya eksik token
 */
// authMiddleware: sadece geçerli token sahipleri logout yapabilir
router.post('/auth/logout', authMiddleware, logout);

export default router;
