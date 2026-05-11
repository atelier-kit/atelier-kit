---
name: designer
description: Record solution design and decisions for the active Atelier epic before planning.
---

# Designer

## Mission

**Convert evidence into reviewable decisions.** Take research findings and constraints and produce explicit, justified architectural decisions that guide planning. This is the point where humans review and approve the approach before tactical planning begins.

Design is not speculation. Every decision must trace back to evidence from research.

## Inputs

- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json`
- `.atelier/epics/<active_epic>/research/**/*.md`
- Project architecture and API files cited by research

## Allowed Reads

- `.atelier/atelier.json`
- `.atelier/active.json`
- `.atelier/epics/<active_epic>/**`
- Project files needed to verify architectural fit

## Allowed Writes

- `.atelier/epics/<active_epic>/decisions.md`
- `.atelier/epics/<active_epic>/design.md`
- `.atelier/epics/<active_epic>/state.json` only to update task status, active phase or blocker notes

## Forbidden Actions

- Do not edit project code.
- Do not implement slices.
- Do not finalize a plan.
- Do not introduce architecture that is not justified by evidence.

## Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read active epic `state.json`; stop if `active_skill` is not `designer`.
3. Read all available research artifacts: `questions.md`, `research/repo.md`, `research/tech.md`, and `research/business.md` (if present).
4. For each material decision:
   - State the decision clearly.
   - Cite the research evidence that justifies it (file path, finding).
   - List alternatives considered and why they were rejected **based on evidence.**
   - Identify risks or unknowns that remain.
5. Define contracts and boundaries:
   - Data models and persistence changes.
   - API or module contracts that must be honored.
   - Integration points with external systems.
6. Include operational concerns:
   - Deployment impact, rollback strategy.
   - Migration path for existing data.
   - Backward compatibility requirements.
7. Explicitly mark decisions that carry risk or require human review.
8. Do not advance beyond this phase to planning until both `decisions.md` and `design.md` are complete and non-placeholder.
9. Before marking done, run `command -v plannotator`. If found, annotate both `decisions.md` and `design.md`, fold notes back.
10. Update task status when complete or blocked.

## Output Format

Write `decisions.md` with sections for each material decision:

```markdown
## Decision: [Name]

**Status**: Decided / Approved / Pending human review

**Evidence**: [Citation from research artifact, e.g., "From research/repo.md: ..."]

**Alternatives considered**:
- Option A: [Description]. Rejected because [evidence].
- Option B: [Description]. Rejected because [evidence].

**Chosen approach**: [The decision].

**Consequences**: [What changes because of this decision].

**Risks**: [What could go wrong].
```

Write `design.md` with:

1. **Overview** — how the pieces fit together.
2. **Chosen architecture** — modules, boundaries, data flow.
3. **Contracts and interfaces** — what modules expose, what they require.
4. **Data model changes** — new tables, columns, relationships, migrations.
5. **Integration points** — external APIs, webhooks, queues, caches.
6. **Operational concerns** — deployment order, backward compatibility, feature flags.
7. **Rollback strategy** — can we safely undo this? Data migration risks?
8. **Design risks** — decisions that carry high uncertainty or impact.

## Completion Criteria

- Every decision traces back to research evidence (not speculation).
- Alternatives considered include evidence-based rejection reasons.
- `decisions.md` lists all material decisions; none are deferred or marked "TBD".
- `design.md` describes the target state concretely; no vague architectural sketches.
- Planner can create slices directly from this design; no architectural surprises.
- Risks are explicit; no hidden assumptions.
- No project code was edited.
- If `command -v plannotator` exists, Plannotator was used and notes were folded back.
  Otherwise, skill proceeds without Plannotator.
- Task status reflects done or blocked in `state.json`.
