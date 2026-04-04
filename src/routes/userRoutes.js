import express from 'express';
import { listUsers, blockUser } from '../controllers/userController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Kullanıcı Yönetimi (Admin)
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Kullanıcı Listeleme (Madde 6)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcılar listelendi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 *                   score:
 *                     type: integer
 *                   isBlocked:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *       401:
 *         description: Kimlik doğrulama başarısız
 *       403:
 *         description: Yetkiniz bulunmuyor (Admin gerekli)
 */
router.get('/admin/users', authMiddleware, adminMiddleware, listUsers);

/**
 * @swagger
 * /api/admin/users/{userId}/block:
 *   put:
 *     summary: Kullanıcı Engelleme (Madde 5)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Kullanıcı ID
 *     responses:
 *       200:
 *         description: Kullanıcı engellendi
 *       401:
 *         description: Kimlik doğrulama başarısız
 *       403:
 *         description: Yetkiniz bulunmuyor
 *       404:
 *         description: Kullanıcı bulunamadı
 */
router.put('/admin/users/:userId/block', authMiddleware, adminMiddleware, blockUser);

export default router;
