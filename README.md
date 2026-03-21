# DreamCar Marketplace

MERN app for listing, browsing, and managing cars with Google sign-in and admin access control.

## Project Structure

```text
DreamCar/
  backend/
  frontend/
```

## Local Setup

### 1) Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000

# DB (use either MONGODB_URI, or LOCAL/PROD split)
MONGODB_URI_LOCAL=mongodb://127.0.0.1:27017/dreamcar
MONGODB_URI_PROD=

# Google auth
GOOGLE_CLIENT_ID=
APP_JWT_SECRET=
ADMIN_EMAILS=

# CORS
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,https://dreamcar-omega.vercel.app

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
DEFAULT_INSPECTION_PRICE=2499
PLATFORM_FEE_PERCENT=20

# Gemini (RC extraction)
GEMINI_API_KEY=
```

Run backend:

```bash
npm run dev
```

Backend base URL: `http://localhost:5000/api`

### 2) Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=
```

Run frontend:

```bash
npm run dev
```

## Google Authentication Setup

In Google Cloud Console (OAuth web client):

Authorized JavaScript origins:
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://dreamcar-omega.vercel.app`

Authorized redirect URIs:
- Not required for this current Google Identity Services credential flow.

## Deployment

### Backend (Render)

Service settings:
- Root Directory: `backend`
- Build Command: `npm ci`
- Start Command: `npm start`

Render environment variables:
- `MONGODB_URI` (recommended) or `MONGODB_URI_PROD`
- `GOOGLE_CLIENT_ID`
- `APP_JWT_SECRET`
- `ADMIN_EMAILS` (comma-separated)
- `ALLOWED_ORIGINS=https://dreamcar-omega.vercel.app,http://localhost:5173`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `DEFAULT_INSPECTION_PRICE`
- `PLATFORM_FEE_PERCENT`

### Frontend (Vercel)

Vercel environment variables:
- `VITE_API_BASE_URL=https://dreamcar-wvym.onrender.com/api`
- `VITE_GOOGLE_CLIENT_ID=<same GOOGLE_CLIENT_ID>`

Redeploy after changing env vars.

## Auth Behavior

- `/api/auth/google` exchanges Google credential for app JWT.
- Admin APIs require JWT + admin role.
- Car APIs currently require login.
- Regular users can update/delete only their own listings.
- Admin can manage all listings via `/api/admin/*`.
- Frontend routes for listing/viewing/selling cars require login.

## Troubleshooting

- `Route not found: /api/auth/google`
  - Backend is on an old deploy. Push latest code and redeploy Render.

- `VITE_GOOGLE_CLIENT_ID is missing`
  - Set `VITE_GOOGLE_CLIENT_ID` in Vercel/local frontend env and redeploy/restart.

- `Failed to create listing`
  - Verify frontend is calling Render API (`VITE_API_BASE_URL`) and not local `/api`.
  - Check backend logs for request errors.
