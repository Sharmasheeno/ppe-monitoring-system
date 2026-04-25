const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    // Username is NOT unique — the same display name may exist under
    // different roles (e.g. worker "Ali" and supervisor "Ali").
    username: { type: String, required: true },
    // Email is the globally-unique identifier.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'supervisor', 'admin'], default: 'user' },
    workerId: { type: String, unique: true, sparse: true },
    avatar: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now },
    isOnline: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    resetCode: { type: String, default: null },
    resetCodeExpiry: { type: Date, default: null },
    lastHeartbeat: { type: Date, default: null },
});

UserSchema.pre('save', async function () {
    // Fallback workerId generation (controller handles it first, this is a safety net)
    if (this.isNew && this.role === 'user' && !this.workerId) {
        this.workerId = `WKR-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    // Only hash password if it was changed
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    // NO next() call — Mongoose 6+ async hooks resolve via the returned promise
});

module.exports = mongoose.model('User', UserSchema);
