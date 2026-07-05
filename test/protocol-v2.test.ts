import { afterEach, describe, expect, test } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cmdInit } from "../src/commands/init.js";
import { cmdNew } from "../src/commands/new.js";
import { cmdDone, cmdNext } from "../src/commands/lifecycle.js";
import { cmdReview } from "../src/commands/review.js";
import { exportActivePlan } from "../src/commands/export-plan.js";
import {
  readActiveState,
  readAtelierConfig,
  readEpicState,
  writeActiveState,
  writeAtelierConfig,
  writeEpicState,
} from "../src/protocol/state.js";
import { validateProtocol } from "../src/protocol/validator.js";
import { tempDir, kitPath } from "./helpers.js";

describe("atelier planning protocol", () => {
  let cleanup: () => Promise<void> = async () => {};

  afterEach(async () => {
    await cleanup();
    delete process.env.ATELIER_KIT_ROOT;
    process.exitCode = 0;
  });

  async function initialized() {
    const tmp = await tempDir();
    cleanup = tmp.cleanup;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdInit(tmp.path, { yes: true });
    return tmp.path;
  }

  async function readyPlanningTask(dir: string) {
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });
    const config = await readAtelierConfig(dir);
    await writeAtelierConfig(dir, { ...config, adapter: "cursor" });
    const state = await readEpicState(dir, "add-payment-endpoint");
    state.tasks = state.tasks.map((task) =>
      task.id === "plan" ? { ...task, status: "in_progress" as const } : task,
    );
    state.slices = [
      {
        id: "slice-001",
        title: "Route",
        status: "ready",
        goal: "Add the route",
        depends_on: [],
        allowed_files: ["src/**"],
        acceptance_criteria: ["Route works"],
        validation: ["Run tests"],
      },
    ];
    await writeEpicState(dir, state);
    await writeActiveState(dir, {
      active: true,
      mode: "atelier",
      active_epic: state.epic_id,
      active_phase: state.status,
      active_skill: state.active_skill,
      updated_at: new Date().toISOString(),
    });
    await writeFile(
      join(dir, ".atelier", "epics", state.epic_id, "plan.md"),
      [
        "# Plan: Add payment endpoint",
        "",
        "## Goal",
        "",
        "Add the payment endpoint.",
        "",
        "## Research Notes",
        "",
        "- Route handlers live in src/routes; the new endpoint will be created there.",
        "",
        "## Risks",
        "",
        "| Risk | Impact | Mitigation |",
        "|---|---:|---|",
        "| Scope drift | Medium | Keep the slice small |",
        "",
        "## Slices",
        "",
        "### Slice 1 - Route",
        "",
        "**Goal:** Add the route",
        "",
        "**Allowed files:**",
        "",
        "- src/**",
        "",
        "**Acceptance criteria:**",
        "",
        "- Route works",
        "",
        "**Validation:**",
        "",
        "- Run tests",
        "",
      ].join("\n"),
      "utf8",
    );
  }

  test("new creates an active planning ledger", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "standard" });

    const active = await readActiveState(dir);
    const state = await readEpicState(dir, "add-payment-endpoint");
    expect(active.active).toBe(true);
    expect(state.status).toBe("discovery");
    expect(state.active_skill).toBe("questioner");
  });

  test("quick mode skips research and starts at planning", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });

    const state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.status).toBe("planning");
    expect(state.active_skill).toBe("planner");
    expect(state.required_artifacts).toEqual(["plan.md", "review.md"]);
    expect(state.tasks.map((task) => task.id)).toEqual(["plan"]);
  });

  test("next and done advance planning tasks", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "standard" });

    await cmdNext(dir);
    let state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.tasks.find((task) => task.id === "questions")?.status).toBe("in_progress");

    const researchPath = join(dir, ".atelier", "epics", state.epic_id, "research.md");
    const research = await readFile(researchPath, "utf8");
    await writeFile(
      researchPath,
      research.replace(
        /## Questions[\s\S]*?(?=\n## )/,
        "## Questions\n\n- Does the payments provider expose an idempotency key?\n\n",
      ),
      "utf8",
    );
    await cmdDone(dir);
    state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.tasks.find((task) => task.id === "research")?.status).toBe("in_progress");
    expect(state.active_skill).toBe("researcher");
  });

  test("done finalizes planning as planned and exports native mirror", async () => {
    const dir = await initialized();
    await readyPlanningTask(dir);

    await cmdDone(dir);

    const state = await readEpicState(dir, "add-payment-endpoint");
    const mirror = await readFile(join(dir, ".cursor", "plans", "add-payment-endpoint.md"), "utf8");
    expect(state.status).toBe("planned");
    expect(state.active_skill).toBe(null);
    expect(mirror).toContain("# Plan: Add payment endpoint");
  });

  test("export-plan can mirror a planned epic manually", async () => {
    const dir = await initialized();
    await readyPlanningTask(dir);
    await cmdDone(dir);

    const result = await exportActivePlan(dir, {
      adapter: "cursor",
      path: "{cwd}/native/{epic_id}.md",
      ifPlanned: true,
    });

    expect(result.skipped).toBe(false);
    expect(await readFile(result.path, "utf8")).toContain("Generated by atelier-kit");
  });

  test("review creates a review artifact after native implementation", async () => {
    const dir = await initialized();
    await readyPlanningTask(dir);
    await cmdDone(dir);
    await writeFile(join(dir, "implementation.txt"), "native implementation\n", "utf8");

    await cmdReview(dir);

    const state = await readEpicState(dir, "add-payment-endpoint");
    const review = await readFile(join(dir, ".atelier", "epics", state.epic_id, "review.md"), "utf8");
    expect(state.status).toBe("review");
    expect(state.active_skill).toBe("reviewer");
    expect(review).toContain("Plan Checklist");
  });

  test("validate accepts planned state with a reviewable plan", async () => {
    const dir = await initialized();
    await readyPlanningTask(dir);
    await cmdDone(dir);

    const report = await validateProtocol(dir);
    expect(report.errors, report.errors.join("\n")).toHaveLength(0);
    expect(report.ok).toBe(true);
  });
});
