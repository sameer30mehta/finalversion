# PropScore: Collateral Valuation & Liquidity Engine

A collateral intelligence platform for property-backed lending that combines valuation, liquidity, verification, historical reliability, portfolio concentration, and AI-assisted underwriter explanation.

## Problem Statement

Property-backed lending still depends heavily on manual collateral review, branch-level judgment, and valuation reports that often stop at a price estimate. This creates avoidable underwriting risk:

- Inconsistent valuation outcomes across reviewers and locations
- Manual and slow review cycles for credit teams
- Limited visibility into resale liquidity and time-to-liquidate
- Weak confidence or uncertainty modeling around value estimates
- No portfolio-aware view of whether a new collateral increases concentration risk

## Solution Overview

PropScore turns a raw property submission into a structured collateral intelligence workflow:

```text
Raw Property Input
-> Stage 1 normalization and bucket assignment
-> Stage 2 verification and red-flag screening
-> Valuation and liquidity estimation
-> Historical reliability
-> Portfolio concentration risk
-> AI underwriter summary
-> Lender action
```

The system keeps all numeric scoring deterministic. The local LLM explains already-computed outputs and recommends evidence; it does not calculate scores or valuation.

## Key Features

- SQLite-backed Mumbai one-city data layer
- Multi-scale bucket assignment for locality, micro-market, and hyperlocal context
- Verification and anomaly screening against local market norms
- Market value and distress value estimates
- Resale potential and time-to-liquidate signals
- Historical similar cases with recency decay and severe size mismatch cap
- Portfolio concentration risk with LTV adjustment and senior review trigger
- Ollama underwriter summary and evidence recommendations
- Deterministic scoring with an audit-safe LLM boundary

## Product Screenshots

### Hyperlocal Map Intelligence

![PropScore hyperlocal map intelligence dashboard](docs/screenshots/hyperlocal-map-intelligence.png)

## Architecture Overview

- **Frontend:** React + Vite lender dashboard for intake, verification, valuation, historical cases, portfolio risk, and AI briefing.
- **Backend:** FastAPI service exposing SQLite-backed endpoints and the Ollama underwriter summary endpoint.
- **Database:** Local SQLite database seeded with Mumbai reference data for a complete one-city workflow.
- **LLM:** Local Ollama models for explanation-only underwriter narrative.
- **Fallbacks:** If SQLite or Ollama is unavailable, the dashboard keeps deterministic outputs visible and uses safe fallbacks.

Core backend endpoints:

- `GET /health`
- `POST /api/stage1/resolve-context`
- `POST /api/historical/similar-cases`
- `POST /api/portfolio/concentration-risk`
- `POST /api/llm/underwriter-summary`

## Database Schema Overview

- `locality_master`: Mumbai locality, micro-market, access, demand, and liquidity reference data.
- `market_norms`: Property type/subtype norms, common size bands, price bands, comparable counts, and liquidity index.
- `circle_rate_master`: Seeded circle-rate style floor-value references by zone and property type.
- `historical_cases`: Historical collateral cases used for similarity, recency decay, and confidence adjustment.
- `portfolio_exposure`: Active book exposure used for concentration risk, delinquency/default signal, and LTV review.
- `cases`: Case-level storage shape for normalized input, bucket assignment, stage outputs, and final decision.
- `valuation_outputs`: Valuation output shape for market value, distress value, confidence, and adjustments.
- `audit_logs`: Rule-level audit trail shape for score contributions and explanations.
- `geocode_cache`: Cached geocode records for common demo localities.

## Data Note / Honesty Statement

This hackathon implementation uses seeded Mumbai reference data to demonstrate the complete workflow. In deployment, these tables would be populated from public listing feeds, government/circle-rate sources, maps/POI data, and lender internal loan/portfolio systems.

This repository does not claim to include real bank data, live market data, pan-India coverage, or production valuation guarantees.

## LLM Boundary

Ollama is used for explanation, underwriter summaries, review-route wording, and evidence recommendations only.

Ollama does **not** calculate valuation, anomaly score, suspicion score, confidence score, portfolio risk score, LTV, or risk flags. All numeric scores, value estimates, LTV adjustments, and flags are computed by deterministic engines.

