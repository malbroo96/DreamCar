# DreamCar Marketplace (MERN Starter)

## Structure

```text
DreamCar/
  backend/
    config/
    controllers/
    middleware/
    models/
    routes/
    server.js
  frontend/
    src/
      components/
      hooks/
      pages/
      services/
```

## Backend setup

1. `cd backend`
2. Copy `.env.example` to `.env`
3. Fill MongoDB and Cloudinary credentials
4. Add Google auth env vars (`GOOGLE_CLIENT_ID`, `APP_JWT_SECRET`, `ADMIN_EMAILS`)
5. Install deps: `npm install`
6. Run: `npm run dev`

Backend base URL: `http://localhost:5000/api`

### REST API

- `GET /api/cars`
- `GET /api/cars/:id`
- `POST /api/cars`
- `PUT /api/cars/:id`
- `DELETE /api/cars/:id`
- `GET /api/admin/cars`
- `PUT /api/admin/cars/:id`
- `DELETE /api/admin/cars/:id`

## Frontend setup

1. `cd frontend`
2. Install deps: `npm install`
3. Run: `npm run dev`

Frontend expects API at `/api` (proxied by Vite to `http://localhost:5000`).

Optional env override:

- `VITE_API_BASE_URL=http://localhost:5000/api`
- `VITE_GOOGLE_CLIENT_ID=<your-google-web-client-id>`

## Local and Live Environment Setup

Use either one shared Mongo URI or separate local/live URIs.

`backend/.env` for local:

```env
PORT=5000
MONGODB_URI_LOCAL=mongodb://127.0.0.1:27017/dreamcar
MONGODB_URI_PROD=
```

On Render (Environment variables):

- `MONGODB_URI=<your-atlas-uri>`
- or set `MONGODB_URI_PROD=<your-atlas-uri>` with `NODE_ENV=production`
- `GOOGLE_CLIENT_ID=<your-google-web-client-id>`
- `APP_JWT_SECRET=<strong-random-secret>`
- `ADMIN_EMAILS=<comma-separated-admin-google-emails>`
- `ALLOWED_ORIGINS=https://dreamcar-omega.vercel.app,http://localhost:5173`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
