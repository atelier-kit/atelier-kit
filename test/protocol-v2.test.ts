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
  cmdNext,
  cmdPause,
  cmdResume,
} from "../src/commands/lifecycle.js";
import {
  readActiveState,
  readEpicState,
  writeActiveState,
  writeEpicState,
} from "../src/protocol/state.js";
import { validateProtocol, validateBeforeExecution } from "../src/protocol/validator.js";
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
    expect(state.active_skill).toBe("questioner");
    expect(state.allowed_actions.write_project_code).toBe(false);
    expect(await readFile(join(dir, ".atelier", "epics", state.epic_id, "plan.md"), "utf8")).toContain("Status: pending");
  });

  test("standard mode treats business research as optional", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "standard" });

    const state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.tasks[0]?.id).toBe("questions");
    expect(state.required_artifacts).toContain("research/repo.md");
    expect(state.required_artifacts).toContain("research/tech.md");
    expect(state.required_artifacts).not.toContain("research/business.md");
    expect(state.tasks.some((task) => task.id === "business-research")).toBe(false);
  });

  test("deep mode keeps business research required", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Migrate auth to SSO", { mode: "deep" });

    const state = await readEpicState(dir, "migrate-auth-to-sso");
    expect(state.required_artifacts).toContain("research/business.md");
    expect(state.tasks.some((task) => task.id === "business-research")).toBe(true);
  });

  test("next and done advance planning tasks without skipping designer", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "standard" });

    await cmdNext(dir);
    let state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.status).toBe("discovery");
    expect(state.active_skill).toBe("questioner");
    expect(state.tasks.find((task) => task.id === "questions")?.status).toBe("in_progress");

    await cmdDone(dir);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;

    await writeFile(join(dir, ".atelier", "epics", state.epic_id, "questions.md"), [
      "# Questions: Add payment endpoint",
      "",
      "## Critical Questions",
      "",
      "- [scope] Which payment operation is in scope?",
      "",
    ].join("\n"), "utf8");
    await cmdDone(dir);
    state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.active_skill).toBe("repo-analyst");
    expect(state.tasks.find((task) => task.id === "questions")?.status).toBe("done");
    expect(state.tasks.find((task) => task.id === "repo-research")?.status).toBe("in_progress");

    await writeFile(join(dir, ".atelier", "epics", state.epic_id, "research", "repo.md"), "# Repo\n\nEvidence.\n", "utf8");
    await cmdDone(dir);
    state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.active_skill).toBe("tech-analyst");

    await writeFile(join(dir, ".atelier", "epics", state.epic_id, "research", "tech.md"), "# Tech\n\nEvidence.\n", "utf8");
    await cmdDone(dir);
    state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.status).toBe("synthesis");
    expect(state.active_skill).toBe("planner");

    await writeFile(join(dir, ".atelier", "epics", state.epic_id, "synthesis.md"), "# Synthesis\n\nEvidence.\n", "utf8");
    await cmdDone(dir);
    state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.status).toBe("design");
    expect(state.active_skill).toBe("designer");

    await cmdDone(dir);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.status).toBe("design");

    await writeFile(join(dir, ".atelier", "epics", state.epic_id, "decisions.md"), "# Decisions\n\n- Use existing route pattern.\n", "utf8");
    await writeFile(join(dir, ".atelier", "epics", state.epic_id, "design.md"), "# Design\n\nUse existing architecture.\n", "utf8");
    await cmdDone(dir);
    state = await readEpicState(dir, "add-payment-endpoint");
    expect(state.status).toBe("planning");
    expect(state.active_skill).toBe("planner");
  });

  test("validate catches skipped designer and wrong task artifact", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "standard" });
    const state = await readEpicState(dir, "add-payment-endpoint");
    state.status = "discovery";
    state.active_skill = "designer";
    state.approval.status = "pending";
    state.tasks = state.tasks.map((task) =>
      task.id === "design"
        ? { ...task, status: "done" as const, artifact: "plan.md" }
        : task,
    );
    state.tasks = state.tasks.map((task) =>
      task.id === "repo-research"
        ? { ...task, status: "done" as const }
        : task,
    );
    state.slices = [
      {
        id: "slice-001",
        title: "Route",
        status: "ready",
        goal: "Add route",
        depends_on: [],
        allowed_files: ["src/**"],
        acceptance_criteria: ["Returns expected response"],
        validation: ["Run tests"],
      },
    ];
    await writeEpicState(dir, state);
    const active = await readActiveState(dir);
    active.active_phase = "discovery";
    active.active_skill = "designer";
    await writeActiveState(dir, active);

    const report = await validateProtocol(dir);
    expect(report.ok).toBe(false);
    expect(report.errors.join("\n")).toContain("discovery requires active_skill in [questioner, repo-analyst, tech-analyst, business-analyst]");
    expect(report.errors.join("\n")).toContain("approval.status=pending requires status=awaiting_approval");
    expect(report.errors.join("\n")).toContain("task design (design) must write design.md, not plan.md");
    expect(report.errors.join("\n")).toContain("task repo-research cannot start before questions are done");
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

  test("resume reactivates a paused epic in planning mode", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });
    await cmdPause(dir);

    await cmdResume(dir);

    const active = await readActiveState(dir);
    const state = await readEpicState(dir, "add-payment-endpoint");
    expect(active.active).toBe(true);
    expect(active.mode).toBe("atelier");
    expect(active.active_epic).toBe("add-payment-endpoint");
    expect(state.status).toBe("planning");
    expect(state.active_skill).toBe("planner");
  });

  test("resume fails when there is no active_epic", async () => {
    const dir = await initialized();

    await cmdResume(dir);

    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  test("resume fails when the epic is not paused", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });

    await cmdResume(dir);

    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  test("resume infers awaiting_approval when approval is pending and slices exist", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });
    const state = await readEpicState(dir, "add-payment-endpoint");
    state.approval.status = "pending";
    state.slices = [
      {
        id: "slice-001",
        title: "Route",
        status: "ready",
        goal: "Add the route",
        depends_on: [],
        allowed_files: ["src/**"],
        acceptance_criteria: ["Returns 200"],
        validation: ["Run tests"],
      },
    ];
    await writeEpicState(dir, state);
    await cmdPause(dir);

    await cmdResume(dir);

    const resumed = await readEpicState(dir, "add-payment-endpoint");
    expect(resumed.status).toBe("awaiting_approval");
    expect(resumed.active_skill).toBe("planner");
  });

  test("resume infers execution when approval is approved and ready slices exist", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });
    const state = await readEpicState(dir, "add-payment-endpoint");
    state.approval = {
      status: "approved",
      approved_by: "human",
      approved_at: new Date().toISOString(),
      notes: null,
    };
    state.slices = [
      {
        id: "slice-001",
        title: "Route",
        status: "ready",
        goal: "Add the route",
        depends_on: [],
        allowed_files: ["src/**"],
        acceptance_criteria: ["Returns 200"],
        validation: ["Run tests"],
      },
    ];
    await writeEpicState(dir, state);
    await cmdPause(dir);

    await cmdResume(dir);

    const resumed = await readEpicState(dir, "add-payment-endpoint");
    expect(resumed.status).toBe("execution");
    expect(resumed.active_skill).toBe("implementer");
  });

  test("before-execution gate fails without approval", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });
    const state = await readEpicState(dir, "add-payment-endpoint");

    const errors = validateBeforeExecution(state);

    expect(errors).toContain("before_execution requires approval.status=approved");
  });

  test("before-execution gate fails without a ready slice", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });
    const state = await readEpicState(dir, "add-payment-endpoint");
    state.approval = {
      status: "approved",
      approved_by: "human",
      approved_at: new Date().toISOString(),
      notes: null,
    };
    state.status = "approved";

    const errors = validateBeforeExecution(state);

    expect(errors).toContain("before_execution requires at least one ready slice");
  });

  test("before-execution gate passes with approved state and a ready slice", async () => {
    const dir = await initialized();
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });
    const state = await readEpicState(dir, "add-payment-endpoint");
    state.approval = {
      status: "approved",
      approved_by: "human",
      approved_at: new Date().toISOString(),
      notes: null,
    };
    state.status = "approved";
    state.slices = [
      {
        id: "slice-001",
        title: "Route",
        status: "ready",
        goal: "Add the route",
        depends_on: [],
        allowed_files: ["src/**"],
        acceptance_criteria: ["Returns 200"],
        validation: ["Run tests"],
      },
    ];

    const errors = validateBeforeExecution(state);

    expect(errors).toHaveLength(0);
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
