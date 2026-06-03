import type { Mode } from "./types.js";

/**
 * The single artifact per work item. `quick` is deliberately tiny (no plan, no
 * gate); `standard`/`deep` carry the slice contract under `## Plan`.
 */
export function workTemplate(title: string, mode: Mode): string {
  if (mode === "quick") {
    return `# Work: ${title}

## Mode

quick

## Objective

_What needs to be achieved._

## Change

_What you changed._

## Validation

_How you checked it (commands run, manual checks)._
`;
  }

  const deepExtras =
    mode === "deep"
      ? `
## Risks

- _Pending — deep mode requires real risks here._
`
      : "";

  return `# Work: ${title}

## Mode

${mode}

## Objective

_What needs to be achieved._

## Questions

### Blocking user questions

- _Only questions that block a decision. None? Say so._

### Repository research questions

- _What to learn from the codebase before changing it._

### External research questions

- _What to verify in external docs/APIs._

### Safe assumptions

- _Assumptions safe enough to proceed on without asking._

## Research

### Repository findings

- _Pending._

### External findings

- _Pending._

## Plan

### Approach

_How the change will be made and why._

### Slice 1 — First slice

**Goal:** _A goal that can be implemented and tested end to end._

**Allowed files:** \`path/to/file.ts\`

**Acceptance criteria:**

- _An observable condition (>=8 words; avoid "works"/"is correct")._

**Validation:**

- \`pnpm test\`
${deepExtras}
## Implementation

_Log each slice as you implement it: status, what changed, validation, notes._

## Validation

_Tests run, manual checks, what was not validated._

## Decisions

_Record significant decisions: context, decision, reason, consequences._

## Review

_Filled by \`atelier review\`._
`;
}
