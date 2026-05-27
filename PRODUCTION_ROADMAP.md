# PropScore Production Readiness Roadmap

## Executive Status

PropScore is a strong hackathon-final prototype of a collateral intelligence platform for property-backed lending. It demonstrates the full underwriting workflow in one seeded Mumbai market:

- Stage 1 intake normalization and locality bucket assignment
- Stage 2 deterministic anomaly and verification screening
- Valuation, distress value, liquidity, and time-to-liquidate estimates
- Historical collateral reliability
- Portfolio concentration and LTV adjustment
- Optional local AI underwriter summary with a deterministic scoring boundary
- Audit Pack export for traceability and judge/demo review

This repository should be presented as an industry-grade prototype with production architecture direction, not as a fully deployed bank-grade system. That honesty makes the product more credible.

## What Is Production-Strong Today

- Deterministic numeric decisioning: valuation, risk flags, confidence, LTV, portfolio risk, and liquidity are computed outside the LLM.
- Clear LLM boundary: Ollama explains structured outputs and recommends evidence; it does not create scores.
- SQLite-backed local data foundation: locality, market norms, circle-rate style references, historical cases, and portfolio exposure are queryable.
- Demo resilience: frontend fallbacks keep the case workflow usable when SQLite, vision, or Ollama are unavailable.
- Traceability: the Audit Pack shows source quality, review flags, evidence requirements, and deterministic/AI separation.
- Local-first story: the design supports on-premise deployment for lenders with data localization concerns.

## Current Limitations To State Clearly

- Mumbai-only seeded reference data; no pan-India live data coverage yet.
- Circle-rate and market norms are demo/reference data, not official live feeds.
- No lender authentication, RBAC, tenant isolation, or production identity provider yet.
- No persistent collaborative review workflow or case assignment queue yet.
- Vision model support exists, but fraud detection layers such as pHash/CLIP duplicate search are still prototype-level.
- No calibrated ML valuation model trained on lender historical outcomes in the deployed demo path.
- No formal model evaluation, calibration dashboard, or drift monitoring yet.
- No production deployment automation with observability, backups, secrets management, and SLO dashboards yet.

## Highest-Impact Path To Production

### Phase 1: Enterprise Trust Foundation

- Add authentication, RBAC, organization/branch scoping, and audit identity on every decision event.
- Persist complete case lifecycle: draft, submitted, evidence requested, reviewer assigned, approved, rejected, archived.
- Store immutable audit logs for every rule contribution and evidence artifact.
- Add report exports for credit committee packets: JSON first, then PDF with signed metadata.
- Introduce environment-specific configuration and secret management.

### Phase 2: Data Coverage And Calibration

- Replace seeded reference data with versioned data ingestion:
  - official circle-rate/government rate sources
  - listing feeds and transaction comparables
  - lender historical repayment/default/recovery data
  - maps/POI/hazard/regulatory layers
- Add source freshness, provenance, confidence, and coverage metrics to every market bucket.
- Calibrate valuation and liquidity estimates against lender historical outcomes.
- Track valuation error, recovery ratio error, liquidation-day error, and decision override rates.

### Phase 3: AI/ML Hardening

- Keep deterministic scoring as the system of record.
- Add structured-output validation and regression tests for every AI summary field.
- Evaluate prompts against adversarial cases, missing evidence, and prompt-injection strings in address/notes fields.
- Introduce model-quality tiers: rule fallback, fast local model, enhanced local model.
- Add latency budgets and caching for repeated underwriter summaries.
- Add offline evaluation datasets for historical similarity, anomaly scoring, and summary usefulness.

### Phase 4: Production Platform

- Move from local SQLite demo mode to a managed relational database for multi-user deployment.
- Add background workers for heavy jobs: report generation, vision analysis, ingestion, batch valuation.
- Add API idempotency keys, request tracing, structured logs, metrics, and alerting.
- Add object storage for images/documents with malware scanning and signed access.
- Add rate limiting, payload limits, and safe remote image fetching policies.
- Add backup/restore runbooks and deployment health checks.

### Phase 5: Workflow And Collaboration

- Add underwriter queues, reviewer comments, evidence requests, SLA timers, and final approval notes.
- Add branch/region dashboards for portfolio exposure and policy breaches.
- Add admin controls for policy caps, LTV policy, rule thresholds, and data-source status.
- Add explainability views for credit committee and model-risk teams.

## Demo Positioning For Judges

Lead with the real value:

1. PropScore does not stop at price. It answers whether collateral is normal, liquid, reliable, and portfolio-safe.
2. Numeric outputs are deterministic and auditable. AI is used only for underwriter explanation.
3. The one-city Mumbai scope is intentional: it shows a complete local-market workflow instead of a shallow national mock.
4. The Audit Pack makes the system reviewable by credit, risk, engineering, and compliance stakeholders.
5. The production roadmap is explicit about data, security, collaboration, and model governance gaps.

## Judge Questions And Strong Answers

**Is this a valuation model or an underwriting assistant?**

It is a collateral intelligence assistant. It estimates value, but its stronger differentiator is combining value with liquidity, historical reliability, evidence requirements, and portfolio concentration risk.

**Can the LLM hallucinate a score?**

No numeric score from the LLM is accepted as a system output. The LLM receives structured deterministic outputs and returns explanation-only JSON. If it fails, a rule-based fallback summary is used.

**Is this production-ready for a bank tomorrow?**

Not yet. It is a credible prototype with production-minded architecture. The next production gates are identity/RBAC, real data ingestion, persistent case workflow, model calibration, observability, and formal security controls.

**Why is the dataset only Mumbai?**

A complete one-city workflow is more valuable than a fake national map. Collateral risk is hyperlocal, so the product proves the workflow where local norms, liquidity, historical cases, and portfolio concentration can be shown end to end.

## North Star

World-class PropScore should become the system of record for collateral review: every value estimate traceable, every risk flag explainable, every AI summary bounded, every evidence request actionable, and every new loan evaluated against both asset-level and portfolio-level risk.
