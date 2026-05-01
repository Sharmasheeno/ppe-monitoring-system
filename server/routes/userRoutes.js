const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authAdmin, authUser } = require('../middleware/auth');

router.get('/me', authUser, userController.getMe);
router.patch('/profile', authUser, userController.updateProfile);
router.get('/', authAdmin, userController.getUsers);
router.put('/:id', authAdmin, userController.updateUser);
router.delete('/:id', authAdmin, userController.deleteUser);

// Internal endpoint — called by the AI engine to check if any worker is logged in.
// No auth required (AI engine is on the same machine, port 5001 is local-only).
router.get('/online-workers', async (req, res) => {
    try {
        const User = require('../models/User');
        // A worker only counts as ONLINE if their app sent a heartbeat recently.
        // So closing the app (even without an explicit logout) turns the camera off.
        const cutoff = new Date(Date.now() - 45 * 1000);
        const workers = await User.find(
            { role: 'user', isOnline: true, workerId: { $exists: true }, lastHeartbeat: { $gte: cutoff } },
            'workerId username'
        );
        res.json({ count: workers.length, workers });
    } catch (err) {
        res.status(500).json({ count: 0, workers: [] });
    }
});

module.exports = router;
