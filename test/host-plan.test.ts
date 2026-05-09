import { afterEach, describe, expect, test } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cmdInit } from "../src/commands/init.js";
import { cmdHostPlanFinalize, cmdHostPlanStart } from "../src/commands/host-plan.js";
import {
  readActiveState,
  readAtelierConfig,
  readEpicState,
  writeAtelierConfig,
  writeEpicState,
} from "../src/protocol/state.js";
import { tempDir, kitPath } from "./helpers.js";

const GOAL = "Migrate Python framework to PHP";
const EPIC_ID = "migrate-python-framework-to-php";

describe("host-native plan helpers", () => {
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

  async function writeReadyHostPlan(dir: string) {
    const config = await readAtelierConfig(dir);
    await writeAtelierConfig(dir, { ...config, adapter: "cursor" });

    const state = await readEpicState(dir, EPIC_ID);
    state.status = "planning";
    state.active_skill = "planner";
    state.tasks = state.tasks.map((task) => ({ ...task, status: "done" }));
    state.tasks = state.tasks.map((task) =>
      task.id === "plan" ? { ...task, status: "in_progress" } : task,
    );
    state.slices = [
      {
        id: "slice-001",
        title: "Migration shell",
        status: "ready",
        goal: "Create the migration shell",
        depends_on: [],
        allowed_files: ["src/**"],
        acceptance_criteria: ["The migration entrypoint exists"],
        validation: ["Run tests"],
      },
    ];
    await writeEpicState(dir, state);

    await writeFile(
      join(dir, ".atelier", "epics", EPIC_ID, "plan.md"),
      [
        "# Host-native plan",
        "",
        "## Goal",
        "",
        "Migrate the framework.",
        "",
        "## Risks",
        "",
        "| Risk | Impact | Mitigation |",
        "|---|---:|---|",
        "| Scope drift | Medium | Keep one migration slice |",
        "",
        "## Slices",
        "",
        "### Slice 1 - Migration shell",
        "",
        "**Goal:** Create the migration shell",
        "",
        "**Acceptance criteria:**",
        "",
        "- The migration entrypoint exists",
        "",
        "**Validation:**",
        "",
        "- Run tests",
        "",
      ].join("\n"),
      "utf8",
    );
  }

  test("start creates a normal V2 epic instead of a parallel planner state", async () => {
    const dir = await initialized();
    await cmdHostPlanStart(dir, GOAL);

    const active = await readActiveState(dir);
    const state = await readEpicState(dir, EPIC_ID);
    expect(active.active).toBe(true);
    expect(active.active_epic).toBe(EPIC_ID);
    expect(state.status).toBe("discovery");
    expect(state.active_skill).toBe("questioner");
  });

  test("finalize validates and preserves the host-authored plan", async () => {
    const dir = await initialized();
    await cmdHostPlanStart(dir, GOAL);
    await writeReadyHostPlan(dir);

    const before = await readFile(join(dir, ".atelier", "epics", EPIC_ID, "plan.md"), "utf8");
    await cmdHostPlanFinalize(dir);

    const active = await readActiveState(dir);
    const state = await readEpicState(dir, EPIC_ID);
    const after = await readFile(join(dir, ".atelier", "epics", EPIC_ID, "plan.md"), "utf8");
    const mirror = await readFile(join(dir, ".cursor", "plans", `${EPIC_ID}.md`), "utf8");
    expect(state.status).toBe("planned");
    expect(state.active_skill).toBe(null);
    expect(active.active_phase).toBe("planned");
    expect(after).toBe(before);
    expect(mirror).toContain("# Host-native plan");
  });

  test("finalize rejects an unreviewable plan", async () => {
    const dir = await initialized();
    await cmdHostPlanStart(dir, GOAL);
    await cmdHostPlanFinalize(dir);

    const state = await readEpicState(dir, EPIC_ID);
    expect(process.exitCode).toBe(1);
    expect(state.status).toBe("discovery");
  });
});
