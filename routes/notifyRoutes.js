import express from 'express';
import { sendNotification, listNotifications, markNotificationRead, deleteNotification } from '../controllers/notifyController.js';

const router = express.Router();

// POST /api/admin/notifications
// Normally protected by admin middleware
router.post('/admin/notifications', sendNotification);

// GET /api/notifications
router.get('/notifications', listNotifications);

// PUT /api/notifications/:notifId/read
router.put('/notifications/:notifId/read', markNotificationRead);

// DELETE /api/notifications/:notifId
router.delete('/notifications/:notifId', deleteNotification);

export default router;
