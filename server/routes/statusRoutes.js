const express = require('express');
const router = express.Router();

// In-memory live-state store. Not persisted (deliberate — this is real-time
// heartbeat data, not audit history). Map<workerId, { present, missing, personDetected, ts }>.
const live = new Map();
const STALE_MS = 8000;   // heartbeat older than this is "unknown"

// POST /api/status/live — AI engine heartbeat (no auth: same-machine call, matches violations POST pattern)
router.post('/live', (req, res) => {
    const { workerId, present, missing, personDetected } = req.body || {};
    if (!workerId) return res.status(400).json({ error: 'workerId required' });
    live.set(workerId, {
        present: Array.isArray(present) ? present : [],
        missing: Array.isArray(missing) ? missing : [],
        personDetected: !!personDetected,
        ts: Date.now(),
    });
    res.json({ ok: true });
});

// GET /api/status/live/:workerId — mobile app reads current safe/violation state
router.get('/live/:workerId', (req, res) => {
    const s = live.get(req.params.workerId);
    if (!s) return res.json({ known: false, reason: 'no_heartbeat_yet' });
    const age = Date.now() - s.ts;
    if (age > STALE_MS) return res.json({ known: false, reason: 'stale', ageMs: age });
    res.json({
        known: true,
        ageMs: age,
        personDetected: s.personDetected,
        present: s.present,
        missing: s.missing,
        safe: s.personDetected && s.missing.length === 0,
    });
});

module.exports = router;
