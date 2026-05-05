const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Violation = require('../models/Violation');
const { authUser } = require('../middleware/auth');

/**
 * GET /api/scores
 * Returns a PPE Compliance Score (0-100) for each worker visible to the requesting supervisor.
 * Formula: score = max(0, 100 - violations_last_30_days * 5)
 */
router.get('/', authUser, async (req, res) => {
    try {
        const workers = await User.find({
            role: 'user',
            $or: [{ createdBy: req.user.id }, { createdBy: null }]
        }).select('-password');

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const scores = await Promise.all(workers.map(async (worker) => {
            const recentViolations = await Violation.countDocuments({
                workerId: worker.workerId,
                timestamp: { $gte: thirtyDaysAgo },
                status: { $ne: 'Resolved' }
            });

            const score = Math.max(0, 100 - recentViolations * 5);
            let grade = 'Excellent';
            if (score < 60) grade = 'Critical';
            else if (score < 80) grade = 'Warning';

            return {
                _id: worker._id,
                username: worker.username,
                workerId: worker.workerId,
                email: worker.email,
                score,
                grade,
                violations30d: recentViolations,
            };
        }));

        res.json(scores);
    } catch (err) {
        console.error('[SCORE ERROR]', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
