import express from 'express';
import { getDashboardStats, deleteUser } from '../controllers/adminController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/admin/stats', authMiddleware, adminMiddleware, getDashboardStats);

// Kullanıcı hesabını kuyruğa alarak asenkron siler — 202 Accepted döner
router.delete('/admin/users/:userId', authMiddleware, adminMiddleware, deleteUser);

export default router;
