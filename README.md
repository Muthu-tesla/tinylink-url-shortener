# TinyLink — Production-Ready URL Shortener & Analytics

TinyLink is a high-performance, modern URL shortening SaaS application built with **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL**, **React (Vite + TypeScript)**, and resilient caching.

---

## Features

- **Instant URL Shortening**: Fast Base62 alphanumeric short code generation.
- **Custom Aliases**: Users can define memorable custom URLs with length and reserved-name validation.
- **Automated Link Expiration**: Set expiration presets (24 hours, 7 days, 30 days) or custom date/time. Expired links are safely deactivated.
- **Real-Time Click Tracking**: Every successful redirect automatically records visitor engagements in PostgreSQL.
- **Built-in QR Code Generator**: One-click in-browser QR code rendering with direct PNG download.
- **User Authentication & Dashboard**: JWT-secured registration and login with user-isolated URL management, search, and deletion.
- **Resilient Fallback**: Redis caching with automatic process-local in-memory fallback for rate limiting (100 req/min) and direct DB queries if Redis is offline.
- **Production Security**: SSRF loopback blocking, scheme validation (`http://` and `https://` only), bcrypt password hashing, and configurable CORS origins.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Modern Responsive CSS, QRCode |
| **Backend** | Python 3.12, FastAPI, Uvicorn, Pydantic v2 |
| **Database & ORM** | PostgreSQL, SQLAlchemy 2.0 (`psycopg` v3 driver) |
| **Auth & Security** | PyJWT (HS256), Passlib (Bcrypt), Proxy-aware Rate Limiter |
| **Hosting Target** | **Vercel** (Frontend), **Render** (Backend), **Neon / Supabase** (PostgreSQL) — ₹0 / month |

---

## Project Structure

```
├── main.py                     # FastAPI application & REST routes
├── database.py                 # SQLAlchemy engine, session maker, and health checker
├── models.py                   # User and URL SQLAlchemy database models
├── schemas.py                  # Pydantic request and response contracts
├── auth.py                     # JWT token issuance, verification, and bcrypt hashing
├── utils.py                    # Base62 encoder, alias validator, and URL safety checker
├── rate_limiter.py             # Rate limiter with Redis & thread-safe in-memory fallback
├── redis_client.py             # Resilient Redis client wrapper
├── migrate.py                  # Non-destructive, repeatable schema migration script
├── requirements.txt            # Python dependencies
├── Procfile                    # Render/Heroku start command
├── .env.example                # Backend environment variable template
├── tests/
│   ├── conftest.py             # Pytest configuration
│   ├── test_api.py             # Complete unit and API test suite (13 tests)
│   └── test_integration_e2e.py # Live HTTP cross-origin integration test suite
└── frontend/
    ├── index.html              # HTML entry point with SVG branding
    ├── package.json            # Node dependencies
    ├── vite.config.ts          # Vite configuration
    ├── vercel.json             # Vercel SPA routing configuration
    ├── .env.example            # Frontend environment variable template
    └── src/
        ├── api/client.ts       # Typed API client with auto JWT headers & error handling
        ├── context/AuthContext.tsx # Authentication session provider
        ├── components/         # Reusable UI components (Navbar, Hero, Dashboard, Modals, Toast)
        └── index.css           # Modern production CSS design system
```

---

## Local Development Setup

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- PostgreSQL running locally (or a free cloud database URI from Neon / Supabase)

### 2. Backend Setup
1. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create your `.env` configuration file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database credentials and a secure `JWT_SECRET_KEY`.
4. Run database migrations:
   ```bash
   python migrate.py
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
   API interactive documentation will be available at: **`http://127.0.0.1:8000/docs`**

### 3. Frontend Setup
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Create your `frontend/.env` file:
   ```bash
   cp .env.example .env
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open **`http://localhost:5173`** in your browser.

---

## Running Tests

Run the complete automated backend test suite:
```bash
python -m pytest tests/test_api.py -v
```

Run the live full-stack HTTP integration tests:
```bash
python tests/test_integration_e2e.py
```

Build the frontend for production:
```bash
cd frontend
npm run build
```

---

## Production Deployment Guide (100% Free Tier)

### Step 1: Create a Free Persistent Database (Neon or Supabase)
1. Go to [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com) and create a free PostgreSQL project.
2. Copy the connection string.
3. Replace the driver prefix with `postgresql+psycopg://` if needed:
   `postgresql+psycopg://user:password@ep-xyz.neon.tech/neondb?sslmode=require`

### Step 2: Deploy Backend to Render (Free Web Service)
1. Push your repository to **GitHub**.
2. Log into [Render.com](https://render.com) and select **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python migrate.py && uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   - `DATABASE_URL`: Your cloud PostgreSQL connection string.
   - `JWT_SECRET_KEY`: A cryptographically secure random 32+ character string.
   - `CORS_ORIGINS`: Your Vercel frontend URL (e.g. `https://your-tinylink.vercel.app`).
   - `BASE_SHORT_URL`: Your Render backend URL (e.g. `https://your-tinylink-api.onrender.com`).
   - `TRUST_PROXY_HEADERS`: `true`
6. Click **Deploy Web Service**. Once deployed, copy your Render public URL.

### Step 3: Deploy Frontend to Vercel (Free Hobby Plan)
1. Log into [Vercel.com](https://vercel.com) and click **Add New** -> **Project**.
2. Import your GitHub repository.
3. Configure the project:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL`: Your Render backend URL from Step 2 (e.g. `https://your-tinylink-api.onrender.com`).
5. Click **Deploy**.

---

## Environment Variables Reference

### Backend (`.env`)
| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | Local PostgreSQL | Connection string using SQLAlchemy + psycopg3 |
| `JWT_SECRET_KEY` | Yes | Dev Fallback | Secret key used to sign and verify user JWTs |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `10080` (7 days) | Token lifespan |
| `CORS_ORIGINS` | Yes in Prod | `http://localhost:5173,...` | Comma-separated allowed frontend origins |
| `BASE_SHORT_URL` | Yes in Prod | `request.base_url` | Public base URL for generated short links |
| `TRUST_PROXY_HEADERS` | No | `false` | Enable when running behind Render/Cloudflare |
| `RATE_LIMIT_MAX` | No | `100` | Maximum requests per window |
| `RATE_LIMIT_WINDOW_SECONDS` | No | `60` | Rate limit window in seconds |
| `REDIS_URL` | No | None | Optional managed Redis connection string |

### Frontend (`frontend/.env`)
| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | Yes | `http://localhost:8000` | Backend API base URL |
