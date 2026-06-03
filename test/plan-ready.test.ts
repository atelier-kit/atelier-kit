import { describe, expect, test } from "vitest";
import { parseWork } from "../src/work/parse.js";
import { planReady } from "../src/work/plan-ready.js";

function workWith(mode: string, planBody: string, risks = ""): string {
  return `# Work: T

## Mode

${mode}

## Plan

${planBody}
${risks ? `\n## Risks\n\n${risks}\n` : ""}`;
}

const GOOD_SLICE = `### Slice 1 — route

**Goal:** Add a /healthz route that returns 200 when the DB ping resolves.

**Allowed files:** \`src/server/healthz.ts\`

**Acceptance criteria:**

- A request to /healthz returns 200 and a status body when the ping resolves.

**Validation:**

- \`pnpm test\`
`;

describe("planReady (mode-scaled)", () => {
  test("quick mode is skipped (advisory)", () => {
    const r = planReady(parseWork(workWith("quick", GOOD_SLICE)));
    expect(r.skipped).toBe(true);
    expect(r.errors).toEqual([]);
  });

  test("standard mode passes a well-formed slice", () => {
    const r = planReady(parseWork(workWith("standard", GOOD_SLICE)));
    expect(r.errors, r.errors.join("\n")).toEqual([]);
    expect(r.skipped).toBe(false);
  });

  test("standard mode errors when there are no slices", () => {
    const r = planReady(parseWork(workWith("standard", "### Approach\n\njust prose")));
    expect(r.errors.join("\n")).toMatch(/no slices/i);
  });

  test("rejects catch-all allowed_files", () => {
    const slice = GOOD_SLICE.replace("`src/server/healthz.ts`", "`src/**`");
    const r = planReady(parseWork(workWith("standard", slice)));
    expect(r.errors.join("\n")).toMatch(/too broad/i);
  });

  test("warns on vague acceptance criteria", () => {
    const slice = GOOD_SLICE.replace(
      "- A request to /healthz returns 200 and a status body when the ping resolves.",
      "- It works.",
    );
    const r = planReady(parseWork(workWith("standard", slice)));
    expect(r.warnings.join("\n")).toMatch(/vague/i);
  });

  test("deep mode requires a populated Risks section", () => {
    const empty = planReady(parseWork(workWith("deep", GOOD_SLICE, "_None._")));
    expect(empty.errors.join("\n")).toMatch(/Risks/);
    const filled = planReady(
      parseWork(workWith("deep", GOOD_SLICE, "- Backfill may corrupt single-token names.")),
    );
    expect(filled.errors, filled.errors.join("\n")).toEqual([]);
  });
});
