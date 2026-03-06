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
4. Install deps: `npm install`
5. Run: `npm run dev`

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
