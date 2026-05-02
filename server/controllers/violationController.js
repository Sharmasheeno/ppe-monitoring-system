const Violation = require('../models/Violation');

const debounceCache = {};
const DEBOUNCE_TIME_MS = 5000;

function sendFCMNotification(violation) {
    console.log(`[FCM-MOCK] Sending push notification for ${violation.violationType}`);
}

exports.getViolations = async (req, res) => {
    try {
        const User = require('../models/User');
        let query = {};

        if (req.user.role === 'user') {
            // Workers only see violations assigned to their own workerId
            const me = await User.findById(req.user.id);
            if (me && me.workerId) {
                query = { workerId: me.workerId };
            } else {
                return res.json([]); // No workerId → no violations
            }
        } else if (req.user.role === 'supervisor') {
            // Supervisors see their workers' violations
            const myWorkers = await User.find({ createdBy: req.user.id });
            const myWorkerIds = myWorkers.map(w => w.workerId).filter(id => id);
            query = { workerId: { $in: myWorkerIds } };
        }
        // Admin: query stays {} → sees all

        const violations = await Violation.find(query)
            .sort({ timestamp: -1 })
            .limit(500);

        res.json(violations);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.postViolation = async (req, res) => {
    try {
        const { violationType, imageUrl, confidence, location } = req.body;

        // Assign violation to the most recently logged-in online worker
        const User = require('../models/User');
        const onlineWorker = await User.findOne(
            { role: 'user', isOnline: true, workerId: { $exists: true } },
            null,
            { sort: { lastLoginAt: -1 } }
        );
        // Fallback: most recently active worker even if not marked online
        const fallbackWorker = !onlineWorker
            ? await User.findOne({ role: 'user', workerId: { $exists: true } }, null, { sort: { lastLoginAt: -1 } })
            : null;

        const assignedWorkerId = (onlineWorker || fallbackWorker)?.workerId || null;

        const now = Date.now();
        const lastTime = debounceCache[violationType];
        if (lastTime && (now - lastTime < DEBOUNCE_TIME_MS)) {
            console.log(`Debounced ${violationType} alert.`);
            return res.status(200).json({ message: 'Debounced' });
        }
        debounceCache[violationType] = now;

        const newViolation = new Violation({
            violationType,
            imageUrl,
            confidence: Number(confidence) || 0.99,
            location,
            timestamp: now,
            workerId: assignedWorkerId,
            status: 'Pending Review'
        });
        const savedViolation = await newViolation.save();

        const io = req.app.get('io');
        if (io) {
            io.emit('new_violation', savedViolation);
            console.log(`Violation emitted via Socket: ${violationType}`);
        }

        const aedesBroker = req.app.get('aedesBroker');
        const alertMessage = JSON.stringify({
            title: "Safety Violation Detected!",
            body: `${violationType} detected at ${location}`,
            type: violationType,
            timestamp: new Date().toISOString()
        });

        // Publish directly via Aedes (no local mqtt client needed).
        // Any external MQTT subscriber on ppe/alerts will receive this instantly.
        if (aedesBroker) {
            aedesBroker.publish({
                topic: 'ppe/alerts',
                payload: Buffer.from(alertMessage),
                qos: 0,
                retain: false
            }, (err) => {
                if (err) console.error('[MQTT] Aedes publish error:', err);
                else console.log(`[MQTT] Alert published → ppe/alerts: ${violationType}`);
            });
        }

        sendFCMNotification(savedViolation);
        res.status(201).json(savedViolation);
    } catch (err) {
        console.error('Error saving violation:', err);
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updated = await Violation.findByIdAndUpdate(id, { status }, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.getViolationsByUser = async (req, res) => {
    try {
        const { workerId } = req.params;
        // Only return the most recent snapshots (each carries a base64 image ~53KB).
        // Sending every record was ~200MB for heavy workers and hung the page.
        // Total/resolved counts are computed server-side so the stat cards stay accurate.
        const RECENT = 40;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [violations, total, resolved, recentUnresolved] = await Promise.all([
            Violation.find({ workerId }).sort({ timestamp: -1 }).limit(RECENT),
            Violation.countDocuments({ workerId }),
            Violation.countDocuments({ workerId, status: 'Resolved' }),
            // Score is driven by UNRESOLVED violations in the last 30 days, so
            // resolving a case actually raises the worker's score.
            Violation.countDocuments({ workerId, timestamp: { $gte: thirtyDaysAgo }, status: { $ne: 'Resolved' } }),
        ]);
        const score = Math.max(0, 100 - recentUnresolved * 5);
        res.json({ violations, total, resolved, violations30d: recentUnresolved, score });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
};
