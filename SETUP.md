# Setup Guide

Practical setup for the PropScore demo. Paths are repo-relative; the backend
auto-creates `./data/` on first run.

## Prerequisites

- Python 3.11+
- Node.js + npm
- Git
- Ollama (optional — system falls back to rule-based if not running)

## 1. Backend dependencies

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend/requirements-dev.txt
```

Mac/Linux equivalent:
```bash
python3 -m venv .venv && source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r backend/requirements-dev.txt
```

## 2. Configure environment

```powershell
cp .env.example .env             # one consolidated env file is enough
cp backend/.env.example backend/.env   # optional — backend-only overrides
```
All paths default to `./data/propscore.sqlite` — nothing to edit unless you
want a non-default location.

## 3. Seed SQLite

```powershell
python backend/db/seed_sqlite.py
```

Creates `./data/propscore.sqlite` with the locality / market / historical /
portfolio reference tables. The backend also auto-seeds the locality event
cache on startup with the curated demo events for Andheri East.

## 4. Start the backend

```powershell
python -m uvicorn backend.main:app --reload --port 8000
```

Health check:
```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

## 5. Start the frontend (second terminal)

```powershell
npm install
npm run dev
```
Open the printed Vite URL (usually `http://127.0.0.1:5173`).

## 6. Ollama (optional)

```powershell
ollama pull qwen2.5:7b
ollama pull llama3.2:3b
ollama list
```

- `qwen2.5:7b` is the enhanced explanation model.
- `llama3.2:3b` is the fast/fallback explanation model.
- Deterministic valuation and scoring do **not** require Ollama.

If your laptop is RAM-constrained, you can disable vision (frees ~1–2 GB):
```powershell
$env:ENABLE_VISION_MODEL="false"
```
and/or run with the smaller fast model only:
```powershell
$env:OLLAMA_PRIMARY_MODEL="llama3.2:3b"
```

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| Backend import error | Confirm `pwd` is the repo root; reactivate venv |
| Frontend can't reach backend | `$env:VITE_API_BASE_URL="http://127.0.0.1:8000"` then restart `npm run dev` |
| Ollama "couldn't allocate buffer" | Switch to `llama3.2:3b` only, free RAM, disable vision model |
| Live RSS sources fail | Cache fallback fires automatically; the dashboard badges the run as "Cache" |
| `localhost` quirks | Use `127.0.0.1` everywhere; backend normalises both |

See `SETUP_FOR_TEAMMATE.md` for the absolute-minimum first-clone walkthrough,
and `DEMO_RUNBOOK.md` for the live-demo script.