## Hyperlocal Event Intelligence (Whitelisted Source Feed)

PropScore consumes a live, whitelisted official-source feed of locality-level infrastructure, regulatory, and weather events, converts each into a structured event object, and applies bounded deterministic effects to **liquidity, marketability, confidence, time-to-liquidate, risk flags, and manual review routing only**. This layer **never directly moves base market value, circle rate, historical comps, or final score**. The LLM is an extraction layer only; the deterministic rule engine decides the numeric impact.

Source whitelist (`backend/locality_intelligence/source_registry.py`) has two tiers:

**Official sources (verification / trust layer, trust 0.90–0.98):**
- **MMRDA** (`mmrda.maharashtra.gov.in`) — live HTML scrape of press releases.
- **NDMA Sachet** (`sachet.ndma.gov.in`) — live HTML scrape of alerts.
- **MahaRERA** (`maharera.maharashtra.gov.in`) — registered, JS-rendered; cache-served via stub fetcher pending headless-browser integration.
- **IMD** (`mausam.imd.gov.in`) — registered, image-heavy / region tabs; cache-served via stub fetcher.

**Reputed media (live discovery layer, trust 0.65–0.80, RSS preferred):**
- **Hindustan Times — Mumbai**, **The Hindu — Mumbai**, **Indian Express — Mumbai**, **Times of India — Mumbai**, **Economic Times — Realty**, **Moneycontrol — Real Estate**.

**Local media (trust 0.45–0.60):**
- **Mid-Day — Mumbai**.

**Corroboration engine** (`backend/locality_intelligence/corroboration.py`): after validation, events are bucketed by `(eventType, direction, project|locality, ~30-day window)` and each group receives a `corroborationStatus` + `corroborationWeight`:

| status | meaning | weight |
|---|---|---|
| `official_plus_media` | official source + at least one media source | 1.10 |
| `official_only` | only an official source | 1.00 |
| `media_corroborated` | two or more independent reputed media | 0.72 |
| `media_only` | one reputed media source | 0.40 |
| `local_media_only` | one local-media source | 0.25 |
| `unconfirmed` / `rejected` | weak / failed validation | 0.00 |

The scoring formula now multiplies by this weight:

```
eventWeight = sourceTrust × localityRelevance × confidence × severity
              × recencyWeight × projectMaturityWeight × corroborationWeight
```

Single-source media events are tagged `isWatchlist=true`. They contribute their (already dampened) deltas but **do not trigger manual review** unless the event is in a severe-risk type list (`revoked_project`, `rera_project_risk`, `litigation_redevelopment_risk`, `environmental_restriction`, `flood_warning`, `infrastructure_delay`). The dashboard renders watchlist signals in their own labeled panel so they don't visually rank as high-trust.

**Cross-rule** (in `Dashboard.jsx::augmentedData`): when **media reports waterlogging / flood / heavy rain** AND **visualEvidence has an accepted seepage / dampness / water-stain signal**, the system fires `NEWS_VISUAL_CROSS_WATER_001` — triggers `technical_valuer_inspection` and applies a bounded confidence penalty (-0.02). Recorded in the audit trail.

**Cache-fallback dampener + asymmetric caps.** To prevent cached-only intelligence from looking as strong as a live official-confirmed scan, two policies stack:

1. **Per-event cache dampener** — when the run is serving from cache (`status: live_unavailable_cached`), each accepted event's scored deltas are multiplied by a tier-aware factor before aggregation:

   | corroboration status | cache multiplier |
   |---|---|
   | `official_only` / `official_plus_media` | 0.75 |
   | `media_corroborated` | 0.40 |
   | `media_only` | 0.40 |
   | `local_media_only` | 0.20 (severe-risk only; otherwise 0.00 — watchlist only) |

   Logged once per cached run as `NEWS_CACHE_DAMPENER_001`.

2. **Asymmetric positive caps** — positive upside is held tighter than downside risk. The **tight** positive ceiling is liquidity/marketability **+0.05** and TTL improvement **-0.07**. The wider ceiling (liquidity/marketability **+0.08**, TTL **-0.10**) is **only** unlocked when the current run has at least one **live** `official_only` or `official_plus_media` event. Negative-risk caps are unchanged (-0.08 / -0.04 / +0.15). Each clamp emits `NEWS_POSITIVE_CAP_001` or `NEWS_NEGATIVE_CAP_001`.

