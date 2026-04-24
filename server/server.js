// PPE Monitoring Server - v2 OTP Reset Flow
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const Aedes = require('aedes').Aedes;
const aedes = new Aedes();
const net = require('net');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const violationRoutes = require('./routes/violationRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const messageRoutes = require('./routes/messageRoutes');
const statusRoutes = require('./routes/statusRoutes');

// --- MQTT Broker Setup (Embedded Aedes Broker) ---
// The server acts only as an MQTT broker + publisher.
// It does NOT connect a local mqtt client (which caused connack timeout errors).
// Instead, aedes.publish() is used directly for server-side alert broadcasting.
// External clients (mobile app, dashboard) can subscribe to this broker on port 1883.
const mqttServer = net.createServer(aedes.handle);
const MQTT_PORT = 1883;

mqttServer.listen(MQTT_PORT, function () {
    console.log('✅ MQTT Broker started on port', MQTT_PORT);
});

aedes.on('publish', function (packet, client) {
    if (client) {
        console.log(`[MQTT] Client ${client.id} published to ${packet.topic}`);
    }
});

aedes.on('subscribe', function (subscriptions, client) {
    if (client) {
        console.log(`[MQTT] Client ${client.id} subscribed to`, subscriptions.map(s => s.topic));
    }
});

aedes.on('client', function (client) {
    console.log(`[MQTT] Client connected: ${client.id}`);
});

aedes.on('clientDisconnect', function (client) {
    console.log(`[MQTT] Client disconnected: ${client.id}`);
});

// --- Configuration ---
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ppe_monitoring';

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// Share globals across app.
// mqttClient is intentionally null — use aedesBroker.publish() directly for alerts.
app.set('io', io);
app.set('mqttClient', null);
app.set('aedesBroker', aedes);

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
});

// --- Register Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/status', statusRoutes);

// --- Database Connection ---
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('MongoDB connected');
        // Reset any stale online flags left over from the previous server session
        const User = require('./models/User');
        const reset = await User.updateMany({ isOnline: true }, { isOnline: false });
        if (reset.modifiedCount > 0)
            console.log(`✅ Reset ${reset.modifiedCount} stale online flag(s) from previous session`);

        // Drop legacy unique index on `username` — email is the unique identifier now.
        try {
            const indexes = await User.collection.indexes();
            if (indexes.some(i => i.name === 'username_1')) {
                await User.collection.dropIndex('username_1');
                console.log('✅ Dropped legacy unique index username_1 (username is no longer unique).');
            }
        } catch (e) {
            console.warn('[INDEX] Could not drop username_1:', e.message);
        }

        // Heartbeat watcher: mark workers offline if no heartbeat for 300 seconds (5 min)
        setInterval(async () => {
            try {
                const cutoff = new Date(Date.now() - 300 * 1000);
                const stale = await User.updateMany(
                    { isOnline: true, lastHeartbeat: { $lt: cutoff } },
                    { isOnline: false }
                );
                if (stale.modifiedCount > 0)
                    console.log(`[HEARTBEAT] Marked ${stale.modifiedCount} worker(s) offline — no heartbeat received`);
            } catch (e) { /* non-fatal */ }
        }, 60 * 1000);
    })
    .catch(err => console.error('MongoDB connection error:', err));

// --- Socket.io Connection ---
io.on('connection', (socket) => {
    console.log('New client connected');
    socket.on('disconnect', () => console.log('Client disconnected'));
});

// --- Start Server ---
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
