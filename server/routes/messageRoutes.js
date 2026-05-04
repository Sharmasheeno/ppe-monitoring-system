const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authAdmin } = require('../middleware/auth');

// Public route to send a message
router.post('/', messageController.sendMessage);

// Protected routes for Admins only
router.get('/', authAdmin, messageController.getMessages);
router.delete('/:id', authAdmin, messageController.deleteMessage);

module.exports = router;