3. **Positive-watchlist suppressor.** A single `media_only` or `local_media_only` positive-direction event has its already-corroboration-dampened scaled deltas further halved (×0.5) so it contributes meaningful watchlist context but doesn't meaningfully move liquidity / marketability.

The dashboard section shows the run mode (`Live run` / `Cache run`), the cap band (`Relaxed` / `Tight`), the pre-cap aggregate deltas, and a permanent policy line: *"Cached events are dampened. Live official-confirmed events receive stronger weighting."*

URL boundary: `validate_url_against_whitelist` rejects any URL whose host is not a suffix-match of an enabled `allowedDomain` AND whose resolved IP is not public (private / loopback / link-local / multicast / reserved blocked). Redirects to non-whitelisted hosts are blocked. Per-request size cap and timeout are enforced. One source failing never kills the others.

LLM role (`backend/locality_intelligence/llm_extractor.py`): calls the existing local Ollama setup (qwen → llama → rule-based fallback) with a strict-JSON prompt that requires an evidence quote drawn from the source text. The evidence validator rejects events where the quote isn't found in the original scrape, or where `localityRelevance < 0.55` or `confidence < 0.60`.

Deterministic scoring (`backend/locality_intelligence/scoring.py`):

```
eventWeight = sourceTrust × localityRelevance × confidence × severity
              × recencyWeight × projectMaturityWeight
```

Per-event caps are per `eventType` (e.g. `metro_connectivity` peaks at liquidity +0.06, marketability +0.05, confidence +0.02, TTL −8%). Global aggregate caps clamp the total: liquidity / marketability ∈ ±0.08, confidence ∈ ±0.04, TTL ∈ −10%…+15%.

Cache + fallback (`backend/locality_intelligence/cache.py`, `locality_event_cache` table):

1. Live scrape attempted first.
2. Accepted events persisted to the SQLite cache.
3. If live yields no accepted events for a locality, the cache is read and events are re-scored (caps re-applied).
4. If neither path yields anything, the response is a safe zero-impact payload — core valuation continues unaffected.

For demo reliability the cache is seeded on startup with curated public-domain events for Andheri East (`backend/locality_intelligence/seed.py`). The dashboard clearly badges the status as **Live scan completed**, **Live unavailable — cached**, or **No locality events available**.

API: `POST /api/locality/live-intelligence`. Endpoint never raises — every failure mode returns a structured zero-impact response.

UI: a dedicated **Locality Events** tab on the dashboard. Each event card shows the source, the exact evidence quote, the per-event deltas, the audit rule ID, and a link to the source URL. The decision-impact card and the AI summary payload both receive only the compact structured summary; the LLM never sees raw scraped text.

## Optional Visual Collateral Evidence Layer

PropScore does **not** build the secure image-capture layer. In production, images and metadata are produced upstream by the bank mobile app, borrower portal, relationship-manager / field-officer app, valuer portal, or a secure capture SDK. That upstream layer is responsible for GPS capture, timestamping, spoofing prevention, uploader role, image category assignment, and verified-capture status.

PropScore consumes a standardized visual evidence packet (images + metadata) and converts it into auditable collateral evidence signals. The layer is **optional**, **deterministic-first**, and **bounded**:

- **No images** → image impact is zero. Existing pipeline behaves exactly as before.
- **Incomplete packet** (any of the 5 required categories missing) → image impact is zero; missing categories are shown.
- **Complete packet + model unavailable / failed / timeout** → image impact is zero. UI states: *"Visual model unavailable. Image-based condition scoring skipped. Core valuation unaffected."*
- **Complete packet + clean model pass + trusted metadata** → small bounded confidence boost (`IMG_CONF_001/002`, max +0.06).
- **Complete packet + accepted damage / water signal** → bounded confidence penalty (max −0.05), bounded valuation modifier (max −0.05), and a manual inspection route (field officer / technical valuer / structural engineer).
- **GPS mismatch (`IMG_META_001`)** → positive image impact is blocked; field-officer review is recommended.
- **Every effect is hard-capped** (`IMG_CAP_001`): confidence delta ∈ [−0.05, +0.06], valuation modifier ∈ [−0.05, +0.03], liquidity modifier ∈ [−0.03, +0.02].

