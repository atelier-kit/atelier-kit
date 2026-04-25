import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { defaultContextMeta, readContext, writeContext } from "../src/state/context.js";
import type { IContextRepository } from "../src/ports/context-repository.js";
import type { IGoalClassifier } from "../src/ports/goal-classifier.js";
import type { ContextMeta } from "../src/state/schema.js";
import type { TaskTemplate } from "../src/state/task-templates.js";
import {
  addEpic,
  addSlice,
  addTask,
  approvePlan,
  autoplanGoal,
  advancePlanner,
  executePlan,
  focusTask,
  generatePlannerSlices,
  markCurrentDone,
  presentPlan,
  rejectPlan,
  setWorkflow,
  startPlannerGoal,
  updateTask,
  updateSlice,
  validatePlannerReadiness,
  validatePlanBeforeApproval,
} from "../src/state/planner.js";
import { classifyGoal } from "../src/state/task-templates.js";
import { activeSkillFolder } from "../src/skill-loader.js";
import { readFile } from "node:fs/promises";

describe("planner state helpers", () => {
  let dir = "";

  async function writeApprovalReadyArtifacts(epicId: string, sliceCount = 1) {
    const bundle = join(dir, ".atelier", "plan", epicId);
    await writeFile(
      join(bundle, "design.md"),
      [
        "# Design",
        "",
        "## Current state",
        "Repository evidence has been mapped for the active goal.",
        "",
        "## Desired state",
        "The planned slices describe the target implementation path.",
        "",
        "## Patterns to follow",
        "Keep implementation aligned with existing project structure.",
        "",
        "## Patterns to avoid",
        "Avoid introducing scope outside the approved outline.",
        "",
        "## Open decisions",
        "None blocking approval.",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      join(bundle, "outline.md"),
      [
        "# Outline",
        "",
        "## Vertical slices (in order)",
        "",
        ...Array.from({ length: sliceCount }, (_, i) => [
          `### Slice ${i + 1} — Test slice ${i + 1}`,
          "",
          "- Entrypoints: test",
          "- Tests: test",
          "",
        ].join("\n")),
      ].join("\n"),
      "utf8",
    );
  }

  async function clearPlannerGate() {
    const { meta, body } = await readContext(dir);
    await writeContext(dir, {
      ...meta,
      planner_state: "planning",
      approval_status: "none",
      gate_pending: null,
    }, body);
  }

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "atk-planner-"));
    await mkdir(join(dir, ".atelier"), { recursive: true });
    await writeContext(dir, defaultContextMeta({ phase: "plan", gate_pending: null }));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("can build planner graph incrementally", async () => {
    await setWorkflow(dir, "planner");
    await addEpic(dir, {
      id: "python-to-php",
      title: "Python to PHP migration",
      status: "researching",
      labels: ["migration"],
    });
    await addTask(dir, {
      id: "repo-discovery",
      epic_id: "python-to-php",
      title: "Map current Python framework usage",
      type: "repo",
      status: "researching",
      depends_on: [],
      acceptance: ["Framework touchpoints are listed"],
      open_questions: [],
      evidence_refs: ["src/app.py"],
    });
    await addTask(dir, {
      id: "tech-feasibility",
      epic_id: "python-to-php",
      title: "Compare PHP framework candidates",
      type: "tech",
      status: "draft",
      depends_on: ["repo-discovery"],
      acceptance: ["Tradeoffs are documented"],
      open_questions: [],
      evidence_refs: [],
    });
    await addSlice(dir, {
      id: "bootstrap-slice",
      epic_id: "python-to-php",
      title: "Bootstrap the PHP application",
      goal: "Create a runnable PHP skeleton with CI coverage",
      kind: "delivery",
      status: "ready",
      depends_on: ["tech-feasibility"],
      source_task_ids: ["repo-discovery", "tech-feasibility"],
      acceptance: ["Healthcheck endpoint passes"],
      risks: ["CI image mismatch"],
    });
    await updateTask(dir, "tech-feasibility", {
      slice_id: "bootstrap-slice",
      status: "done",
    });
    await focusTask(dir, "tech-feasibility");

    const { meta } = await readContext(dir);
    expect(meta.workflow).toBe("planner");
    expect(meta.current_epic).toBe("python-to-php");
    expect(meta.current_task).toBe("tech-feasibility");
    expect(meta.current_slice).toBe("bootstrap-slice");
    expect(meta.tasks).toHaveLength(2);
    expect(meta.slices).toHaveLength(1);
  });

  test("planner task type selects active skill", async () => {
    const meta = defaultContextMeta({
      workflow: "planner",
      phase: "plan",
      current_epic: "epic-1",
      current_task: "task-1",
      current_slice: null,
      epics: [
        {
          id: "epic-1",
          title: "Epic",
          status: "researching",
          labels: [],
        },
      ],
      tasks: [
        {
          id: "task-1",
          epic_id: "epic-1",
          title: "Business impact",
          type: "business",
          status: "researching",
          depends_on: [],
          acceptance: [],
          open_questions: [],
          evidence_refs: [],
        },
      ],
      slices: [],
    });

    expect(activeSkillFolder(meta)).toBe("business-analyst");
  });

  test("implement phase still prefers implementer for current slice", async () => {
    const meta = defaultContextMeta({
      workflow: "planner",
      phase: "implement",
      current_epic: "epic-1",
      current_task: null,
      current_slice: "slice-1",
      epics: [
        {
          id: "epic-1",
          title: "Epic",
          status: "ready",
          labels: [],
        },
      ],
      tasks: [],
      slices: [
        {
          id: "slice-1",
          epic_id: "epic-1",
          title: "Delivery slice",
          goal: "Ship an end-to-end cut",
          kind: "delivery",
          status: "executing",
          depends_on: [],
          source_task_ids: [],
          acceptance: [],
          risks: [],
        },
      ],
    });

    expect(activeSkillFolder(meta)).toBe("implementer");
  });

  test("planner start creates initial flow and next/done advance it", async () => {
    await startPlannerGoal(dir, "Migrate Python framework to PHP");
    let state = await readContext(dir);
    expect(state.meta.workflow).toBe("planner");
    expect(state.meta.current_task).toBe("migrate-python-framework-to-php-repo");
    expect(activeSkillFolder(state.meta)).toBe("repo-analyst");

    await markCurrentDone(dir);
    state = await readContext(dir);
    expect(state.meta.current_task).toBe("migrate-python-framework-to-php-tech");
    expect(activeSkillFolder(state.meta)).toBe("tech-analyst");

    await markCurrentDone(dir);
    await markCurrentDone(dir);
    state = await readContext(dir);
    expect(state.meta.current_task).toBe("migrate-python-framework-to-php-synthesis");
    expect(activeSkillFolder(state.meta)).toBe("planner");

    await markCurrentDone(dir);
    state = await readContext(dir);
    expect(state.meta.current_task).toBe("migrate-python-framework-to-php-decision");
    expect(activeSkillFolder(state.meta)).toBe("designer");

    await markCurrentDone(dir);
    state = await readContext(dir);
    expect(state.meta.slices.length).toBeGreaterThan(0);
    expect(state.meta.current_slice).toBe(null);
    expect(state.meta.phase).toBe("plan");
    expect(state.meta.planner_state).toBe("awaiting_approval");

    await advancePlanner(dir);
    await generatePlannerSlices(dir);
    state = await readContext(dir);
    expect(state.meta.current_slice).toBe(null);
    expect(state.meta.planner_state).toBe("awaiting_approval");
  });

  test("autoplan blocks migration approval when technical research is empty", async () => {
    const meta = await autoplanGoal(dir, "Migrate Python framework to PHP");
    expect(meta.planner_state).toBe("planning");
    expect(meta.approval_status).toBe("none");
    expect(meta.gate_pending).toMatch(/technical research evidence|technical research/);
    expect(meta.tasks.find((task) => task.type === "tech")?.status).toBe("blocked");
    expect(meta.slices).toHaveLength(0);
  });

  test("startPlannerGoal creates a clean artifact bundle for the new plan", async () => {
    await startPlannerGoal(dir, "Migrate Python framework to PHP");
    const bundle = join(dir, ".atelier", "plan", "migrate-python-framework-to-php");
    for (const file of [
      "questions.md",
      "research.md",
      "design.md",
      "outline.md",
      "plan.md",
      "impl-log.md",
      "review.md",
      "decision-log.md",
      "manifest.json",
    ]) {
      const content = await readFile(join(bundle, file), "utf8");
      expect(content.length).toBeGreaterThan(0);
    }
    const research = await readFile(join(bundle, "research.md"), "utf8");
    expect(research).toContain("_Optional in planner-first mode._");
    const manifest = JSON.parse(await readFile(join(bundle, "manifest.json"), "utf8"));
    expect(manifest.paths.artifacts["research.md"]).toBe("research.md");
    expect(manifest.paths.artifacts["review.md"]).toBe("review.md");
  });

  test("autoplan stops before approval when presentation artifacts are not ready", async () => {
    const classifier = new StubGoalClassifier([
      { suffix: "repo", type: "repo", title: "Repo", summary: "s", acceptance: [], open_questions: [] },
      { suffix: "synthesis", type: "synthesis", title: "Synthesis", summary: "s", acceptance: ["done"], open_questions: [] },
    ]);

    const meta = await autoplanGoal(dir, "Migrate Python framework to PHP", { classifier });
    expect(meta.planner_state).toBe("planning");
    expect(meta.approval_status).toBe("none");
    expect(meta.gate_pending).toContain("Plan presentation blocked:");
    expect(meta.gate_pending).toContain("design.md is still a template stub");
    expect(meta.current_task).toBe(null);
    expect(meta.current_slice).toBe(null);
    expect(meta.slices[0]?.status).toBe("ready");

    const underPlan = join(
      dir,
      ".atelier",
      "plan",
      "migrate-python-framework-to-php",
      "plan.md",
    );
    const plan = await readFile(underPlan, "utf8");
    expect(plan).toContain("# Plan");
    expect(plan).toContain("_TBD_");
    const manifest = JSON.parse(
      await readFile(
        join(dir, ".atelier", "plan", "migrate-python-framework-to-php", "manifest.json"),
        "utf8",
      ),
    );
    expect(manifest.atelier_plan_manifest_version).toBe(1);
    expect(manifest.epic_id).toBe("migrate-python-framework-to-php");
  });

  test("validatePlannerReadiness reports blockers and next actions", async () => {
    const classifier = new StubGoalClassifier([
      { suffix: "repo", type: "repo", title: "Repo", summary: "s", acceptance: [], open_questions: [] },
      { suffix: "synthesis", type: "synthesis", title: "Synthesis", summary: "s", acceptance: ["done"], open_questions: [] },
    ]);
    await autoplanGoal(dir, "Migrate Python framework to PHP", { classifier });

    const report = await validatePlannerReadiness(dir);

    expect(report.ready).toBe(false);
    expect(report.blocks.join("\n")).toContain("design.md is still a template stub");
    expect(report.next_actions.join("\n")).toContain("Fill design.md");
  });

  test("validatePlannerReadiness passes when approval artifacts match state", async () => {
    const classifier = new StubGoalClassifier([
      { suffix: "repo", type: "repo", title: "Repo", summary: "s", acceptance: [], open_questions: [] },
      { suffix: "synthesis", type: "synthesis", title: "Synthesis", summary: "s", acceptance: ["done"], open_questions: [] },
    ]);
    await autoplanGoal(dir, "Migrate Python framework to PHP", { classifier });
    await writeApprovalReadyArtifacts("migrate-python-framework-to-php", 1);
    await clearPlannerGate();

    const report = await validatePlannerReadiness(dir, { repair: true });

    expect(report.ready).toBe(true);
    expect(report.blocks).toHaveLength(0);
    expect(report.next_actions).toContain("Run `atelier-kit planner present` to render the approval plan.");
  });

  test("reject and approve control execution gate", async () => {
    const classifier = new StubGoalClassifier([
      { suffix: "repo", type: "repo", title: "Repo", summary: "s", acceptance: [], open_questions: [] },
      { suffix: "synthesis", type: "synthesis", title: "Synthesis", summary: "s", acceptance: ["done"], open_questions: [] },
    ]);
    await autoplanGoal(dir, "Migrate Python framework to PHP", { classifier });
    await writeApprovalReadyArtifacts("migrate-python-framework-to-php", 1);
    await clearPlannerGate();
    await presentPlan(dir);
    await rejectPlan(dir, "Need clearer migration risks");
    let state = await readContext(dir);
    expect(state.meta.approval_status).toBe("rejected");
    expect(state.meta.planner_state).toBe("planning");

    await clearPlannerGate();
    await presentPlan(dir);
    state = await readContext(dir);
    expect(state.meta.approval_status).toBe("pending");

    await approvePlan(dir);
    state = await readContext(dir);
    expect(state.meta.approval_status).toBe("approved");
    expect(state.meta.slices.every((slice) => slice.status === "ready")).toBe(true);

    await executePlan(dir);
    state = await readContext(dir);
    expect(state.meta.planner_state).toBe("executing");
    expect(state.meta.phase).toBe("implement");
    expect(state.meta.current_slice).toBe("migrate-python-framework-to-php-slice-1");
    expect(state.meta.slices[0]?.status).toBe("executing");
    expect(activeSkillFolder(state.meta)).toBe("implementer");
  });

  test("goal classifier identifies domain from goal text", () => {
    expect(classifyGoal("Migrate Python framework to PHP")).toBe("migration");
    expect(classifyGoal("Port the authentication module to Go")).toBe("migration");
    expect(classifyGoal("Add user notifications feature")).toBe("new-feature");
    expect(classifyGoal("Build a new payment integration")).toBe("new-feature");
    expect(classifyGoal("Refactor the database access layer")).toBe("refactor");
    expect(classifyGoal("Deploy Kubernetes cluster on AWS")).toBe("infrastructure");
    expect(classifyGoal("Research GraphQL vs REST tradeoffs")).toBe("research");
    expect(classifyGoal("Evaluate authentication libraries")).toBe("research");
    expect(classifyGoal("Implement dark mode")).toBe("new-feature");
    expect(classifyGoal("something completely generic")).toBe("default");
  });

  test("domain-aware task templates produce migration-specific titles", async () => {
    await startPlannerGoal(dir, "Migrate Python framework to PHP");
    const { meta } = await readContext(dir);
    const repoTask = meta.tasks.find((t) => t.type === "repo");
    expect(repoTask?.title).toContain("coupling");
    expect(repoTask?.title).not.toBe("Map repository facts and current implementation boundaries");
  });

  test("domain-aware task templates produce new-feature-specific titles", async () => {
    await startPlannerGoal(dir, "Add user authentication feature");
    const { meta } = await readContext(dir);
    const repoTask = meta.tasks.find((t) => t.type === "repo");
    expect(repoTask?.title).toContain("integration points");
  });

  test("discovery tasks have parallel_group set", async () => {
    await startPlannerGoal(dir, "Migrate Python framework to PHP");
    const { meta } = await readContext(dir);
    const discovery = meta.tasks.filter((t) => t.type !== "synthesis" && t.type !== "decision");
    for (const task of discovery) {
      expect(task.parallel_group).toBeDefined();
      expect(task.parallel_group).toContain("discovery");
    }
    const synthesis = meta.tasks.find((t) => t.type === "synthesis");
    expect(synthesis?.parallel_group).toBeUndefined();
    const decision = meta.tasks.find((t) => t.type === "decision");
    expect(decision?.parallel_group).toBeUndefined();
    expect(decision?.depends_on).toContain("migrate-python-framework-to-php-synthesis");
  });

  test("a second start with the same goal gets a new epic id and does not clobber the first plan dir", async () => {
    const classifier = new StubGoalClassifier([
      { suffix: "repo", type: "repo", title: "Repo", summary: "s", acceptance: [], open_questions: [] },
      { suffix: "synthesis", type: "synthesis", title: "Synthesis", summary: "s", acceptance: ["done"], open_questions: [] },
    ]);
    await autoplanGoal(dir, "Same title twice", { classifier });
    await writeApprovalReadyArtifacts("same-title-twice", 1);
    await clearPlannerGate();
    await presentPlan(dir);
    const p1 = join(dir, ".atelier", "plan", "same-title-twice", "plan.md");
    const firstPlan = await readFile(p1, "utf8");
    expect(firstPlan).toContain("# Plan");
    await startPlannerGoal(dir, "Same title twice");
    const { meta } = await readContext(dir);
    const ids = meta.epics.map((e) => e.id).sort();
    expect(ids).toEqual(["same-title-twice", "same-title-twice-2"].sort());
    const stillFirst = await readFile(p1, "utf8");
    expect(stillFirst).toBe(firstPlan);
    expect(meta.current_epic).toBe("same-title-twice-2");
  });

  test("rendered plan includes parallel track and metadata header", async () => {
    const classifier = new StubGoalClassifier([
      { suffix: "repo", type: "repo", title: "Repo", summary: "s", acceptance: [], open_questions: [] },
      { suffix: "synthesis", type: "synthesis", title: "Synthesis", summary: "s", acceptance: ["done"], open_questions: [] },
    ]);
    await autoplanGoal(dir, "Migrate Python framework to PHP", { classifier });
    await writeApprovalReadyArtifacts("migrate-python-framework-to-php", 1);
    await clearPlannerGate();
    await presentPlan(dir);
    const plan = await readFile(
      join(dir, ".atelier", "plan", "migrate-python-framework-to-php", "plan.md"),
      "utf8",
    );
    expect(plan).toContain("Parallel track:");
    expect(plan).toContain("Generated:");
    expect(plan).toContain("Tasks:");
    expect(plan).toContain("Slices:");
  });

  test("rendered plan includes risk register when slices have risks", async () => {
    const classifier = new StubGoalClassifier([
      { suffix: "repo", type: "repo", title: "Repo", summary: "s", acceptance: [], open_questions: [] },
      { suffix: "synthesis", type: "synthesis", title: "Synthesis", summary: "s", acceptance: ["done"], open_questions: [] },
    ]);
    await autoplanGoal(dir, "Migrate Python framework to PHP", { classifier });
    await writeApprovalReadyArtifacts("migrate-python-framework-to-php", 1);
    await clearPlannerGate();
    await presentPlan(dir);
    const plan = await readFile(
      join(dir, ".atelier", "plan", "migrate-python-framework-to-php", "plan.md"),
      "utf8",
    );
    expect(plan).toContain("Risk register");
  });

  test("validatePlanBeforeApproval blocks when synthesis is not done", async () => {
    await startPlannerGoal(dir, "Migrate Python framework to PHP");
    const { meta } = await readContext(dir);
    const result = validatePlanBeforeApproval(meta);
    expect(result.blocks.length).toBeGreaterThan(0);
    expect(result.blocks.some((b) => b.includes("Synthesis"))).toBe(true);
  });

  test("validatePlanBeforeApproval blocks when no slices exist", async () => {
    const meta = defaultContextMeta({
      workflow: "planner",
      planner_state: "awaiting_approval",
      approval_status: "pending",
      current_epic: "e1",
      epics: [{ id: "e1", title: "Epic", status: "researching", labels: [] }],
      tasks: [
        {
          id: "e1-synthesis",
          epic_id: "e1",
          title: "Synthesis",
          type: "synthesis",
          status: "done",
          depends_on: [],
          acceptance: ["Slices proposed"],
          open_questions: [],
          evidence_refs: [],
        },
      ],
      slices: [],
    });
    const result = validatePlanBeforeApproval(meta);
    expect(result.blocks.some((b) => b.includes("No slices"))).toBe(true);
  });

  test("validatePlanBeforeApproval warns on slices without acceptance", async () => {
    const meta = defaultContextMeta({
      workflow: "planner",
      planner_state: "awaiting_approval",
      approval_status: "pending",
      current_epic: "e1",
      epics: [{ id: "e1", title: "Epic", status: "researching", labels: [] }],
      tasks: [
        {
          id: "e1-synthesis",
          epic_id: "e1",
          title: "Synthesis",
          type: "synthesis",
          status: "done",
          depends_on: [],
          acceptance: [],
          open_questions: [],
          evidence_refs: [],
        },
      ],
      slices: [
        {
          id: "s1",
          epic_id: "e1",
          title: "Slice 1",
          goal: "Ship something",
          kind: "delivery" as const,
          status: "ready" as const,
          depends_on: [],
          source_task_ids: [],
          acceptance: [],
          risks: [],
        },
      ],
    });
    const result = validatePlanBeforeApproval(meta);
    expect(result.blocks).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes("acceptance"))).toBe(true);
  });

  test("approvePlan throws when synthesis is not done", async () => {
    await startPlannerGoal(dir, "Migrate Python framework to PHP");
    // Force awaiting_approval without going through proper flow
    const { meta, body } = await readContext(dir);
    const { writeContext: wc } = await import("../src/state/context.js");
    await wc(dir, { ...meta, planner_state: "awaiting_approval", approval_status: "pending" }, body);
    await expect(approvePlan(dir)).rejects.toThrow("blocked");
  });

  test("blocked tasks are not selected as the next planner focus", async () => {
    await writeContext(
      dir,
      defaultContextMeta({
        workflow: "planner",
        planner_state: "planning",
        current_epic: "e1",
        current_task: null,
        epics: [{ id: "e1", title: "Epic", status: "researching", labels: [] }],
        tasks: [
          {
            id: "e1-tech",
            epic_id: "e1",
            title: "Blocked tech task",
            type: "tech",
            status: "blocked",
            depends_on: [],
            acceptance: [],
            open_questions: [],
            evidence_refs: [],
          },
          {
            id: "e1-business",
            epic_id: "e1",
            title: "Ready business task",
            type: "business",
            status: "ready",
            depends_on: [],
            acceptance: [],
            open_questions: [],
            evidence_refs: [],
          },
        ],
        slices: [],
      }),
    );

    const meta = await advancePlanner(dir);
    expect(meta.current_task).toBe("e1-business");
  });

  test("planner focus and approval transition stay within current epic", async () => {
    await writeContext(
      dir,
      defaultContextMeta({
        workflow: "planner",
        planner_state: "planning",
        current_epic: "e1",
        current_task: "e1-repo",
        current_slice: null,
        epics: [
          { id: "e1", title: "Epic 1", status: "researching", labels: [] },
          { id: "e2", title: "Epic 2", status: "ready", labels: [] },
        ],
        tasks: [
          {
            id: "e1-repo",
            epic_id: "e1",
            title: "Repo task",
            type: "repo",
            status: "researching",
            depends_on: [],
            acceptance: [],
            open_questions: [],
            evidence_refs: [],
          },
          {
            id: "e2-synthesis",
            epic_id: "e2",
            title: "Synthesis",
            type: "synthesis",
            status: "done",
            depends_on: [],
            acceptance: [],
            open_questions: [],
            evidence_refs: [],
          },
        ],
        slices: [
          {
            id: "e2-slice",
            epic_id: "e2",
            title: "Other epic slice",
            goal: "Ship other epic",
            kind: "delivery",
            status: "ready",
            depends_on: ["e2-synthesis"],
            source_task_ids: ["e2-synthesis"],
            acceptance: ["Done"],
            risks: [],
          },
        ],
      }),
    );

    const meta = await markCurrentDone(dir);
    expect(meta.planner_state).toBe("planning");
    expect(meta.current_epic).toBe("e1");
    expect(meta.current_slice).toBe(null);
  });

  test("executePlan only starts slices from the approved current epic", async () => {
    await writeContext(
      dir,
      defaultContextMeta({
        workflow: "planner",
        planner_state: "approved",
        approval_status: "approved",
        current_epic: "e1",
        current_task: null,
        current_slice: null,
        epics: [
          { id: "e1", title: "Epic 1", status: "ready", labels: [] },
          { id: "e2", title: "Epic 2", status: "ready", labels: [] },
        ],
        tasks: [],
        slices: [
          {
            id: "e1-slice",
            epic_id: "e1",
            title: "Current epic slice",
            goal: "Ship current epic",
            kind: "delivery",
            status: "ready",
            depends_on: [],
            source_task_ids: [],
            acceptance: ["Done"],
            risks: [],
          },
          {
            id: "e2-slice",
            epic_id: "e2",
            title: "Other epic slice",
            goal: "Ship other epic",
            kind: "delivery",
            status: "ready",
            depends_on: [],
            source_task_ids: [],
            acceptance: ["Done"],
            risks: [],
          },
        ],
      }),
    );

    const meta = await executePlan(dir);
    expect(meta.current_slice).toBe("e1-slice");
    expect(meta.slices.find((slice) => slice.id === "e1-slice")?.status).toBe("executing");
    expect(meta.slices.find((slice) => slice.id === "e2-slice")?.status).toBe("ready");
  });

  test("task dependency cycles are rejected", async () => {
    await addEpic(dir, { id: "e1", title: "Epic", status: "draft", labels: [] });
    await addTask(dir, {
      id: "task-a",
      epic_id: "e1",
      title: "Task A",
      type: "repo",
      status: "ready",
      depends_on: [],
      acceptance: [],
      open_questions: [],
      evidence_refs: [],
    });
    await addTask(dir, {
      id: "task-b",
      epic_id: "e1",
      title: "Task B",
      type: "tech",
      status: "ready",
      depends_on: ["task-a"],
      acceptance: [],
      open_questions: [],
      evidence_refs: [],
    });

    await expect(updateTask(dir, "task-a", { depends_on: ["task-b"] })).rejects.toThrow("cycle");
  });

  test("slice dependency cycles are rejected", async () => {
    await addEpic(dir, { id: "e1", title: "Epic", status: "draft", labels: [] });
    await addSlice(dir, {
      id: "slice-a",
      epic_id: "e1",
      title: "Slice A",
      goal: "Ship A",
      kind: "delivery",
      status: "ready",
      depends_on: [],
      source_task_ids: [],
      acceptance: [],
      risks: [],
    });
    await addSlice(dir, {
      id: "slice-b",
      epic_id: "e1",
      title: "Slice B",
      goal: "Ship B",
      kind: "delivery",
      status: "ready",
      depends_on: ["slice-a"],
      source_task_ids: [],
      acceptance: [],
      risks: [],
    });

    await expect(updateSlice(dir, "slice-a", { depends_on: ["slice-b"] })).rejects.toThrow("cycle");
  });
});

