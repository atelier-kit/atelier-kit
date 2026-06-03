import { describe, expect, test } from "vitest";
import { parseWork } from "../src/work/parse.js";
import { slugify } from "../src/work/paths.js";
import { workTemplate } from "../src/work/template.js";
import { replaceReviewSection } from "../src/work/update.js";

const STANDARD = `# Work: Add healthz

## Mode

standard

## Plan

### Approach

Add a route.

### Slice 1 — healthz route

**Goal:** Add a /healthz route that returns 200 when the DB ping resolves.

**Allowed files:** \`src/server/routes.ts\`, \`test/routes/healthz.test.ts\`

**Acceptance criteria:**

- A request to /healthz returns 200 and ok when the database ping resolves.
- A request to /healthz returns 503 when the database ping rejects.

**Validation:**

- \`pnpm test test/routes/healthz.test.ts\`

## Risks

- _Pending._
`;

describe("work parser", () => {
  test("parses title, mode, and slices with all four fields", () => {
    const work = parseWork(STANDARD);
    expect(work.title).toBe("Add healthz");
    expect(work.mode).toBe("standard");
    expect(work.slices).toHaveLength(1);
    const slice = work.slices[0];
    expect(slice.id).toBe("slice-1");
    expect(slice.title).toBe("healthz route");
    expect(slice.goal).toContain("200");
    expect(slice.allowed_files).toEqual([
      "src/server/routes.ts",
      "test/routes/healthz.test.ts",
    ]);
    expect(slice.acceptance_criteria).toHaveLength(2);
    expect(slice.validation).toEqual(["pnpm test test/routes/healthz.test.ts"]);
  });

  test("quick mode has no slices", () => {
    const work = parseWork(workTemplate("Fix toast", "quick"));
    expect(work.mode).toBe("quick");
    expect(work.slices).toEqual([]);
  });

  test("skips the Approach subsection and template placeholders", () => {
    const work = parseWork(workTemplate("Demo", "standard"));
    // The template's sample slice has placeholder acceptance criteria, which
    // are dropped, but the backticked allowed_files path is kept.
    expect(work.slices).toHaveLength(1);
    expect(work.slices[0].acceptance_criteria).toEqual([]);
    expect(work.slices[0].validation).toEqual(["pnpm test"]);
  });

  test("slugify is filesystem-safe", () => {
    expect(slugify("Add /healthz endpoint!")).toBe("add-healthz-endpoint");
    expect(slugify("  Café update  ")).toBe("cafe-update");
  });

  test("replaceReviewSection rewrites only the Review section", () => {
    const updated = replaceReviewSection(STANDARD, "### Summary\n\n- ok");
    expect(updated).toContain("## Plan");
    expect(updated).toContain("## Review");
    expect(updated).toContain("### Summary");
    expect(updated.match(/## Review/g)).toHaveLength(1);
  });
});