The image model is used only as a *signal extractor*. It does not estimate property value, compute LTV, override deterministic scores, or replace valuers. Every accepted rule is recorded in the visual evidence audit trail with input, effect, and explanation.

The required image categories are: **Front Exterior**, **Entrance / Nameplate / Building Identity**, **Main Interior Area**, **Kitchen / Bathroom / Utility Area**, and **Damage Evidence or No-Damage Declaration**. Optional categories include parking / common area, basement / ground floor, terrace / roof, shop frontage, and additional damage evidence. The dashboard's *Visual Evidence* tab lets you upload the packet, set metadata (uploader role, GPS status, capture verification, freshness), trigger the optional vision scan, and inspect findings, decision impact, and the full audit trace.

This layer does not claim perfect damage detection, structural diagnosis, image-based valuation, or replacement of professional valuers.

## Handoff Docs

If you're picking this up cold, read in this order:

1. **`SETUP_FOR_TEAMMATE.md`** — minimum first-clone walkthrough.
2. **`DEMO_RUNBOOK.md`** — what to click and say during the live demo.
3. **`KNOWN_LIMITATIONS.md`** — honest scope statement.
4. **`CONTRIBUTING_OR_HANDOFF.md`** — branch / PR / pre-push workflow.
5. **`SETUP.md`** — fuller setup reference (Windows + Mac/Linux).
6. **`API_TESTS.md`** — copy-paste backend smoke tests.

## Setup Instructions

Run commands from the project root:

```powershell
git clone https://github.com/sameer30mehta/demo_tensor.git
cd demo_tensor
```

Create and activate a Python virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r backend\requirements-dev.txt
```

Copy the environment example (one-time):

```powershell
cp .env.example .env
```

Seed the local SQLite database (auto-creates `./data/`):

```powershell
python backend/db/seed_sqlite.py
```

Start the backend (defaults to the values in `.env`):

```powershell
python -m uvicorn backend.main:app --reload --port 8000
```

Install and start the frontend in a second PowerShell window:

```powershell
npm install
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://127.0.0.1:5173`.

## Ollama Setup

Ollama is optional for deterministic scoring but required for local AI underwriter summaries.

If Ollama is not already running, start the Ollama app or run `ollama serve` in a separate terminal first. Optionally point `OLLAMA_MODELS` at a custom directory before running `ollama pull` so the model files don't fill the system drive.

Pull the models:

```powershell
ollama pull qwen2.5:7b
ollama pull llama3.2:3b
ollama list
```

`qwen2.5:7b` may be slow on low-RAM machines. The app supports `llama3.2:3b` as the fast/fallback model and also has a rule-based fallback if local LLM calls fail.

## Environment Variables

Copy `.env.example` values into your local environment. Do not commit actual `.env` files.