class InMemoryContextRepository implements IContextRepository {
  private store = new Map<string, { meta: ContextMeta; body: string }>();

  async read(cwd: string): Promise<{ meta: ContextMeta; body: string }> {
    const entry = this.store.get(cwd);
    if (!entry) throw new Error(`No context for: ${cwd}`);
    return { meta: { ...entry.meta }, body: entry.body };
  }

  async write(cwd: string, meta: ContextMeta, body = ""): Promise<void> {
    this.store.set(cwd, { meta: { ...meta }, body });
  }

  default(partial?: Partial<ContextMeta>): ContextMeta {
    return defaultContextMeta(partial);
  }

  seed(cwd: string, meta?: Partial<ContextMeta>): void {
    const full = defaultContextMeta({ phase: "plan", gate_pending: null, ...meta });
    this.store.set(cwd, { meta: full, body: "" });
  }
}

class StubGoalClassifier implements IGoalClassifier {
  constructor(private readonly templates: TaskTemplate[]) {}
  getTemplates(_goal: string): TaskTemplate[] {
    return this.templates;
  }
}

describe("planner ports — in-memory", () => {
  const CWD = "/fake/project";

  test("startPlannerGoal uses injected classifier templates", async () => {
    const repo = new InMemoryContextRepository();
    repo.seed(CWD);

    const stubTemplates: TaskTemplate[] = [
      {
        suffix: "repo",
        type: "repo",
        title: "Stub repo task",
        summary: "stub",
        acceptance: ["done"],
        open_questions: [],
      },
      {
        suffix: "synthesis",
        type: "synthesis",
        title: "Stub synthesis",
        summary: "stub",
        acceptance: [],
        open_questions: [],
      },
    ];
    const classifier = new StubGoalClassifier(stubTemplates);

    const meta = await startPlannerGoal(CWD, "do something", { repo, classifier });

    expect(meta.tasks).toHaveLength(2);
    expect(meta.tasks[0].title).toBe("Stub repo task");
    expect(meta.planner_state).toBe("planning");
  });

  test("autoplanGoal runs to awaiting_approval without writing files", async () => {
    const repo = new InMemoryContextRepository();
    repo.seed(CWD);

    const stubTemplates: TaskTemplate[] = [
      {
        suffix: "repo",
        type: "repo",
        title: "Repo analysis",
        summary: "s",
        acceptance: [],
        open_questions: [],
      },
      {
        suffix: "synthesis",
        type: "synthesis",
        title: "Synthesis",
        summary: "s",
        acceptance: ["slices defined"],
        open_questions: [],
      },
    ];
    const classifier = new StubGoalClassifier(stubTemplates);

    const meta = await autoplanGoal(CWD, "migrate something", { repo, classifier });
    expect(meta.planner_state).toBe("awaiting_approval");
    expect(meta.approval_status).toBe("pending");
  });

  test("approvePlan, rejectPlan and executePlan work without disk", async () => {
    const repo = new InMemoryContextRepository();
    repo.seed(CWD);
    const classifier = new StubGoalClassifier([
      { suffix: "repo", type: "repo", title: "Repo", summary: "s", acceptance: [], open_questions: [] },
      { suffix: "synthesis", type: "synthesis", title: "Synthesis", summary: "s", acceptance: ["done"], open_questions: [] },
    ]);

    await autoplanGoal(CWD, "ship it", { repo, classifier });

    await expect(approvePlan(CWD, repo)).resolves.toMatchObject({
      planner_state: "approved",
      approval_status: "approved",
    });

    const execMeta = await executePlan(CWD, repo);
    expect(execMeta.planner_state).toBe("executing");
    expect(execMeta.current_slice).not.toBeNull();
  });

  test("rejectPlan cycles back to planning", async () => {
    const repo = new InMemoryContextRepository();
    repo.seed(CWD);
    const classifier = new StubGoalClassifier([
      { suffix: "repo", type: "repo", title: "Repo", summary: "s", acceptance: [], open_questions: [] },
      { suffix: "synthesis", type: "synthesis", title: "Synthesis", summary: "s", acceptance: ["done"], open_questions: [] },
    ]);

    await autoplanGoal(CWD, "do something", { repo, classifier });

    const meta = await rejectPlan(CWD, "scope too large", repo);
    expect(meta.planner_state).toBe("planning");
    expect(meta.approval_status).toBe("rejected");
    expect(meta.approval_reason).toBe("scope too large");
  });

  test("addEpic, addTask, addSlice work without disk", async () => {
    const repo = new InMemoryContextRepository();
    repo.seed(CWD);

    await addEpic(CWD, { id: "epic-1", title: "My Epic", status: "draft", labels: [] }, repo);
    await addTask(CWD, {
      id: "task-1",
      epic_id: "epic-1",
      title: "First task",
      type: "repo",
      status: "ready",
      depends_on: [],
      acceptance: [],
      open_questions: [],
      evidence_refs: [],
    }, repo);

    const { meta } = await repo.read(CWD);
    expect(meta.epics).toHaveLength(1);
    expect(meta.tasks).toHaveLength(1);
    expect(meta.current_epic).toBe("epic-1");
    expect(meta.current_task).toBe("task-1");
  });

  test("markCurrentDone advances through tasks without disk", async () => {
    const repo = new InMemoryContextRepository();
    repo.seed(CWD);
    const classifier = new StubGoalClassifier([
      { suffix: "repo", type: "repo", title: "Repo", summary: "s", acceptance: [], open_questions: [] },
      { suffix: "tech", type: "tech", title: "Tech", summary: "s", acceptance: [], open_questions: [] },
      { suffix: "synthesis", type: "synthesis", title: "Synthesis", summary: "s", acceptance: ["done"], open_questions: [] },
    ]);

    let meta = await startPlannerGoal(CWD, "build feature", { repo, classifier });
    expect(meta.current_task).not.toBeNull();

    while (meta.current_task) {
      meta = await markCurrentDone(CWD, repo);
    }

    expect(meta.planner_state).toBe("awaiting_approval");
    expect(meta.slices.length).toBeGreaterThan(0);
  });
});
