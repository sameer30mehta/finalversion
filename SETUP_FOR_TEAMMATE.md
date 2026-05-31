# Setup for Teammate — Fresh Clone Walkthrough

The absolute-minimum first-time setup, from a fresh clone to a running demo.

> **Prerequisites:** Python 3.11+, Node.js 18+, Git. Ollama is optional — the
> system has a labeled rule-based fallback if Ollama isn't running.

---

## Windows (PowerShell)

```powershell
# 1. Clone
git clone <REPO_URL>
cd <CLONED_DIR>

# 2. Backend dependencies
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend/requirements-dev.txt

# 3. Environment (one-shot — defaults are portable)
Copy-Item .env.example .env
# Optional: backend-only overrides
Copy-Item backend/.env.example backend/.env

# 4. Seed the SQLite reference database (auto-creates ./data/)
python backend/db/seed_sqlite.py

# 5. Start the backend (one terminal)
python -m uvicorn backend.main:app --reload --port 8000

# 6. In a NEW PowerShell window — start the frontend
npm install
npm run dev
```

Open the Vite URL it prints (usually `http://127.0.0.1:5173`).

---

## macOS / Linux

```bash
git clone <REPO_URL>
cd <CLONED_DIR>

python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r backend/requirements-dev.txt

cp .env.example .env

python backend/db/seed_sqlite.py
python -m uvicorn backend.main:app --reload --port 8000
```

In a new terminal:
```bash
npm install
npm run dev
```

---

## (Optional) Ollama for the AI Underwriter Summary

If you skip this, the AI Brief tab cleanly degrades to a labeled rule-based
summary — the rest of the demo is unaffected.

```powershell
# Pull both models
ollama pull qwen2.5:7b
ollama pull llama3.2:3b
ollama list

# Optional: keep models off the system drive
setx OLLAMA_MODELS "<absolute-path-to-your-model-dir>"
# Restart PowerShell after setx
```

---

## Manual seed command (explicit, for clarity)

```powershell
python backend/db/seed_sqlite.py
```

Creates `./data/propscore.sqlite` with the locality / market / historical /
portfolio reference tables. The backend's `@startup` also seeds the locality
event cache with curated demo events for Andheri East if the cache is empty
(idempotent — safe to restart).

---

## Health check

After both servers are up:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Expect `database_available: true`. `ollama_available` is informational.

---

## Common gotchas

| Symptom | Resolution |
|---|---|
| `ModuleNotFoundError` in backend | Reactivate venv: `.\.venv\Scripts\Activate.ps1` |
| Frontend can't reach backend | Confirm both URLs match — backend on 8000, `VITE_API_BASE_URL=http://127.0.0.1:8000` |
| Stage 1 returns `fallback` instead of `sqlite` | Run step 4 (seed); confirm `./data/propscore.sqlite` exists |
| Ollama unreachable | Either start `ollama serve` or accept the labeled rule-based fallback |
| Vision OOM on low-RAM laptop | Set `ENABLE_VISION_MODEL=false` in `.env` |
| Live RSS feeds fail | Cache fallback is automatic; dashboard badges run as "Cache" |

For the live-demo script see **`DEMO_RUNBOOK.md`**. For honest limitations see
**`KNOWN_LIMITATIONS.md`**.
