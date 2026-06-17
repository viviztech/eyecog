# EyeCog — Clinical Eye Tracking Visual-Cognitive Assessment Software

EyeCog is a full-stack web application for clinical visual-cognitive assessment using eye tracking. It provides three task modules (Visual Search, Memory & Recognition, Reading), a patient management system, session reporting with PDF/CSV export, and normative comparison.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy, SQLite |
| Gaze streaming | FastAPI WebSocket |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| State / data | Zustand, TanStack Query, Axios |
| PDF export | fpdf2 |

No external database server is required — SQLite is used and the file is created automatically on first run.

---

## Project Structure

```
eyecog/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic schemas
│   ├── database.py          # DB engine & session
│   ├── seed.py              # Demo data seeder
│   ├── requirements.txt
│   └── routers/
│       ├── patients.py
│       ├── sessions.py
│       ├── dashboard.py
│       ├── gaze.py          # WebSocket gaze stream
│       └── reports.py       # PDF & CSV export
└── frontend/
    ├── src/
    │   ├── pages/           # Route-level page components
    │   ├── components/      # Reusable UI components
    │   ├── hooks/           # useGazeStream, useFixationDetection
    │   ├── lib/             # API client, task logic, formatters
    │   ├── stores/          # Zustand stores
    │   └── types/           # TypeScript interfaces
    ├── vite.config.ts
    └── package.json
```

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Python | 3.11 or newer | [python.org](https://www.python.org/downloads/) |
| Node.js | 18 or newer | [nodejs.org](https://nodejs.org/) |
| npm | 9 or newer | Bundled with Node.js |
| Git | any | For cloning |

---

## Local Deployment — Windows

### 1. Clone the repository

```powershell
git clone https://github.com/viviztech/eyecog.git
cd eyecog
```

### 2. Set up the Python backend

```powershell
cd backend

# Create a virtual environment
python -m venv .venv

# Activate it
.venv\Scripts\Activate.ps1

# If you get an execution policy error, run first:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install dependencies
pip install -r requirements.txt
```

### 3. Start the backend

```powershell
# Still inside backend/ with .venv active
python -m uvicorn main:app --port 8001
```

The API will be available at `http://localhost:8001`.  
The database file `eyecog.db` is created automatically and seeded with demo patients on first run.

> To enable auto-reload during development: add `--reload` to the command above.

### 4. Set up the frontend (new terminal window)

```powershell
cd eyecog\frontend

npm install
```

### 5. Start the frontend

```powershell
npm run dev
```

The app opens at **http://localhost:5173**.

### 6. Verify everything is working

Open `http://localhost:5173` in your browser. You should see the EyeCog dashboard with demo patient data already populated.

You can also hit the health check endpoint directly:

```powershell
curl http://localhost:8001/api/health
# Expected: {"status":"ok"}
```

---

## Local Deployment — Linux / macOS

### 1. Clone the repository

```bash
git clone https://github.com/viviztech/eyecog.git
cd eyecog
```

### 2. Set up the Python backend

```bash
cd backend

# Create a virtual environment
python3 -m venv .venv

# Activate it
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Start the backend

```bash
# Still inside backend/ with .venv active
uvicorn main:app --port 8001
```

The API will be available at `http://localhost:8001`.  
The database file `eyecog.db` is created automatically and seeded with demo patients on first run.

> To enable auto-reload during development: add `--reload` to the command above.

### 4. Set up the frontend (new terminal tab)

```bash
cd eyecog/frontend

npm install
```

### 5. Start the frontend

```bash
npm run dev
```

The app opens at **http://localhost:5173**.

### 6. Verify everything is working

```bash
curl http://localhost:8001/api/health
# Expected: {"status":"ok"}
```

---

## Ports Reference

| Service | Port | URL |
|---|---|---|
| Backend API | 8001 | http://localhost:8001 |
| Frontend (Vite) | 5173 | http://localhost:5173 |
| API docs (Swagger) | 8001 | http://localhost:8001/docs |

All `/api` and `/gaze-stream` requests from the frontend are proxied to the backend automatically via Vite's dev proxy — no manual CORS configuration needed in development.

---

## Running Both Servers — Quick Reference

### Windows (two PowerShell windows)

**Window 1 — Backend:**
```powershell
cd eyecog\backend
.venv\Scripts\Activate.ps1
python -m uvicorn main:app --port 8001 --reload
```

**Window 2 — Frontend:**
```powershell
cd eyecog\frontend
npm run dev
```

### Linux / macOS (two terminal tabs)

**Tab 1 — Backend:**
```bash
cd eyecog/backend
source .venv/bin/activate
uvicorn main:app --port 8001 --reload
```

**Tab 2 — Frontend:**
```bash
cd eyecog/frontend
npm run dev
```

---

## Resetting Demo Data

To wipe the database and re-seed with fresh demo patients:

```bash
# Windows
del backend\eyecog.db

# Linux / macOS
rm backend/eyecog.db
```

Restart the backend — the database and demo data are recreated automatically.

---

## Task Modules

| Module | Path | Description |
|---|---|---|
| Visual Search | `/task/visual-search` | Target detection among distractors, fixation tracking |
| Memory & Recognition | `/task/memory` | Study → blank → recall phases, hesitation detection |
| Reading | `/task/reading` | Word-level gaze tracking, regression detection, WPM, cognitive load index |

---

## Gaze Tracking

By default the application uses **mouse position as a gaze proxy**, which is suitable for development and demonstration. In Settings (`/settings`) you can configure the tracker type. Tobii Pro Nano and Tobii EyeX require the device and driver to be connected before use.

---

## API Documentation

FastAPI auto-generates interactive API docs. With the backend running, visit:

- **Swagger UI:** http://localhost:8001/docs
- **ReDoc:** http://localhost:8001/redoc

---

## Common Issues

**PowerShell execution policy error on Windows**
```
.venv\Scripts\Activate.ps1 cannot be loaded because running scripts is disabled
```
Fix:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Port already in use**

If port 8001 or 5173 is occupied, find and stop the process:
```powershell
# Windows — find process on port 8001
Get-NetTCPConnection -LocalPort 8001 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```
```bash
# Linux / macOS
lsof -ti:8001 | xargs kill -9
```

**`fpdf2` import error**

Make sure your virtual environment is activated before starting the backend, then run:
```bash
pip install fpdf2>=2.8
```

---

## License

MIT © Viviz Technologies
