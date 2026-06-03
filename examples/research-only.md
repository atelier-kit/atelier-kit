# Example — Research only (no implementation)

> User: "Before we commit to anything, figure out how feature flags work in this
> codebase and whether we can gate the new checkout on one. Use Atelier to research."

Sometimes the deliverable is understanding, not a diff. Run the researcher and
stop — the work file ends at `## Research`, with no plan or implementation.

```markdown
# Work: Feature-flag the new checkout

## Mode

standard

## Objective

Determine whether the new checkout flow can be gated behind an existing feature
flag, and what that would require. No implementation yet.

## Questions

### Blocking user questions

- None — this is investigation only.

### Repository research questions

- Is there a feature-flag system, and how are flags evaluated at request time?
- Are flags per-user, per-tenant, or global?

### External research questions

- Does the flag provider support percentage rollouts we might want later?

### Safe assumptions

- We can reuse the existing flag system rather than introduce a new one.

## Research

### Repository findings

- Flags are evaluated in `src/flags/evaluate.ts`, keyed by `tenantId`.
- `checkout.v2` is not yet defined; flags are declared in `config/flags.yaml`.
- Evaluation is synchronous and cached per request in `src/flags/context.ts`.

### External findings

- The provider supports percentage rollouts via the same SDK call, no new dependency.

### Risks

- Per-tenant granularity means we cannot do a per-user canary without changes to
  `evaluate.ts`.

### Open assumptions

- A new `checkout.v2` flag can be added to `config/flags.yaml` without a deploy
  of the flag service — to be confirmed before planning.
```

No `## Plan`, no slices, nothing to validate or review. When the user is ready to
build, the planner picks up from this research.
