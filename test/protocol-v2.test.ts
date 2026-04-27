import { afterEach, describe, expect, test } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { cmdInit } from "../src/commands/init.js";
import { cmdNew } from "../src/commands/new.js";
import { cmdApprove, cmdExecute } from "../src/commands/lifecycle.js";
import { readActiveState, readEpicState, writeEpicState } from "../src/protocol/state.js";
import { validateProtocol } from "../src/protocol/validator.js";
import { tempDir, kitPath } from "./helpers.js";

const execFileAsync = promisify(execFile);

describe("atelier v2 protocol", () => {
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

  test("new creates an active epic ledger", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });

    const active = await readActiveState(dir);
    expect(active.active).toBe(true);
    expect(active.active_epic).toBe("add-payment-endpoint");

    const state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.status).toBe("discovery");
    expect(state.allowed_actions.write_project_code).toBe(false);
    expect(await readFile(join(dir, ".atelier", "epics", state.epic_id, "plan.md"), "utf8")).toContain("Status: pending");
  });

  test("validate treats inactive state as native mode", async () => {
    const dir = await initialized();
    const report = await validateProtocol(dir);
    expect(report.ok).toBe(true);
    expect(report.active?.mode).toBe("native");
  });

  test("validate reports malformed state and incomplete slices", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });
    const state = await readEpicState(dir, "add-payment-endpoint");
    state.status = "awaiting_approval";
    state.active_skill = "planner";
    state.approval.status = "pending";
    const active = await readActiveState(dir);
    active.active_phase = "awaiting_approval";
    active.active_skill = "planner";
    await import("../src/protocol/state.js").then(({ writeActiveState }) => writeActiveState(dir, active));
    state.slices = [
      {
        id: "slice-001",
        title: "Route",
        status: "ready",
        goal: "Add the route",
        depends_on: [],
        allowed_files: ["src/**"],
        acceptance_criteria: [],
        validation: [],
      },
    ];
    await writeEpicState(dir, state);

    const report = await validateProtocol(dir);
    expect(report.ok).toBe(false);
    expect(report.errors.join("\n")).toMatch(/missing acceptance criteria/);
    expect(report.errors.join("\n")).toMatch(/missing validation steps/);
    expect(report.errors.join("\n")).toMatch(/before_execution/);
  });

  test("execute requires approval and a ready slice", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });
    let state = await readEpicState(dir, "add-payment-endpoint");
    state.status = "awaiting_approval";
    state.active_skill = "planner";
    state.approval.status = "pending";
    const active = await readActiveState(dir);
    active.active_phase = "awaiting_approval";
    active.active_skill = "planner";
    await import("../src/protocol/state.js").then(({ writeActiveState }) => writeActiveState(dir, active));
    state.slices = [
      {
        id: "slice-001",
        title: "Route",
        status: "ready",
        goal: "Add the route",
        depends_on: [],
        allowed_files: ["src/**"],
        acceptance_criteria: ["Route exists"],
        validation: ["Run route test"],
      },
    ];
    await writeEpicState(dir, state);

    await cmdApprove(dir, { by: "test" });
    await cmdExecute(dir);

    state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.status).toBe("execution");
    expect(state.approval.status).toBe("approved");
    expect(state.current_slice).toBe("slice-001");
    expect(state.allowed_actions.write_project_code).toBe(true);
  });

  test("premature code changes are violations before execution", async () => {
    const dir = await initialized();
    await execFileAsync("git", ["init"], { cwd: dir });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: dir });
    await execFileAsync("git", ["add", ".atelier"], { cwd: dir });
    await execFileAsync("git", ["commit", "-m", "baseline"], { cwd: dir });
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(join(dir, "src", "changed.ts"), "export {}\n", "utf8");

    const report = await validateProtocol(dir);
    expect(report.ok).toBe(false);
    expect(report.errors.join("\n")).toMatch(/premature project code change/);
  });
});
