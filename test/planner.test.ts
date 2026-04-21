import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { defaultContextMeta, readContext, writeContext } from "../src/state/context.js";
import {
  addEpic,
  addSlice,
  addTask,
  focusTask,
  setWorkflow,
  updateTask,
} from "../src/state/planner.js";
import { activeSkillFolder } from "../src/skill-loader.js";

describe("planner state helpers", () => {
  let dir = "";

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
});
