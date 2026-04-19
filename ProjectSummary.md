# PropScore: Collateral Valuation & Liquidity Engine
## *The Complete Refined Solution*

PropScore is a professional-grade, deterministic collateral valuation platform designed to provide instant, explainable, and data-driven property assessments for lenders, underwriters, and market analysts.

---

## 1. Core Philosophy: The Confidence Ladder
The system operates on a **Confidence Ladder** where images are a bonus, not a crutch.
*   **Production Credible:** The engine produces outputs regardless of image availability.
*   **Uncertainty Reduction:** Images narrow the uncertainty band and raise the confidence score, but do not gate the result.
*   **Real-world Alignment:** Mirrors actual underwriting where forms are mandatory but site photos might be staggered or optional.

---

## 2. Information Flow: Progressive Disclosure
The input flow consists of three logical steps designed to maximize completion while rewarding enrichment.

### Step 1 — Location
*   **Search-First:** Single field with Google Places autocomplete.
*   **Auto-Population:** Automatically fills Pin Code, City, District, State, and Lat/Long.
*   **Field-Ready:** Includes "Use my GPS location" for mobile field agents.

### Step 2 — Property Details
*   **Five Mandatory Fields:** Type (Apartment, Villa, Plot, etc.), Configuration (1BHK, 2BHK, etc.), Carpet Area (sqft), Age (years), and Floor Number.
*   **Baseline Outputs:** These provide enough data to generate valuation results with a 0.50–0.58 confidence score.

### Step 3 — Optional Enrichment
*   **Confidence Payoff:** A collapsible panel where each entry increases the confidence score.
*   **Inputs:** Ownership type, legal status, occupancy status, monthly rental, and photo uploads (0–10 images).
*   **Adaptive Logic:**
    *   **No Images:** Defaults to locality average condition; widens uncertainty band by 10–15%; flags for site inspection.
    *   **Exterior Only:** Runs facade condition scoring and construction era estimation.
    *   **Interior/Mixed:** Full condition scoring pipeline including finish quality grading.

---

## 3. Data Sources & Intelligence

| Data Category | Sources | Implementation Detail |
| :--- | :--- | :--- |
| **Circle Rates** | IGRS (State Govt) | Pre-scraped JSON keyed by pincode + property type. |
| **Infra Proximity** | Google Places & OpenStreetMap | Transit, schools, and hospitals via Nearby Search and Overpass API. |
| **Market Activity** | Listing Proxies | Pre-scraped listing density, days-on-market, and ask-price distributions. |
| **Hazard Data** | NDMA India | Point-in-polygon checks against flood hazard GeoJSON. |
| **Satellite Delta** | Google Earth Engine | Neighbourhood change index (2019 vs 2024) via NDVI/Built-up expansion. |
| **Vision Models** | Hugging Face / CLIP | Zero-shot condition scoring (1–5 scale) and defect detection. |

---

## 4. The 7-Engine Calculation Framework

### Market Value Range
Uses a deterministic formula: `Base (Circle Rate × Area) × Multipliers`.
*   **Location Premium:** Based on IPI (Infrastructure) and demand scores.
*   **Age Depreciation:** Standard NBFC logic (e.g., 1.5% per year for residential).
*   **Uncertainty Buffer:** Starts at ±8% and widens based on data gaps (e.g., +5% if no images).

### Infrastructure Proximity Index (IPI)
A weighted sum of distance-decayed scores for transit, hospitals, and schools.

### Distress Sale Value
`Market Value × (1 - Total Liquidity Discount)`.
*   Discounts vary by city tier (15% for Tier-1, up to 25% for Tier-3).
*   Add-on discounts for age > 20yrs, legal flags, or low micro-market demand.

### Resale Potential Index (RPI / PropScore)
A 0-100 score built from 10 weighted factors including fungibility, age, micro-market balance, and legal clarity.

### Time to Liquidate (TTL)
Baseline ranges (e.g., 30–60 days) adjusted by RPI and negative/positive flags.

### Confidence Score
Starts at 0.50. Increases incrementally (+0.05 per field, +0.15 for images) to a maximum of 0.90.

---

## 5. Fraud Audit Module
Runs in parallel to detect anomalies and protect lenders:
*   **Size Sanity:** Compares carpet area against 5th–95th percentile norms for that configuration/locality.
*   **Location-Property Mismatch:** Flags residential villas in commercial-tagged land use zones.
*   **Value Arbitrage:** Flags claimed values deviating >40% from computed market value.
*   **Image Fraud:** Detects professionally staged "listing photos" instead of current-state site documentation.

---

## 6. Technical Architecture
*   **Backend:** FastAPI (Python) service with modular engines (`geo_enrich_engine`, `valuation_logic`, `vision_ai`).
*   **Frontend:** Next.js + Tailwind for a high-fidelity Glassmorphism UI.
*   **Agentic AI:** A final LLM call (Claude/GPT) generates a plain-English narrative for credit officers, turning complex data into a 3-sentence actionable summary.
