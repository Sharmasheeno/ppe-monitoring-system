# Web dashboard — `client/`

React 19 + Vite + Tailwind CSS.

## Setup

```bash
npm ci
cp .env.example .env      # set VITE_API_URL
npm run dev               # dev server on :5173
npm run build             # produces dist/
```

## Structure

```
src/
├── main.jsx            # entrypoint
├── App.jsx             # route table
├── context/            # AuthContext (JWT + current user)
├── components/         # shared UI (Navbar, AdminLayout, Dashboard)
├── components/landing/ # marketing/landing components
├── pages/              # public pages (Home, Login, Signup, ...)
├── pages/Admin/        # admin pages (Dashboard, Users, Camera, ...)
└── utils/              # api.js wrapper around fetch
```

## Routing

`PrivateRoute` guards authenticated pages, `AdminRoute` further restricts to
admin/supervisor roles. All admin pages live under `pages/Admin/`.

## Build → deploy

`npm run build` outputs to `dist/`. In production this is copied into the
nginx web root at `/var/www/ppe-monitoring/`.
