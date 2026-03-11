const express = require('express');
const router = express.Router();
const attemptController = require('../controllers/attemptController');
const { verifyToken } = require('../middleware/authMiddleware');

// New Endpoint for AI Recommendations
router.get('/recommendations', verifyToken, attemptController.getRecommendations);
router.get('/:attempt_id/analysis', verifyToken, attemptController.getAttemptAnalysis); // NEW

router.post('/start', verifyToken, attemptController.startAttempt);
router.post('/answer', verifyToken, attemptController.submitAnswer);
router.post('/complete', verifyToken, attemptController.completeAttempt);

router.get('/admin/stats', verifyToken, attemptController.getAdminStats);
router.post('/submit', verifyToken, attemptController.submitAttempt);
router.post('/mint-certificate', verifyToken, attemptController.mintCertificate);
router.get('/my-attempts', verifyToken, attemptController.getUserAttempts);
router.get('/leaderboard/:quiz_id', verifyToken, attemptController.getLeaderboard);

router.get('/verify/:identifier', attemptController.verifyCredential); // Public route (no verifyToken)? Or verifyToken if admin only? 
// User asked "entered by the admin", so verifyToken is safer.
router.get('/verify/:identifier', verifyToken, attemptController.verifyCredential);

module.exports = router;
