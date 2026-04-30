const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

// Strong password regex: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Determine if request comes from an authenticated supervisor via Dashboard
        let createdBy = null;
        let isSupervisorCreator = false;
        let decodedUserRole = null;
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
                if (decoded.user && (decoded.user.role === 'admin' || decoded.user.role === 'supervisor')) {
                    createdBy = decoded.user.id;
                    isSupervisorCreator = true;
                    decodedUserRole = decoded.user.role;
                }
            } catch (e) { /* public registration */ }
        }

        const requestedRole = req.body.role || 'user';
        const finalRole = isSupervisorCreator ? requestedRole : 'supervisor';

        // STRICT RBAC: Supervisors cannot create supervisors or admins
        if (isSupervisorCreator && decodedUserRole === 'supervisor') {
            if (finalRole === 'admin' || finalRole === 'supervisor') {
                return res.status(403).json({ msg: 'Unauthorized: Supervisors are strictly forbidden from creating other Supervisors or Admins.' });
            }
        }

        // STRICT RBAC: Admins cannot create Site Workers
        if (isSupervisorCreator && decodedUserRole === 'admin') {
            if (finalRole === 'user') {
                return res.status(403).json({ msg: 'Unauthorized: Admins cannot create Site Workers. Only Site Supervisors can create workers.' });
            }
        }

        if (!username || !email || !password)
            return res.status(400).json({ msg: 'All fields are required.' });

        // Strong password check
        if (!STRONG_PASSWORD_REGEX.test(password)) {
            return res.status(400).json({ msg: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol (e.g. @, #, !).' });
        }

        // Email is the unique identifier — same display name may exist under
        // different roles, so username duplicates are allowed on purpose.
        const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingEmail)
            return res.status(400).json({ msg: 'An account with this email already exists.' });

        // Generate unique workerId ONLY for site workers (not supervisors/admins)
        let workerId = null;
        if (finalRole === 'user') {
            for (let i = 0; i < 10; i++) {
                const candidate = `WKR-${Math.floor(1000 + Math.random() * 9000)}`;
                const taken = await User.findOne({ workerId: candidate });
                if (!taken) { workerId = candidate; break; }
            }
            if (!workerId)
                return res.status(500).json({ msg: 'Could not generate worker ID. Please try again.' });
        }

        const user = new User({
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password,
            role: finalRole,
            ...(workerId && { workerId }),  // Only include workerId if it was generated
            createdBy,
        });
        await user.save();

        const token = jwt.sign({ user: { id: user.id, role: user.role } }, JWT_SECRET, { expiresIn: 36000 });
        return res.json({
            token,
            user: { id: user.id, username: user.username, role: user.role, workerId: user.workerId },
        });
    } catch (err) {
        console.error('[REGISTER ERROR]', err.message || err);
        return res.status(500).json({ msg: 'Server error. Please try again.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        // The "username" field on the login form accepts either the display
        // name or the email address. Because display names are no longer
        // unique, we match by email first (guaranteed unique) then fall back
        // to username. If several accounts share the display name, we try
        // each with the supplied password so the correct one wins.
        const identifier = (username || '').trim();
        const asEmail = identifier.toLowerCase();
        let user = await User.findOne({ email: asEmail });
        let candidates = user ? [user] : await User.find({ username: identifier });
        if (!candidates.length) return res.status(401).json({ msg: 'Invalid Credentials' });

        user = null;
        for (const c of candidates) {
            // eslint-disable-next-line no-await-in-loop
            if (await bcrypt.compare(password, c.password)) { user = c; break; }
        }
        if (!user) return res.status(401).json({ msg: 'Invalid Credentials' });

        // Force generate workerId if it is somehow missing
        if ((!user.workerId || user.workerId === 'undefined') && user.role === 'user') {
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            user.workerId = `WKR-${randomNum}`;
            // Use updateOne to skip the pre-save hook (avoids re-hashing password)
            await User.updateOne({ _id: user._id }, { workerId: user.workerId });
        }

        // Mark worker as online — use updateOne to skip pre-save hook entirely
        await User.updateOne(
            { _id: user._id },
            { isOnline: true, lastLoginAt: new Date(), lastHeartbeat: new Date() }
        );

        const payload = { user: { id: user.id, role: user.role, workerId: user.workerId } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: 36000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, username: user.username, role: user.role, workerId: user.workerId || 'No ID' } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.logout = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (userId) {
            await User.findByIdAndUpdate(userId, { isOnline: false });
        }
        res.json({ msg: 'Logged out successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'No account found with that email address.' });

        // Generate 6-digit OTP code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        user.resetCode = code;
        user.resetCodeExpiry = expiry;
        await user.save();

        const result = await emailService.sendResetCode(email, code, user.username);
        if (result.error) return res.status(500).json({ msg: result.error });

        res.json({ msg: 'Reset code sent to email', preview: result.preview });
    } catch (err) {
        console.error('[FORGOT PASSWORD ERROR]', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.verifyResetCode = async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findOne({ email });
        if (!user || !user.resetCode) return res.status(400).json({ msg: 'Invalid request.' });
        if (user.resetCode !== code) return res.status(400).json({ msg: 'Incorrect code. Please try again.' });
        if (new Date() > user.resetCodeExpiry) return res.status(400).json({ msg: 'Code has expired. Please request a new one.' });

        res.json({ msg: 'Code verified successfully.' });
    } catch (err) {
        console.error('[VERIFY CODE ERROR]', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.heartbeat = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (userId) {
            await User.updateOne(
                { _id: userId },
                { isOnline: true, lastHeartbeat: new Date() }
            );
        }
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
            return res.status(400).json({ msg: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.' });
        }

        const user = await User.findOne({ email });
        if (!user || !user.resetCode) return res.status(400).json({ msg: 'Invalid reset request.' });
        if (user.resetCode !== code) return res.status(400).json({ msg: 'Invalid code.' });
        if (new Date() > user.resetCodeExpiry) return res.status(400).json({ msg: 'Code has expired. Please request a new one.' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetCode = null;
        user.resetCodeExpiry = null;
        await user.save();

        res.json({ msg: 'Password updated successfully.' });
    } catch (err) {
        console.error('[RESET PASSWORD ERROR]', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};
