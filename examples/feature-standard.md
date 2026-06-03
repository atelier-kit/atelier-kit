# Example — Standard mode feature

> User: "Add a `/healthz` endpoint that reports DB connectivity. Use Atelier."

Standard mode: multiple files and real behavior, so research and a sliced plan
come before code. One file, `.atelier/work/healthz-endpoint.md`:

```markdown
# Work: Add /healthz endpoint

## Mode

standard

## Objective

Expose `GET /healthz` returning 200 when the database is reachable and 503 when
it is not, with a small JSON body.

## Questions

### Blocking user questions

- None — behavior is well specified.

### Repository research questions

- Where are routes registered, and what is the existing handler style?
- Is there a DB health/ping helper already?

### External research questions

- None.

### Safe assumptions

- JSON body shape can follow the existing error envelope.

## Research

### Repository findings

- Routes are registered in `src/server/routes.ts` via `app.get(...)`.
- `src/db/pool.ts` exports `ping()` that resolves or throws.
- Handler tests live in `test/routes/*.test.ts` and use `supertest`.

### External findings

- None needed.

## Plan

### Approach

Add one route that calls `ping()` and maps success/failure to 200/503.

### Slice 1 — healthz route

**Goal:** Add a `/healthz` route that returns 200 with `{status:"ok"}` when
`ping()` resolves and 503 with `{status:"down"}` when it rejects.

**Allowed files:** `src/server/routes.ts`, `src/server/healthz.ts`, `test/routes/healthz.test.ts`

**Acceptance criteria:**

- A request to `/healthz` returns 200 and `{status:"ok"}` when the database ping resolves.
- A request to `/healthz` returns 503 and `{status:"down"}` when the database ping rejects.

**Validation:**

- `pnpm test test/routes/healthz.test.ts`

## Implementation

### Slice 1 — done

- Added `src/server/healthz.ts` and wired it in `routes.ts`.
- Added `test/routes/healthz.test.ts` with the two cases above.

## Validation

- `pnpm test test/routes/healthz.test.ts` — 2 passing.

## Review

_Filled by `atelier review`._
```

`atelier validate` passes the contract (specific allowed files, observable
criteria, a runnable command). After implementing, `atelier review` diffs the
changes against the slice and writes `## Review`.
