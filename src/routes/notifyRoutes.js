import express from 'express';
import { sendNotification, listNotifications, markNotificationRead, deleteNotification } from '../controllers/notifyController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Bildirim İşlemleri
 */

/**
 * @swagger
 * /api/admin/notifications:
 *   post:
 *     summary: Bildirim gönder (Admin)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: Yeni bir yarışma başladı!
 *     responses:
 *       201:
 *         description: Bildirim gönderildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Hata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/admin/notifications', sendNotification);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Bildirimleri listele
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Bildirim listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 */
router.get('/notifications', listNotifications);

/**
 * @swagger
 * /api/notifications/{notifId}/read:
 *   put:
 *     summary: Bildirimi okundu olarak işaretle
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: notifId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bildirim ID
 *     responses:
 *       200:
 *         description: Bildirim güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       404:
 *         description: Bildirim bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/notifications/:notifId/read', markNotificationRead);

/**
 * @swagger
 * /api/notifications/{notifId}:
 *   delete:
 *     summary: Bildirimi sil
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: notifId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bildirim ID
 *     responses:
 *       204:
 *         description: Bildirim silindi
 *       404:
 *         description: Bildirim bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/notifications/:notifId', deleteNotification);

export default router;

