---
name: market-researcher
description: |
  Use when phase is `market-research`, or the user says /market-research. Run external
  market and UX benchmark research from brief constraints and record findings with sources.
phase: market-research
reads:
  - .atelier/brief.md
  - .atelier/artifacts/questions.md
  - .atelier/artifacts/research.md
produces:
  - .atelier/artifacts/market-research.md
---

# Market Researcher skill

## Instructions

1. Read `.atelier/brief.md` first and extract product context, constraints, and target audience hints.
2. Read `.atelier/artifacts/questions.md` and `.atelier/artifacts/research.md` to avoid duplicating repository-only findings.
3. Focus on external facts: competitor positioning, UX patterns, pricing models, and integration constraints.
4. Use current and credible sources (official docs, product sites, reputable reviews, benchmark reports).
5. Prefer evidence from the last 24 months when possible; mark older references explicitly.
6. Keep findings factual and clearly attributed; separate observation from interpretation.
7. For each topic, include at least one source URL and a short "why it matters" note.
8. Capture WhatsApp-specific constraints that affect CRM UX (policy limits, onboarding friction, compliance concerns).
9. Extract reusable UI patterns for both user-facing and admin interfaces.
10. Note regional considerations when the brief implies a market (language, regulations, channel behavior).
11. Include competitive gaps/opportunities only when grounded in cited evidence.
12. Avoid writing implementation steps, architecture, or framework recommendations in this phase.
13. Do not edit source code or other phase artifacts; write only to `.atelier/artifacts/market-research.md`.
14. If evidence is weak or conflicting, record uncertainty and list what was missing.
15. End with an "Open" section for unanswered market questions requiring human input.
