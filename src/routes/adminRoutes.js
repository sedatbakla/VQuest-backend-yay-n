import express from 'express';
import { getDashboardStats } from '../controllers/adminController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/admin/stats', authMiddleware, adminMiddleware, getDashboardStats);

export default router;
