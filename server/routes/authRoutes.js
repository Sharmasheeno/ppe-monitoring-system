const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authUser } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authUser, authController.logout);
router.post('/heartbeat', authUser, authController.heartbeat);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
