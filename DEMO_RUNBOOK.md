# Demo Runbook

The live-walk-through script for PropScore. Designed for an underwriter /
credit-team audience.

> **Setup first.** Follow `SETUP_FOR_TEAMMATE.md` and confirm both servers
> are running before opening this. Open `http://127.0.0.1:5173` in Chrome /
> Brave / Edge.

---

## Canonical demo case

| Field | Value |
|---|---|
| Address | Andheri East, Mumbai |
| Property type | Residential |
| Subtype | 2 BHK |
| Carpet area | 200 sqft (intentionally undersized — triggers Stage 2 flag) |
| Age | 12 years |
| Legal status | Unknown / weak |
| Rent | Optional |

This case is calibrated so every module surfaces a non-trivial signal:
Stage 1 returns the SQLite-backed Andheri East context, Stage 2 flags the
size anomaly, valuation runs, historical similar cases show positive
signal, portfolio concentration triggers senior review, and the locality
event cache has 11 curated events tied to this micro-market.

---

## What to click, in order

### 1. Landing → New Case

Click **New Case**. Fill the intake wizard with the canonical case.

### 2. Step 2 — Visual Collateral Evidence (optional overlay)

A full-screen overlay appears between the wizard and evaluation. This is
**deliberately optional** — you can:

- **Skip** with the *Continue to evaluation* button → image impact = 0, demo
  proceeds normally.
- **Upload** five standardised images and (if you want) click *Run vision
  scan* before continuing → the vision pipeline runs.

For the live demo: skip the first time through; revisit the **Visual
Evidence** tab post-evaluation to show the upload flow on its own.

### 3. AgentTerminal — loading screen

Process-descriptive logs only. Nothing is asserted as a finding here; the
real outputs land in the dashboard.

### 4. Dashboard tabs — in order

#### Overview
- Decision strip at the top — colour-coded by `verificationDecision`.
- Confidence + market value + distress value + recommended LTV.
- AI Brief preview (rule-based fallback if Ollama is off — that's the honest
  story, not a bug).

#### Stage 1 Buckets
Show the `SQLite reference database` source badge — proves the deterministic
locality lookup is doing its job, not a heuristic.

#### Stage 2 Verification
- "Severe Size Outlier" flag fires on the 200 sqft input.
- Decision: `MANUAL_REVIEW`.
- Audit rule IDs visible.

#### Valuation
- Market value + distress value range.
- Liquidity / TTL.
- Drivers + risks table.

#### Historical Cases
- 5 similar cases pulled from SQLite.
- Recency decay visible (older cases dampened).
- Confidence adjustment +0.037 typical.

#### Portfolio Risk
- 5 lenses (micro‑market / property‑type / subtype / similar‑bucket /
  low‑liquidity).
- One critical lens triggers senior review for the demo case.

#### Audit Pack
- Aggregated audit trail across every module.
- Click **Audit Pack** in the header to download the JSON (used as the
  lender-defendable artifact).

#### AI Brief
- Fast model (llama3.2:3b) first, then enhanced (qwen2.5:7b) upgrade.
- If Ollama is off → labeled `Rule-based summary shown because local LLM was
  unavailable or timed out.` — keep going, it's the demo-correct behaviour.

#### Visual Evidence (post-eval edit)
- Same component as Step 2. Demonstrate the cross-rule by uploading a wall
  image then triggering the seepage signal.

#### Locality Events (Hyperlocal Event Intelligence)
- Run-mode badge: **Live run** or **Cache run**.
- Cap-band badge: **Relaxed** (live official present) or **Tight** (cached /
  no live official).
- Sources-by-tier and corroboration breakdown.
- Watchlist panel for single-source media signals.
- **Live Scan Diagnostics** (collapsed by default) — opens to show docs
  fetched / accepted / rejected, top rejection reasons, and per-source
  counts. Use this to prove live RSS is actually hitting whitelisted sources
  even when no events are accepted for this micro-market.

#### Map Intelligence
- Hyperlocal context, accent overlays.

---

## What to say at each module

| Module | One-line pitch |
|---|---|
| Stage 1 | *"Locality and micro-market resolved against a seeded Mumbai SQLite reference — same place, same bucket, every run."* |
| Stage 2 | *"Six categories of verification checks running on local norms. Note the size anomaly here triggers manual review — that's a deterministic flag, not the AI."* |
| Valuation | *"Market value comes from circle rate × area × bounded multipliers. Image and locality signals overlay confidence and condition, but never the headline market value."* |
| Historical | *"Five similar SQLite cases with recency decay applied. Confidence nudge ±0.05 max."* |
| Portfolio | *"Five concentration lenses against the lender's seeded book. Senior-review trigger is policy-driven."* |
| Audit Pack | *"Every rule ID, input, and effect is recorded. This is the artifact a model-risk team would actually audit."* |
| AI Brief | *"Local LLM — qwen2.5:7b or fallback to llama3.2:3b. The model only explains; it cannot compute or change any number."* |
| Visual Evidence | *"Standardised image packet, capped condition effects, never moves base market value. Capture is upstream — we don't claim to do that."* |
| Locality Events | *"Live RSS across whitelisted official + reputed-media sources, cache fallback, asymmetric caps, watchlist for single-source media."* |

---

## What to say when things go sideways

### Live RSS returns 0 accepted events
> *"Live RSS hit whitelisted sources cleanly — open the Live Scan Diagnostics panel.
> 30 documents fetched, 0 accepted today. That's the validator doing its job:
> none of today's stories happen to be Andheri-specific. The cache fallback
> already has 11 official + media events for this micro-market, all dampened
> per the cache policy so cached intelligence never reaches live-strength caps."*

### Ollama not running
> *"AI is explanation-only by design — that's why the rule-based fallback is
> first-class. The deterministic decision is exactly the same; the narrative
> tab just reads from a structured template instead of qwen. This is the
> behaviour a bank would require: numbers never depend on the LLM."*

### Visual model unavailable
> *"Same architectural pattern. The IMG_MODEL_000 audit rule fires, image impact
> goes to zero, and the deterministic engine continues. A specialised PropTech
> damage model would slot in here in production; our boundary contract doesn't
> change."*

### Live media RSS rejection / WiFi issues at venue
> *"That's the source whitelist guarding us. No arbitrary URL fetching, no
> SSRF, no surprise data sources. If a source fails, the response shows
> `status: failed` and the pipeline continues."*

---

## Hardware notes

- On a 16 GB+ machine with a GPU, qwen2.5:7b + OWL-ViT both run smoothly.
- On a low-RAM laptop, set `ENABLE_VISION_MODEL=false` (frees ~1–2 GB) and
  optionally point Ollama at `llama3.2:3b` only. The dashboard transparently
  labels every fallback path; that's the demo story, not a workaround.