```env
DATA_DIR=./data
DATABASE_URL=sqlite:///./data/propscore.sqlite
SQLITE_DB_PATH=./data/propscore.sqlite
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_PRIMARY_MODEL=qwen2.5:7b
OLLAMA_FALLBACK_MODEL=llama3.2:3b
ENABLE_LIVE_LOCALITY_SCAN=true
ENABLE_LOCALITY_CACHE=true
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Canonical Test Case

Use this case in the intake flow:

- Address: Andheri East, Mumbai
- Property type: Residential
- Subtype: 2BHK
- Size: 200 sqft
- Age: 12 years
- Legal/title: Unknown or weak

Expected behavior:

- Stage 1: SQLite reference DB context and Andheri East bucket assignment
- Stage 2: SQLite `market_norms` and size anomaly/manual review
- Historical: SQLite similar cases with recency decay
- Portfolio: Concentration risk and LTV adjustment
- AI: Underwriter summary plus evidence recommendations

## API Endpoints

See [API_TESTS.md](./API_TESTS.md) for copy-paste PowerShell calls.

- `GET /health`: Backend health check.
- `POST /api/stage1/resolve-context`: Resolve SQLite locality, bucket, market norm, and circle-rate context.
- `POST /api/historical/similar-cases`: Retrieve and score similar historical collateral cases.
- `POST /api/portfolio/concentration-risk`: Assess portfolio concentration and recommended LTV impact.
- `POST /api/llm/underwriter-summary`: Generate explanation-only underwriter summary with Ollama and rule-based fallback.

## Optional Visual Collateral Evidence Layer

PropScore consumes an optional, standardized visual evidence packet and converts it into auditable, bounded scoring effects. PropScore does **not** build the secure camera-capture layer — in production that is owned upstream by the bank mobile app, the borrower upload portal, the relationship-manager / field-officer app, the valuer portal, or a secure capture SDK.

Judge-facing line: *"Image capture is upstream. PropScore consumes a standardized visual evidence packet and converts it into auditable collateral evidence signals."*

What the layer does:

1. Validates packet completeness against five required image categories (front exterior, entrance / nameplate, main interior, kitchen / bath / utility, damage-or-no-damage declaration).
2. Computes metadata trust from per-image fields the upstream layer supplies — uploaded-by role, GPS match status, capture verification, freshness.
3. Optionally runs a pretrained zero-shot detector (the existing `/api/vision/scan` OWL-ViT endpoint) to extract basic warning signals (cracks, dampness, seepage, fire / severe damage, etc.).
4. Converts accepted signals into deterministic capped effects via a rule engine (`src/lib/visualEvidenceEngine.js`).
5. Produces an audit trail keyed by rule IDs (`IMG_PKT_*`, `IMG_MODEL_*`, `IMG_DMG_*`, `IMG_CONF_*`, `IMG_META_*`, `IMG_CAP_*`).
6. Surfaces inspection routing — `field_officer_review`, `technical_valuer_inspection`, or `structural_engineer_inspection`.

Hard contract — image impact is zero when any of the following hold:

- No images uploaded
- Packet incomplete (any required category missing)
- Model unavailable, failed, or timed out
- All detections below threshold

A strong accepted signal triggers a bounded confidence penalty and a bounded valuation condition modifier, plus the appropriate manual inspection route. Hard caps (`IMG_CAP_001`):

- `confidenceDelta` ∈ [-0.05, +0.06]
- `valuationModifierPct` ∈ [-0.05, +0.03]
- `liquidityModifierPct` ∈ [-0.03, +0.02]

Clean images mainly improve confidence, not valuation. The final market-value range is never altered by image evidence; the bounded valuation modifier is shown as a separate transparent line.

Demo flow:

- Wizard collects property fields.
- **Step 2 (optional)**: visual evidence overlay — upload the 5-category packet, set metadata, optionally run the vision scan, then `Continue to evaluation`.
- Deterministic evaluation runs with the visual evidence already integrated (with caps).
- The Visual Evidence dashboard tab remains editable for post-hoc changes; updates flow through the same lifted state with the same caps.

The LLM never sees raw images. Only the compacted `visualEvidence` summary (packet status, missing categories, metadata trust, accepted concerns, capped deltas, inspection route) is passed to the underwriter-summary prompt.

PropScore does not claim perfect damage detection, structural diagnosis, replacement of human valuers, or image-based property valuation.

## Known Limitations

- One-city Mumbai seeded dataset.
- Nearest-center locality matching, not polygon or parcel-level matching.
- No live paid maps/listings integration yet.
- Ollama performance depends on local RAM, CPU, and GPU availability.
- `qwen2.5:7b` may timeout on low-memory machines; `llama3.2:3b` fallback is supported.

## Future Improvements

- Polygon/H3 spatial joins
- Real listing ingestion
- Real circle-rate ingestion
- OCR/legal document extraction
- Calibration from lender historical performance
- Cloud deployment
- Portfolio-level monitoring dashboard

## Docker Note

Docker files are included as optional deployment scaffolding. The recommended hackathon demo path is local Windows setup with SQLite on disk and Ollama running on the host machine. If using Docker, mount the SQLite path and keep Ollama available at `http://127.0.0.1:11434` or an equivalent host URL.
