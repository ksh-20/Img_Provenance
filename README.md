# 🔍 FakeLineage

> **Image Provenance Graph Construction for Deepfake-Aware Social Media Forensics**

FakeLineage is a full-stack research platform that traces the origin and spread of manipulated images across social networks. It combines deepfake detection, perceptual hashing, ELA forensics, steganography scanning, and interactive provenance graph visualization — all within a modern glassmorphism UI powered by FastAPI and React.

---

## ✨ Features

| Feature                         | Description                                                            |
| ------------------------------- | ---------------------------------------------------------------------- |
| 🤖 **Deepfake Detection**       | Multi-signal ensemble (GAN artifacts, face-swap, noise analysis, ELA)  |
| 🗺 **Provenance Graph**         | Interactive lineage graph built with NetworkX + React Flow             |
| 🔍 **ELA Heatmaps**             | Error Level Analysis heatmap with thermal colour mapping               |
| 📡 **Social Spread Simulation** | Viral propagation simulation across Twitter, Instagram, TikTok, Reddit |
| 🔐 **Steganography Scan**       | LSB (Least Significant Bit) anomaly detection for hidden data          |
| 📋 **Forensics Report**         | Chain-of-custody report with JSON export                               |
| 🛡 **JWT Authentication**       | Secure register/login flow with bcrypt passwords                       |
| 🗄 **MySQL Persistence**        | All analyses, provenance graphs, and social spreads stored per user    |
| 📦 **Batch Analysis**           | Queue multiple images for parallel forensic processing                 |

---

## 🏗 Architecture

```
Image Provenance/
├── backend/                    # FastAPI Python backend
│   ├── main.py                 # App entry point, CORS, router registration
│   ├── database.py             # SQLAlchemy engine + get_db() dependency
│   ├── .env                    # Environment variables (MySQL URL, JWT secret)
│   ├── models/
│   │   ├── schemas.py          # Pydantic request/response models
│   │   └── db_models.py        # ORM: users, analyses, provenance_graphs, social_spreads
│   ├── routers/
│   │   ├── auth.py             # POST /register, POST /login, GET /me
│   │   ├── analysis.py         # POST /upload, POST /analyze/{id}
│   │   ├── provenance.py       # GET /graph/{id}
│   │   ├── social.py           # GET /spread/{id}
│   │   └── reports.py          # GET /{id}, GET /dashboard/stats
│   └── services/
│       ├── auth_service.py     # bcrypt hashing, JWT encode/decode
│       ├── deepfake.py         # Multi-signal deepfake detection pipeline
│       ├── forensics.py        # ELA, manipulation region detection
│       ├── hashing.py          # pHash, dHash, aHash similarity
│       ├── metadata.py         # EXIF extraction, GPS parsing, steganography
│       ├── graph.py            # Provenance graph construction (NetworkX)
│       └── social.py           # Social spread simulation
│
└── frontend/                   # React + TypeScript + Tailwind CSS
    └── src/
        ├── api/client.ts       # Axios instance + auth interceptors + typed API calls
        ├── store/
        │   ├── appStore.ts     # Zustand app-level state (analysis session)
        │   └── authStore.ts    # Zustand auth state (token, user) persisted to localStorage
        ├── components/
        │   ├── Auth/           # ProtectedRoute
        │   ├── Layout/         # Sidebar (user info + logout), Layout (Outlet)
        │   ├── Upload/         # ImageDropzone (drag-and-drop)
        │   ├── Analysis/       # ScoreBar, RadialGauge, VerdictCard, ScoreBreakdown
        │   ├── Forensics/      # ELACanvas, ELAViewer, MetadataPanel
        │   ├── Graph/          # ProvenanceNode, GraphStats, GraphLegend
        │   └── Reports/        # ReportSummary, EvidenceList, ChainOfCustody, ScoreRings
        ├── pages/
        │   ├── Login.tsx       # Auth: login form
        │   ├── Register.tsx    # Auth: register with password strength indicator
        │   ├── Dashboard.tsx   # Overview stats + feature highlights
        │   ├── Analysis.tsx    # Upload → analyze → ELA + metadata
        │   ├── ProvenanceGraph.tsx  # Interactive React Flow lineage graph
        │   ├── SocialTracker.tsx    # Viral spread charts (Recharts)
        │   ├── BatchAnalysis.tsx    # Multi-image queue processing
        │   ├── ForensicsReport.tsx  # Full chain-of-custody report
        │   └── Settings.tsx         # Thresholds, API config, toggles
        └── types/index.ts      # Shared TypeScript types
```

