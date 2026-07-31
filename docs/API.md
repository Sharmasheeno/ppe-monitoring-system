# REST API reference

Base URL (dev): `http://localhost:5001`
Base URL (prod): `http://169.58.7.143`

All authenticated endpoints require `Authorization: Bearer <JWT>` header.

## Auth

### `POST /api/auth/login`
Body: `{ email, password }` → `{ token, user }`

### `POST /api/auth/signup` *(admin only)*
Body: `{ email, password, role, workerId? }` → `{ user }`

### `POST /api/auth/forgot-password`
Body: `{ email }` → `{ message }` (sends reset email)

### `POST /api/auth/reset-password`
Body: `{ token, newPassword }` → `{ message }`

## Users

### `GET /api/users` *(admin/supervisor)*
→ `[ { _id, email, role, workerId, ... } ]`

### `POST /api/users` *(admin)*
Body: `{ email, password, role, workerId? }` → `{ user }`

### `PATCH /api/users/:id` *(admin)*
### `DELETE /api/users/:id` *(admin)*

## Violations

### `POST /api/violations` *(AI engine only)*
Body: `{ workerId, missing: ["Helmet","Vest"], snapshot, timestamp }` → `{ violation }`

### `GET /api/violations` *(supervisor+)*
Query: `?workerId=&from=&to=&resolved=`

### `PATCH /api/violations/:id/resolve` *(supervisor+)*

## Scores

### `GET /api/scores/:workerId`
Returns the 30-day rolling compliance score: `max(0, 100 - 5 * unresolvedCount)`

## Messages

### `POST /api/messages` *(public)*
Contact-form submissions.

### `GET /api/messages` *(admin/supervisor)*

## MQTT topics

- `ppe/alerts/<workerId>` — one message per violation, payload matches `POST /api/violations` body.
- `ppe/heartbeat` — 30-s heartbeat from AI engine.
