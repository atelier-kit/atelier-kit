import { afterEach, describe, expect, test } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { cmdInit } from "../src/commands/init.js";
import { cmdNew } from "../src/commands/new.js";
import {
  cmdApprove,
  cmdDone,
  cmdExecute,
  cmdPause,
} from "../src/commands/lifecycle.js";
import {
  readActiveState,
  readEpicState,
  writeActiveState,
  writeEpicState,
} from "../src/protocol/state.js";
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

  async function makeApprovalReady(dir: string, options?: { slices?: number }) {
    let state = await readEpicState(dir, "add-payment-endpoint");
    state.status = "awaiting_approval";
    state.active_skill = "planner";
    state.approval.status = "pending";
    const sliceCount = options?.slices ?? 1;
    state.slices = Array.from({ length: sliceCount }, (_, index) => ({
      id: `slice-${String(index + 1).padStart(3, "0")}`,
      title: `Slice ${index + 1}`,
      status: "ready" as const,
      goal: `Implement slice ${index + 1}`,
      depends_on: index === 0 ? [] : [`slice-${String(index).padStart(3, "0")}`],
      allowed_files: ["src/**"],
      acceptance_criteria: [`Slice ${index + 1} works`],
      validation: [`Run slice ${index + 1} test`],
    }));
    await writeEpicState(dir, state);
    await writeFile(
      join(dir, ".atelier", "epics", state.epic_id, "plan.md"),
      [
        `# Plan: ${state.title}`,
        "",
        "## Goal",
        "",
        state.goal,
        "",
        "## Mode",
        "",
        state.mode,
        "",
        "## Evidence Summary",
        "",
        "### Repository Evidence",
        "",
        "- Repository evidence is available.",
        "",
        "### Technical Evidence",
        "",
        "- Technical constraints are documented.",
        "",
        "### Business / Product Evidence",
        "",
        "- Acceptance criteria are documented.",
        "",
        "## Assumptions",
        "",
        "- Existing project conventions remain valid.",
        "",
        "## Risks",
        "",
        "| Risk | Impact | Mitigation |",
        "|---|---:|---|",
        "| Scope drift | Medium | Execute one approved slice at a time |",
        "",
        "## Slices",
        "",
        ...state.slices.flatMap((slice, index) => [
          `### Slice ${index + 1} — ${slice.title}`,
          "",
          `**Goal:** ${slice.goal}`,
          "",
          "**Allowed files:**",
          "",
          ...slice.allowed_files.map((file) => `- \`${file}\``),
          "",
          "**Acceptance criteria:**",
          "",
          ...slice.acceptance_criteria.map((item) => `- ${item}`),
          "",
          "**Validation:**",
          "",
          ...slice.validation.map((item) => `- ${item}`),
          "",
        ]),
        "## Approval",
        "",
        "Status: pending",
        "",
        "Human approval required before implementation.",
        "",
      ].join("\n"),
      "utf8",
    );

    const active = await readActiveState(dir);
    active.active_phase = "awaiting_approval";
    active.active_skill = "planner";
    await writeActiveState(dir, active);
    return state;
  }

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
    await writeActiveState(dir, active);
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
    expect(report.errors.join("\n")).not.toMatch(/before_execution/);
  });

  test("awaiting approval with pending approval is valid when plan and slices are complete", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });
    await makeApprovalReady(dir);

    const report = await validateProtocol(dir);
    expect(report.errors, report.errors.join("\n")).toHaveLength(0);
    expect(report.ok).toBe(true);
  });

  test("approve requires awaiting approval and a reviewable before_approval gate", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });

    await cmdApprove(dir, { by: "test" });
    let state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.approval.status).toBe("none");

    await makeApprovalReady(dir);
    await cmdApprove(dir, { by: "test" });
    state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.status).toBe("approved");
    expect(state.approval.status).toBe("approved");
  });

  test("execute requires approval and a ready slice", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });
    let state = await makeApprovalReady(dir);

    await cmdApprove(dir, { by: "test" });
    await cmdExecute(dir);

    state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.status).toBe("execution");
    expect(state.approval.status).toBe("approved");
    expect(state.current_slice).toBe("slice-001");
    expect(state.allowed_actions.write_project_code).toBe(true);
  });

  test("done advances to the next ready slice without invalid execution state", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });
    await makeApprovalReady(dir, { slices: 2 });
    await cmdApprove(dir, { by: "test" });
    await cmdExecute(dir);
    await cmdDone(dir);

    const state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.status).toBe("execution");
    expect(state.current_slice).toBe("slice-002");
    expect(state.slices[0]?.status).toBe("done");
    expect(state.slices[1]?.status).toBe("executing");
  });

  test("pause disables active interference while preserving the epic", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });

    await cmdPause(dir);

    const active = await readActiveState(dir);
    const state = await readEpicState(dir, "add-payment-endpoint");
    expect(active.active).toBe(false);
    expect(active.mode).toBe("native");
    expect(active.active_epic).toBe("add-payment-endpoint");
    expect(active.active_phase).toBe("paused");
    expect(state.status).toBe("paused");
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