---

## ⚙️ Prerequisites

| Tool    | Version |
| ------- | ------- |
| Python  | 3.11+   |
| Node.js | 18+     |
| MySQL   | 8.0+    |
| pip     | latest  |
| npm     | 9+      |

---

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/ksh-20/Img_Provenance.git
cd Img_Provenance
```

### 2. MySQL setup

```sql
-- In MySQL shell or Workbench:
CREATE DATABASE fakelineage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> Tables are **auto-created** by SQLAlchemy on first backend startup — no migrations needed.

### 3. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

**Update `backend/.env`:**

```env
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/fakelineage
SECRET_KEY=change-this-to-a-random-string-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

**Start the backend:**

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🔑 Authentication Flow

```
Register (/register) ──→ POST /api/auth/register ──→ JWT token → stored in localStorage
Login    (/login)    ──→ POST /api/auth/login    ──→ JWT token → stored in localStorage
All protected routes ──→ Axios interceptor injects "Authorization: Bearer <token>"
401 response         ──→ Auto-logout + redirect to /login
```

**Endpoints:**

| Method | Endpoint             | Description                                |
| ------ | -------------------- | ------------------------------------------ |
| `POST` | `/api/auth/register` | Register new user (JSON body)              |
| `POST` | `/api/auth/login`    | Login with email + password (form-encoded) |
| `GET`  | `/api/auth/me`       | Get current user profile + analysis count  |
| `POST` | `/api/auth/logout`   | Client-side logout signal                  |

---

## 📡 API Reference

### Images

| Method | Endpoint                         | Description                                 |
| ------ | -------------------------------- | ------------------------------------------- |
| `POST` | `/api/images/upload`             | Upload image (multipart/form-data)          |
| `POST` | `/api/images/analyze/{image_id}` | Run full deepfake + ELA + metadata analysis |
| `GET`  | `/api/images/{image_id}`         | Get image info + perceptual hashes          |
| `GET`  | `/api/images/ela/{image_id}`     | Get ELA heatmap array                       |

### Provenance

| Method | Endpoint                               | Description                       |
| ------ | -------------------------------------- | --------------------------------- |
| `GET`  | `/api/provenance/graph/{image_id}`     | Build and return provenance graph |
| `GET`  | `/api/provenance/integrity/{image_id}` | Get chain integrity score         |

### Social

| Method | Endpoint                        | Description                            |
| ------ | ------------------------------- | -------------------------------------- |
| `GET`  | `/api/social/spread/{image_id}` | Simulate viral spread across platforms |

### Reports

| Method | Endpoint                       | Description                    |
| ------ | ------------------------------ | ------------------------------ |
| `GET`  | `/api/reports/{image_id}`      | Generate full forensics report |
| `GET`  | `/api/reports/dashboard/stats` | Aggregate dashboard statistics |

### Health

```bash
curl http://localhost:8000/health
# {"status":"healthy","service":"FakeLineage","database":"connected"}
```

---

## 📊 Database Schema

```
users
├── id (PK)
├── username (unique)
├── email (unique)
├── hashed_password
├── is_active
├── created_at
└── last_login

analyses
├── id (PK)
├── user_id (FK → users)
├── image_id, filename, file_size, image_width, image_height, image_format
├── verdict, deepfake_score, gan_score, ela_score, face_swap_score, is_deepfake
├── has_exif, camera_make, camera_model, stego_detected, suspicious_flags (JSON)
└── analyzed_at

provenance_graphs
├── id (PK), user_id (FK → users), image_id
├── node_count, edge_count, integrity_score, spread_depth, chain_broken
└── created_at

