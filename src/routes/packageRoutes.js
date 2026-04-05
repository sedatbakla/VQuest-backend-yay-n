import express from 'express';
import { createPackage, listPackages, updatePackage, deletePackage } from '../controllers/packageController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Packages
 *   description: Özel Soru Paketleri
 */

/**
 * @swagger
 * /api/packages:
 *   post:
 *     summary: Soru Paketi Oluşturma (Madde 23)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               questions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Paket oluşturuldu
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Kimlik doğrulama başarısız
 */
router.post('/packages', authMiddleware, adminMiddleware, createPackage);

/**
 * @swagger
 * /api/packages:
 *   get:
 *     summary: Soru Paketi Listeleme (Madde 26)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paketler listelendi
 *       401:
 *         description: Kimlik doğrulama başarısız
 */
router.get('/packages', authMiddleware, listPackages);

/**
 * @swagger
 * /api/packages/{packageId}:
 *   put:
 *     summary: Soru Paketi Güncelleme (Madde 25)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Paket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               questions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Paket güncellendi
 *       401:
 *         description: Kimlik doğrulama başarısız
 *       404:
 *         description: Paket bulunamadı
 */
router.put('/packages/:packageId', authMiddleware, adminMiddleware, updatePackage);

/**
 * @swagger
 * /api/packages/{packageId}:
 *   delete:
 *     summary: Soru Paketi Silme (Madde 28)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Paket ID
 *     responses:
 *       204:
 *         description: Paket silindi
 *       401:
 *         description: Kimlik doğrulama başarısız
 *       404:
 *         description: Paket bulunamadı
 */
router.delete('/packages/:packageId', authMiddleware, adminMiddleware, deletePackage);

export default router;
