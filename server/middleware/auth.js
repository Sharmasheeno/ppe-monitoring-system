const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

// Verify a JWT AND re-check that the user record still exists.
// If an admin deleted the account while the session was live, the next
// request from that session is rejected here (401 → the client interceptor
// clears storage and bounces the user to /login).
async function verify(req, res) {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : req.header('x-auth-token');
    if (!token) {
        res.status(401).json({ msg: 'No token, authorization denied' });
        return null;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const uid = decoded.user && decoded.user.id;
        if (!uid) {
            res.status(401).json({ msg: 'Token is not valid' });
            return null;
        }
        // DB check: has the account been deleted since login?
        const exists = await User.exists({ _id: uid });
        if (!exists) {
            res.status(401).json({ msg: 'Account no longer exists', code: 'ACCOUNT_DELETED' });
            return null;
        }
        return decoded.user;
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
        return null;
    }
}

const authUser = async (req, res, next) => {
    const user = await verify(req, res);
    if (!user) return;
    req.user = user;
    next();
};

const authAdmin = async (req, res, next) => {
    const user = await verify(req, res);
    if (!user) return;
    if (user.role !== 'admin' && user.role !== 'supervisor') {
        return res.status(403).json({ msg: 'Access denied: Dashboard Supervisor or Admin permissions required' });
    }
    req.user = user;
    next();
};

module.exports = { authUser, authAdmin };
