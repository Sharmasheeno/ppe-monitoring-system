/**
 * seed.js — PPE Monitoring System
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE
 *   Upserts the default demo / thesis users into MongoDB.
 *   Safe to re-run at any time — existing workers / violations are NOT deleted.
 *
 * USAGE
 *   cd server
 *   node seed.js
 *
 * CUSTOMISATION
 *   Edit the USERS array below to change usernames, emails, passwords or roles.
 *   Roles:  'admin'  →  Web Dashboard (full access)
 *           'user'   →  Mobile App    (worker, limited access)
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/User');

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ppe_monitoring';

// ─────────────────────────────────────────────────────────────────────────────
//  ✏️  EDIT HERE — Default Users
//  Change any username / email / password / role value below, then re-run the
//  script.  The script uses "upsert" logic so it will UPDATE existing accounts
//  rather than duplicate them.
// ─────────────────────────────────────────────────────────────────────────────
const USERS = [
    // ── Full Admin Account (role: 'admin') — Web Dashboard, full access ──────
    {
        username: 'admin',
        email:    'admin@sentinel.com',
        password: 'admin123',          // ← change login password here
        role:     'admin',
    },

    // ── Supervisor Account (role: 'supervisor') — Web Dashboard, limited mgmt ─
    {
        username: 'supervisor',
        email:    'supervisor@sentinel.com',
        password: 'super123',          // ← change login password here
        role:     'supervisor',
    },

    // ── Mobile App / Worker Account (role: 'user') ───────────────────────────
    {
        username: 'worker_john',
        email:    'worker@sentinel.com',
        password: 'worker123',         // ← change login password here
        role:     'user',
    },
];

// ─── Helper ──────────────────────────────────────────────────────────────────
function pad(str, len) {
    return String(str).padEnd(len);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('\n✅  MongoDB connected →', MONGO_URI);
    console.log('═══════════════════════════════════════════════════════════\n');

    const results = [];

    for (const data of USERS) {
        // Hash the plaintext password BEFORE writing so the pre-save hook
        // (which also hashes) does NOT double-hash the password.
        const hashedPassword = await bcrypt.hash(data.password, 10);

        const existing = await User.findOne({ username: data.username });

        if (existing) {
            // UPDATE — overwrite email, password and role; keep other fields intact.
            // Use updateOne (raw) to skip the pre-save hook (avoid double-hash).
            await User.updateOne(
                { _id: existing._id },
                { $set: { email: data.email, password: hashedPassword, role: data.role } }
            );
            results.push({ action: 'UPDATED', ...data });
            console.log('  🔄  UPDATED  →', data.username);
        } else {
            // INSERT — create via insertOne to bypass the pre-save hook.
            // Build doc conditionally: omit workerId for admin/supervisor roles
            // because the sparse unique index treats explicit `null` as a key conflict.
            const doc = {
                username:        data.username,
                email:           data.email,
                password:        hashedPassword,
                role:            data.role,
                avatar:          '',
                createdBy:       null,
                createdAt:       new Date(),
                isOnline:        false,
                lastLoginAt:     null,
                resetCode:       null,
                resetCodeExpiry: null,
                lastHeartbeat:   null,
            };
            if (data.role === 'user') {
                doc.workerId = 'WKR-' + Math.floor(1000 + Math.random() * 9000);
            }
            await User.collection.insertOne(doc);
            results.push({ action: 'CREATED', ...data });
            console.log('  ✨  CREATED  →', data.username);
        }
    }

    // ── Summary Table ─────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  LOGIN CREDENTIALS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');

    const adminUsers      = results.filter(u => u.role === 'admin');
    const supervisorUsers = results.filter(u => u.role === 'supervisor');
    const mobileUsers     = results.filter(u => u.role === 'user');

    function printGroup(users) {
        users.forEach(u => {
            console.log('  ' + pad(u.action, 8) + '  Username : ' + u.username);
            console.log('           Email    : ' + u.email);
            console.log('           Password : ' + u.password);
            console.log('           Role     : ' + u.role);
            console.log('  ───────────────────────────────────────────');
        });
    }

    if (adminUsers.length) {
        console.log('\n  🖥️   WEB DASHBOARD — ADMIN  (http://localhost:5173)');
        console.log('  ───────────────────────────────────────────');
        printGroup(adminUsers);
    }

    if (supervisorUsers.length) {
        console.log('\n  🖥️   WEB DASHBOARD — SUPERVISOR  (http://localhost:5173)');
        console.log('  ───────────────────────────────────────────');
        printGroup(supervisorUsers);
    }

    if (mobileUsers.length) {
        console.log('\n  📱  MOBILE APP — WORKER');
        console.log('  ───────────────────────────────────────────');
        printGroup(mobileUsers);
    }

    console.log('\n  ✅  Done. You can now log in with the credentials above.\n');
    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => {
    console.error('\n❌  Seed failed:', err.message);
    process.exit(1);
});
