const express = require('express');
const router = express.Router();
const violationController = require('../controllers/violationController');
const { authAdmin, authUser } = require('../middleware/auth');

// Workers (authUser) can read violations for alert polling
// Admin-only writes are handled by the AI engine directly (no auth on POST)
router.get('/', authUser, violationController.getViolations);
router.get('/worker/:workerId', authAdmin, violationController.getViolationsByUser);
router.post('/', violationController.postViolation);
router.patch('/:id/status', violationController.updateStatus);

module.exports = router;
