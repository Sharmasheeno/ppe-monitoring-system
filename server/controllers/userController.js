const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.getUsers = async (req, res) => {
    try {
        // Supervisors strictly only see workers they created. Admins see all.
        let query = {};
        if (req.user.role === 'supervisor') {
            query = { createdBy: req.user.id };
        }
        const users = await User.find(query).select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        // Guard against self-deletion — you can't sign yourself out of existence.
        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ msg: 'You cannot delete your own account while logged in.' });
        }
        // Only the supervisor who created this user can delete them. Admins bypass this.
        if (req.user.role === 'supervisor') {
            if (user.createdBy && user.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ msg: 'Access denied: not your registered user.' });
            }
        }
        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: 'User removed' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

exports.updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        // Only the creating supervisor can update. Admins bypass this.
        if (req.user.role === 'supervisor') {
            if (user.createdBy && user.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ msg: 'Access denied: not your registered user.' });
            }
        }

        const { username, email, role, password } = req.body;

        // Enforce email uniqueness on update (skip when the email hasn't changed).
        if (email && email.trim().toLowerCase() !== (user.email || '').toLowerCase()) {
            const clash = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: user._id } });
            if (clash) return res.status(400).json({ msg: 'An account with this email already exists.' });
        }

        const updateFields = { username, role };
        if (email) updateFields.email = email.trim().toLowerCase();

        if (password) {
            // Enforce strong password on update too
            const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
            if (!strongPwd.test(password)) {
                return res.status(400).json({ msg: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.' });
            }
            const salt = await bcrypt.genSalt(10);
            updateFields.password = await bcrypt.hash(password, salt);
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id, 
            { $set: updateFields },
            { new: true }
        ).select('-password');
        
        res.json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { username, email, avatar, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const updateFields = {};
        if (username) updateFields.username = username.trim();
        if (email)    updateFields.email    = email.trim().toLowerCase();
        if (avatar)   updateFields.avatar   = avatar;

        // Password change
        if (newPassword) {
            if (!currentPassword) return res.status(400).json({ msg: 'Current password is required' });
            const valid = await require('bcryptjs').compare(currentPassword, user.password);
            if (!valid) return res.status(400).json({ msg: 'Current password is incorrect' });

            // Strong password check
            const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
            if (!strongPwd.test(newPassword)) {
                return res.status(400).json({ msg: 'New password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.' });
            }

            const salt = await require('bcryptjs').genSalt(10);
            updateFields.password = await require('bcryptjs').hash(newPassword, salt);
        }

        const updated = await User.findByIdAndUpdate(
            req.user.id, { $set: updateFields }, { new: true }
        ).select('-password');

        res.json(updated);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};
