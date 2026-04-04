import express from 'express';
import { startAnalysis, getReport, deleteReport, updateAiPrompt } from '../controllers/aiController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: Yapay Zeka Analiz İşlemleri
 */

/**
 * @swagger
 * /api/ai/analysis:
 *   post:
 *     summary: Kişisel analiz başlat
 *     tags: [AI]
 *     responses:
 *       202:
 *         description: Analiz oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Analysis'
 *       400:
 *         description: Hata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/ai/analysis', startAnalysis);

/**
 * @swagger
 * /api/ai/reports/{reportId}:
 *   get:
 *     summary: Analiz raporunu görüntüle
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rapor ID
 *     responses:
 *       200:
 *         description: Rapor bulundu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Analysis'
 *       404:
 *         description: Rapor bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Analiz raporunu sil
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rapor ID
 *     responses:
 *       204:
 *         description: Rapor silindi
 *       404:
 *         description: Rapor bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/ai/reports/:reportId', getReport);
router.delete('/ai/reports/:reportId', deleteReport);

/**
 * @swagger
 * /api/admin/ai/prompt:
 *   put:
 *     summary: Yapay zeka sistem promptunu güncelle (Admin)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - promptText
 *             properties:
 *               promptText:
 *                 type: string
 *                 example: "Kullanıcının güçlü ve zayıf yönlerini analiz et..."
 *     responses:
 *       200:
 *         description: Prompt güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Prompt güncellendi
 *       400:
 *         description: Hata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/admin/ai/prompt', updateAiPrompt);

export default router;

