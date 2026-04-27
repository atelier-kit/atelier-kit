import { describe, expect, test, afterEach } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cmdV2Init } from "../src/commands/v2/init.js";
import { cmdV2New } from "../src/commands/v2/new.js";
import { cmdV2Approve, cmdV2Reject } from "../src/commands/v2/approve.js";
import { cmdV2Execute, cmdV2Next, cmdV2Done } from "../src/commands/v2/execute.js";
import { cmdV2Off } from "../src/commands/v2/off.js";
import { tempDir, kitPath } from "./helpers.js";
import type { EpicState } from "../src/protocol/schema.js";

describe("v2 approve / reject / execute", () => {
  let cleanup: () => Promise<void> = async () => {};
  afterEach(async () => {
    await cleanup();
    delete process.env.ATELIER_KIT_ROOT;
    // reset exitCode
    process.exitCode = 0;
  });

  async function setupWithPlan(mode: "quick" | "standard" = "quick") {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdV2Init(path, { yes: true });
    await cmdV2New(path, "Test Epic", { mode });

    // Inject slices and set awaiting_approval
    const statePath = join(path, ".atelier", "epics", "test-epic", "state.json");
    const state: EpicState = JSON.parse(await readFile(statePath, "utf8"));
    const updated: EpicState = {
      ...state,
      status: "awaiting_approval",
      approval: { status: "pending", approved_by: null, approved_at: null, notes: null },
      slices: [
        {
          id: "slice-001",
          title: "Add route",
          status: "ready",
          goal: "Expose the endpoint",
          depends_on: [],
          allowed_files: ["src/routes/**"],
          acceptance_criteria: ["Route exists and returns 200"],
          validation: ["Run request test"],
        },
        {
          id: "slice-002",
          title: "Add tests",
          status: "ready",
          goal: "Cover the endpoint",
          depends_on: ["slice-001"],
          allowed_files: ["test/**"],
          acceptance_criteria: ["Test suite passes"],
          validation: ["Run test suite"],
        },
      ],
    };
    await writeFile(statePath, JSON.stringify(updated, null, 2), "utf8");
    return path;
  }

  test("approve sets approval.status=approved and status=approved", async () => {
    const cwd = await setupWithPlan();
    await cmdV2Approve(cwd);
    const state: EpicState = JSON.parse(
      await readFile(join(cwd, ".atelier", "epics", "test-epic", "state.json"), "utf8"),
    );
    expect(state.approval.status).toBe("approved");
    expect(state.status).toBe("approved");
  });

  test("active.json updated to phase=approved after approve", async () => {
    const cwd = await setupWithPlan();
    await cmdV2Approve(cwd);
    const active = JSON.parse(await readFile(join(cwd, ".atelier", "active.json"), "utf8"));
    expect(active.active_phase).toBe("approved");
  });

  test("reject sets approval.status=rejected and status=planning", async () => {
    const cwd = await setupWithPlan();
    await cmdV2Reject(cwd, "Need smaller slices");
    const state: EpicState = JSON.parse(
      await readFile(join(cwd, ".atelier", "epics", "test-epic", "state.json"), "utf8"),
    );
    expect(state.approval.status).toBe("rejected");
    expect(state.status).toBe("planning");
    expect(state.approval.notes).toBe("Need smaller slices");
  });

  test("execute after approve sets status=execution and write_project_code=true", async () => {
    const cwd = await setupWithPlan();
    await cmdV2Approve(cwd);
    await cmdV2Execute(cwd);
    const state: EpicState = JSON.parse(
      await readFile(join(cwd, ".atelier", "epics", "test-epic", "state.json"), "utf8"),
    );
    expect(state.status).toBe("execution");
    expect(state.allowed_actions.write_project_code).toBe(true);
    expect(state.current_slice).toBe("slice-001");
    expect(state.active_skill).toBe("implementer");
  });

  test("execute without approval fails", async () => {
    const cwd = await setupWithPlan();
    // Don't approve - still pending
    await cmdV2Execute(cwd);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  test("done marks slice as done", async () => {
    const cwd = await setupWithPlan();
    await cmdV2Approve(cwd);
    await cmdV2Execute(cwd);
    await cmdV2Done(cwd);
    const state: EpicState = JSON.parse(
      await readFile(join(cwd, ".atelier", "epics", "test-epic", "state.json"), "utf8"),
    );
    const slice = state.slices.find((s) => s.id === "slice-001");
    expect(slice?.status).toBe("done");
  });

  test("next moves to slice-002 after slice-001", async () => {
    const cwd = await setupWithPlan();
    await cmdV2Approve(cwd);
    await cmdV2Execute(cwd);
    await cmdV2Next(cwd);
    const state: EpicState = JSON.parse(
      await readFile(join(cwd, ".atelier", "epics", "test-epic", "state.json"), "utf8"),
    );
    expect(state.current_slice).toBe("slice-002");
  });

  test("next when no more slices moves to review", async () => {
    const cwd = await setupWithPlan();
    await cmdV2Approve(cwd);
    await cmdV2Execute(cwd);
    await cmdV2Next(cwd); // -> slice-002
    await cmdV2Next(cwd); // -> review (no more ready slices)
    const state: EpicState = JSON.parse(
      await readFile(join(cwd, ".atelier", "epics", "test-epic", "state.json"), "utf8"),
    );
    expect(state.status).toBe("review");
    expect(state.current_slice).toBeNull();
    expect(state.active_skill).toBe("reviewer");
  });

  test("off deactivates Atelier and clears active epic", async () => {
    const cwd = await setupWithPlan();
    await cmdV2Off(cwd);
    const active = JSON.parse(await readFile(join(cwd, ".atelier", "active.json"), "utf8"));
    expect(active.active).toBe(false);
    expect(active.active_epic).toBeNull();
    expect(active.mode).toBe("native");
  });
});
