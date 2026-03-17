import express from 'express';
import { startAnalysis, getReport, deleteReport, updateAiPrompt } from '../controllers/aiController.js';

const router = express.Router();

// In a real app we'd require an auth middleware, like:
// import { protect, admin } from '../middlewares/authMiddleware.js';

// POST /api/ai/analysis
router.post('/ai/analysis', startAnalysis);

// GET /api/ai/reports/:reportId
router.get('/ai/reports/:reportId', getReport);

// DELETE /api/ai/reports/:reportId
router.delete('/ai/reports/:reportId', deleteReport);

// PUT /api/admin/ai/prompt
// Normally protected by admin middleware
router.put('/admin/ai/prompt', updateAiPrompt);

export default router;
