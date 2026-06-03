# Example — Deep mode migration

> User: "Split the `name` column into `first_name`/`last_name` across the API and
> DB. Use Atelier in deep mode."

Deep mode: data change with production impact, so it adds explicit design and a
populated `## Risks` section, and the contract is enforced strictly. Excerpt of
`.atelier/work/split-name-column.md`:

```markdown
# Work: Split name column

## Mode

deep

## Objective

Replace `users.name` with `first_name` and `last_name` without downtime or data loss.

## Questions

### Blocking user questions

- Is a backfill heuristic (split on first space) acceptable for legacy rows?

### Repository research questions

- Which queries and serializers read `users.name`?

### Safe assumptions

- The API can return both old `name` (computed) and new fields during transition.

## Research

### Repository findings

- `users.name` is read in `src/users/repo.ts` and serialized in `src/users/dto.ts`.
- Migrations use `knex` under `migrations/`.

## Plan

### Approach

Expand-and-contract: add columns + backfill, dual-write, switch reads, then drop.

### Slice 1 — add columns and backfill

**Goal:** Add nullable `first_name`/`last_name` and backfill from `name` by
splitting on the first space, keeping `name` intact.

**Allowed files:** `migrations/**`, `src/users/repo.ts`, `test/users/migration.test.ts`

**Acceptance criteria:**

- After migration, every existing row has non-null `first_name` derived from `name`.
- The original `name` column is unchanged and still readable by current code.

**Validation:**

- `pnpm test test/users/migration.test.ts`

### Slice 2 — dual-write and switch reads

**Goal:** Write both representations on update and read from the new columns in
the serializer, computing `name` for backward compatibility.

**Allowed files:** `src/users/repo.ts`, `src/users/dto.ts`, `test/users/dto.test.ts`

**Acceptance criteria:**

- Updating a user persists `first_name`/`last_name` and a consistent computed `name`.
- The API response still includes a `name` field equal to "first last".

**Validation:**

- `pnpm test test/users/dto.test.ts`

## Risks

- Backfill split is wrong for single-token or multi-space names; mitigate by
  leaving `last_name` empty and logging counts for manual review.
- Dual-write drift if a code path bypasses the repo; mitigate by routing all
  writes through `repo.ts` and asserting it in tests.

## Review

_Filled by `atelier review`._
```

Because mode is `deep`, `atelier validate` also requires the real `## Risks`
section, and `atelier review` exits non-zero if the diff touches files outside
the slices' `allowed_files`.
