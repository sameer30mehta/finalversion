# Project Summary

## What Was Built

PropScore is a hackathon implementation of a collateral valuation and liquidity intelligence platform for property-backed lending. It combines deterministic valuation, verification, historical reliability, portfolio concentration, and explanation-only AI underwriter summaries in one lender-facing workflow.

## Core Innovation

Most collateral tools stop at an estimated market value. PropScore adds the surrounding credit-risk context a bank or NBFC needs:

- Is the submitted property profile locally normal?
- How liquid is the collateral likely to be?
- How confident should the lender be in the valuation?
- What happened in similar historical collateral cases?
- Does the lender already hold too much exposure to this location/type bucket?
- What evidence should the underwriter request next?

## Implementation Status

The project is implemented as:

- React/Vite frontend dashboard
- FastAPI backend
- Local SQLite database
- Local Ollama explanation layer
- Rule-based fallback paths when local services are unavailable

The current scope is a one-city Mumbai seeded implementation intended to demonstrate the complete workflow end to end.

## What Is Database-Backed

- Stage 1 locality and bucket context from `locality_master`
- Stage 2 market norms from `market_norms`
- Circle-rate style references from `circle_rate_master`
- Historical similar cases from `historical_cases`
- Portfolio exposure from `portfolio_exposure`
- Case, valuation, audit, and geocode storage shapes

## What Is Deterministic

All numeric and decisioning outputs are deterministic:

- Normalization and bucket assignment
- Data sufficiency score
- Anomaly score
- Suspicion score
- Market value and distress value
- Resale/liquidity score
- Time-to-liquidate
- Confidence score and bounded historical adjustment
- Portfolio risk score
- Recommended LTV adjustment
- Senior review trigger

## What Ollama Does

Ollama only explains already-computed structured outputs. It produces:

- Executive underwriter summary
- Key strengths and risks
- Evidence recommendations
- Review route wording
- Suggested lender action wording

Ollama does not compute valuation, confidence, anomaly, suspicion, portfolio risk, LTV, or flags. If Ollama is unavailable, a rule-based fallback summary is returned.

## Why Mumbai One-City Scope

Mumbai was chosen to keep the implementation realistic while still showing locality-sensitive valuation, market norms, liquidity variation, historical reliability, and portfolio exposure. A one-city SQLite-backed system is easier for judges to run locally and evaluate end to end.

## Impact for Banks and NBFCs

PropScore can help lenders move from a single collateral value to a fuller collateral intelligence view:

- Faster underwriter triage
- More consistent collateral review
- Better evidence requests
- Clearer uncertainty handling
- Portfolio-aware LTV decisions
- Audit-safe separation between deterministic scoring and AI explanation