social_spreads
├── id (PK), user_id (FK → users), image_id
├── total_reach, viral_coefficient, platforms (JSON), bot_ratio
└── created_at
```

---

## 🖥 Pages Overview

| Page             | Route         | Description                                  |
| ---------------- | ------------- | -------------------------------------------- |
| Login            | `/login`      | Email + password sign-in                     |
| Register         | `/register`   | Account creation with strength indicator     |
| Dashboard        | `/`           | Stats overview, feature cards                |
| Image Analysis   | `/analysis`   | Upload → detect → ELA → metadata             |
| Provenance Graph | `/provenance` | Interactive BFS lineage graph                |
| Social Tracker   | `/social`     | Viral spread timeline and platform breakdown |
| Batch Analysis   | `/batch`      | Multi-image queue with progress tracking     |
| Forensics Report | `/report`     | Full chain-of-custody report + JSON export   |
| Settings         | `/settings`   | Model thresholds, API config, toggles        |

---

## 🧪 Testing the Full Workflow

1. Open `http://localhost:5173/register` — create an account
2. Navigate to **Image Analysis** → drag-and-drop any JPEG/PNG
3. Click **Analyze** — deepfake score, ELA heatmap, and metadata will appear
4. Navigate to **Provenance Graph** → click **Build Graph**
5. Navigate to **Social Spread** → click **Simulate Spread**
6. Navigate to **Forensics Report** → click **Generate Report** → Export JSON
7. Verify data in MySQL:
   ```sql
   USE fakelineage;
   SELECT id, username, email FROM users;
   SELECT image_id, verdict, deepfake_score FROM analyses;
   ```

---

## 🛡 Security Notes

- **Passwords** are hashed with bcrypt (cost factor 12) — never stored in plaintext
- **JWT tokens** expire after 24 hours (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- **Change `SECRET_KEY`** in `.env` before any production deployment
- **`.env` is gitignored** — never commit credentials
- CORS is currently permissive (`"*"`) — restrict `allow_origins` in production

---

## 🔧 Environment Variables

| Variable                      | Default                                                    | Description               |
| ----------------------------- | ---------------------------------------------------------- | ------------------------- |
| `DATABASE_URL`                | `mysql+pymysql://root:password@localhost:3306/fakelineage` | MySQL connection string   |
| `SECRET_KEY`                  | `fakelineage-super-secret-key-change-in-production`        | JWT signing key           |
| `ALGORITHM`                   | `HS256`                                                    | JWT algorithm             |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440`                                                     | Token lifetime (24 hours) |

---

## 📦 Tech Stack

### Backend

- **[FastAPI](https://fastapi.tiangolo.com/)** — Async Python web framework
- **[SQLAlchemy](https://www.sqlalchemy.org/)** — ORM (MySQL via PyMySQL)
- **[Passlib + bcrypt](https://passlib.readthedocs.io/)** — Password hashing
- **[python-jose](https://python-jose.readthedocs.io/)** — JWT tokens
- **[Pillow](https://pillow.readthedocs.io/)** — Image processing
- **[NetworkX](https://networkx.org/)** — Provenance graph construction
- **[imagehash](https://github.com/JohannesBuchner/imagehash)** — Perceptual hashing

### Frontend

- **[React 18](https://react.dev/)** + **[TypeScript](https://www.typescriptlang.org/)**
- **[Vite](https://vitejs.dev/)** — Build tooling
- **[Tailwind CSS](https://tailwindcss.com/)** — Utility-first styling
- **[Framer Motion](https://www.framer.com/motion/)** — Animations
- **[React Flow](https://reactflow.dev/)** — Provenance graph visualization
- **[Recharts](https://recharts.org/)** — Social spread charts
- **[Zustand](https://zustand-demo.pmnd.rs/)** — State management
- **[Axios](https://axios-http.com/)** — HTTP client with interceptors

---

## 📁 Key Configuration Files

| File                          | Purpose                           |
| ----------------------------- | --------------------------------- |
| `backend/.env`                | MySQL URL, JWT secret             |
| `backend/requirements.txt`    | Python dependencies               |
| `frontend/vite.config.ts`     | Dev server + API proxy to `:8000` |
| `frontend/tsconfig.app.json`  | TypeScript strict settings        |
| `frontend/tailwind.config.js` | Tailwind theme extensions         |

---

## ⚠️ Research Notice

FakeLineage is an **experimental research tool** for studying image provenance and deepfake forensics. The deepfake detection pipeline uses heuristic signals — results should be **validated by domain experts** before use in legal, journalistic, or policy contexts.

---
