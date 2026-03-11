const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.post('/generate', verifyToken, isAdmin, quizController.generateQuizFromAI);
router.get('/', verifyToken, quizController.getAllQuizzes);
router.get('/:id', verifyToken, quizController.getQuizById);
router.post('/', verifyToken, isAdmin, quizController.createQuiz);
router.put('/:id', verifyToken, isAdmin, quizController.updateQuiz);
router.post('/:quiz_id/question', verifyToken, isAdmin, quizController.addQuestion);
router.get('/:id/next', verifyToken, quizController.getNextAdaptiveQuestion);

module.exports = router;
