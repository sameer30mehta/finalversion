# Known Limitations

A frank list of what PropScore does and does not do, so the demo audience
gets accurate context.

---

## Data scope

- **One city, one micro-market dataset.** Seeded Mumbai reference data
  (`locality_master`, `market_norms`, `circle_rate_master`,
  `historical_cases`, `portfolio_exposure`) — not real bank data, not pan-India.
- **Nearest-centre locality matching.** No polygon / parcel / H3 spatial
  joins yet.
- **Historical and portfolio rows are synthetic but deterministic.** Realistic
  shape; not a real claims book.

## Live scraping — what's reliable today

| Source | Tier | Status today |
|---|---|---|
| NDMA Sachet | official | Live HTML scrape works in our tests |
| MMRDA | official | Live HTML scrape attempts; sometimes returns 0 docs depending on page state |
| MahaRERA | official | JS-rendered portal — registered with stub fetcher; cache-served until headless-browser integration |
| IMD | official | Image-heavy region tabs — registered with stub fetcher; cache-served |
| Times of India / Hindustan Times / Indian Express / The Hindu / Economic Times Realty / Moneycontrol | reputed_media | RSS scraping — typically lots of docs fetched, very few accepted (validator is conservative on locality relevance) |
| Mid-Day | local_media | RSS sometimes flaky |

Official portals are JS-heavy / unstable / paginated PDFs — production-grade
ingestion needs Playwright or vendor APIs. The cache fallback is what makes
the demo robust regardless.

## Media is discovery, not proof

Whitelisted media RSS is the **discovery** layer. It's never treated as
verification:

- Single-source media events become `media_only` watchlist with a 0.40
  corroboration weight and a further 0.5× positive-watchlist suppressor on
  positive direction — so they can flag context but barely move scoring.
- Local-media-only events contribute zero to scoring unless they're in the
  severe-risk allow-list.
- Cached events are dampened (0.75× official, 0.40× media, 0.20×
  local-media-only) and held to the tight positive caps.
- Pre-cap / post-cap deltas are both visible in the section so the dampening
  is auditable.

## Hard scoring boundaries

- **Base market value range is never altered** by locality intelligence,
  visual evidence, or the LLM. Only confidence, marketability, liquidity,
  TTL, and inspection-routing receive bounded effects.
- All effects sit inside global caps (positive: ±5% or ±8% with live
  official; negative: −8% / +15%; confidence ±0.04).
- LLM is **never** in the numeric path. It generates narrative only, sees
  only the structured payload, and its output is sanitised before display.

## Ollama is optional

The AI Brief degrades cleanly:

1. qwen2.5:7b primary (enhanced) — needs ~5–6 GB RAM (or a GPU).
2. llama3.2:3b fast/fallback — needs ~2–3 GB RAM.
3. Rule-based fallback — instant, labelled in the UI banner.

The deterministic decision is identical across all three paths. If Ollama
is missing or fails, you'll see *"Rule-based summary shown because local LLM
was unavailable or timed out"* — that's the system telling the truth, not a
bug.

## Vision is optional

The visual collateral evidence layer:

- Requires a complete 5-category standardised packet to score; partial =
  zero impact.
- Bounded effects: confidence ±0.06, valuation modifier ±0.05 (never moves
  the headline market value).
- Underlying detector is OWL-ViT zero-shot. It's good at geometric damage
  (cracks, broken walls), weak on textural concepts (seepage, water stains).
  A specialised property-damage model would slot in here in production.
- Capture-time security (GPS, tamper-proofing, role-of-uploader) is **assumed
  upstream** — PropScore consumes the standardised packet, doesn't produce it.

## Performance

- Vite production bundle is a single 728 KB JS chunk — fine for a local
  demo, would code-split for production.
- SQLite is single-writer; the unified `./data/propscore.sqlite` file is
  read-heavy in the demo flow and works comfortably.
- First Ollama call after Ollama starts is slow (model load); subsequent
  calls hit the warm model.
- Live RSS scraping is sequential per source; total wall-clock is bounded by
  the per-request timeout (8s) × source count.

## What this is not

- Not real bank infrastructure.
- Not a replacement for valuers / surveyors / inspectors.
- Not a price predictor — never claims any property's price.
- Not a regulatory submission tool.
- Not capable of bypassing manual review for genuinely complex cases.
