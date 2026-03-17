import express from 'express';
import { listQuestions, addQuestion, updateQuestion, deleteQuestion } from '../controllers/questionController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/questions', listQuestions);
router.post('/admin/questions', authMiddleware, addQuestion);
router.put('/admin/questions/:questionId', authMiddleware, updateQuestion);
router.delete('/admin/questions/:questionId', authMiddleware, deleteQuestion);

export default router;
