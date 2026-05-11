# Backend — `server/`

Node.js 18 + Express + MongoDB + Aedes MQTT + Socket.io.

## Setup

```bash
npm ci
cp .env.example .env      # fill in MONGO_URI, JWT_SECRET, MAIL_*
node server.js
```

Runs on `:5001` (REST + WebSocket) and `:1883` (MQTT).

## Structure

```
controllers/   # request handlers
routes/        # Express router definitions
models/        # Mongoose schemas
middleware/    # JWT auth + role gates
services/      # email service (nodemailer)
server.js      # entrypoint — wires Express + Aedes + Socket.io + MongoDB
seed.js        # dev-account seeder
test_mqtt.js   # publishes a synthetic violation for smoke-testing
```

## Environment variables (`.env`)

See `.env.example` for the complete list with descriptions.

## API reference

See [`docs/API.md`](../docs/API.md).
