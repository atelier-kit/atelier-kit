import { afterEach, describe, expect, test } from "vitest";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cmdInit } from "../src/commands/init.js";
import { cmdNew } from "../src/commands/new.js";
import { readEpicState } from "../src/protocol/state.js";
import { validateResearchReady } from "../src/protocol/validator.js";
import { outOfScopeFiles } from "../src/commands/review.js";
import { tempDir, kitPath } from "./helpers.js";

describe("research-ready gate", () => {
  let cleanup: () => Promise<void> = async () => {};

  afterEach(async () => {
    await cleanup();
    delete process.env.ATELIER_KIT_ROOT;
    process.exitCode = 0;
  });

  async function standardEpic() {
    const tmp = await tempDir();
    cleanup = tmp.cleanup;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdInit(tmp.path, { yes: true });
    await cmdNew(tmp.path, "Add payment endpoint", { mode: "standard" });
    return tmp.path;
  }

  test("fails on the untouched research stub", async () => {
    const dir = await standardEpic();
    const state = await readEpicState(dir, "add-payment-endpoint");

    const { errors } = await validateResearchReady(dir, state);

    expect(errors).toContain("research.md still has _Pending._ sections");
    expect(errors).toContain(
      "research.md ## Questions still contains only the generic seed questions",
    );
  });

  test("passes on completed sections and warns above the line budget", async () => {
    const dir = await standardEpic();
    const state = await readEpicState(dir, "add-payment-endpoint");
    const research = [
      "# Research: Add payment endpoint",
      "",
      "## Questions",
      "",
      "- Does the payments provider expose an idempotency key?",
      "",
      "## Codebase",
      "",
      "- Route handlers live in src/routes/payments.ts.",
      "",
      "## Constraints",
      "",
      "- provider-sdk@4 requires Node >= 20 (package.json).",
      "",
      "## What exists vs what will be created",
      "",
      "- Exists: src/routes. Created: src/routes/payments.ts.",
      "",
      "## Open unknowns",
      "",
      "- Webhook retry policy.",
    ].join("\n");
    await writeFile(join(dir, ".atelier", "epics", "add-payment-endpoint", "research.md"), research, "utf8");

    const ok = await validateResearchReady(dir, state);
    expect(ok.errors).toEqual([]);
    expect(ok.warnings).toEqual([]);

    await writeFile(
      join(dir, ".atelier", "epics", "add-payment-endpoint", "research.md"),
      `${research}\n${"- filler evidence line\n".repeat(320)}`,
      "utf8",
    );
    const oversized = await validateResearchReady(dir, state);
    expect(oversized.errors).toEqual([]);
    expect(oversized.warnings.length).toBe(1);
    expect(oversized.warnings[0]).toContain("budget");
  });

  test("rejects quick mode, where research lives inline in plan.md", async () => {
    const tmp = await tempDir();
    cleanup = tmp.cleanup;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdInit(tmp.path, { yes: true });
    await cmdNew(tmp.path, "Small fix", { mode: "quick" });
    const state = await readEpicState(tmp.path, "small-fix");

    const { errors } = await validateResearchReady(tmp.path, state);

    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("quick mode has no research.md");
  });
});

describe("review scope check", () => {
  test("flags changed files outside allowed_files and ignores pre-planned paths", () => {
    const outOfScope = outOfScopeFiles({
      changed: [
        "src/routes/payments.ts",
        "src/lib/util.ts",
        "docs/notes.md",
        ".atelier/epics/x/state.json",
      ],
      allowed: ["src/routes/**", "src/lib/*.ts"],
      ignored: [".atelier/**"],
    });

    expect(outOfScope).toEqual(["docs/notes.md"]);
  });

  test("skips the check when no allowed_files are recorded (legacy plans)", () => {
    expect(
      outOfScopeFiles({ changed: ["anything.ts"], allowed: [], ignored: [] }),
    ).toEqual([]);
  });
});
