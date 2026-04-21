import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { writeContext, readContext, defaultContextMeta } from "../src/state/context.js";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  writeAtelierRc,
  defaultAtelierRc,
  readAtelierRc,
} from "../src/state/atelierrc.js";

describe("context + atelierrc", () => {
  let dir = "";
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "atk-ctx-"));
    await mkdir(join(dir, ".atelier"), { recursive: true });
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("roundtrip context.md", async () => {
    await writeContext(
      dir,
      defaultContextMeta({ phase: "plan", gate_pending: null }),
      "note line",
    );
    const { meta, body } = await readContext(dir);
    expect(meta.phase).toBe("plan");
    expect(body).toContain("note line");
  });

  test("planner entities roundtrip in context.md", async () => {
    await writeContext(
      dir,
      defaultContextMeta({
        workflow: "planner",
        phase: "plan",
        current_epic: "python-to-php",
        current_task: "tech-feasibility",
        current_slice: "auth-migration",
        epics: [
          {
            id: "python-to-php",
            title: "Python to PHP migration",
            goal: "Move the framework while keeping delivery incremental",
            status: "researching",
            labels: ["migration"],
          },
        ],
        tasks: [
          {
            id: "tech-feasibility",
            epic_id: "python-to-php",
            title: "Compare PHP framework candidates",
            type: "tech",
            status: "researching",
            depends_on: [],
            acceptance: ["Tradeoffs documented"],
            open_questions: ["Which deployment model is required?"],
            evidence_refs: ["docs:laravel", "docs:symfony"],
          },
        ],
        slices: [
          {
            id: "auth-migration",
            epic_id: "python-to-php",
            title: "Migrate authentication vertically",
            goal: "Rebuild login/session/authz in PHP",
            kind: "delivery",
            status: "ready",
            depends_on: ["tech-feasibility"],
            source_task_ids: ["tech-feasibility"],
            acceptance: ["Login passes end-to-end tests"],
            risks: ["Session compatibility during coexistence"],
          },
        ],
      }),
      "planner note",
    );

    const { meta, body } = await readContext(dir);
    expect(meta.workflow).toBe("planner");
    expect(meta.current_epic).toBe("python-to-php");
    expect(meta.tasks[0]?.type).toBe("tech");
    expect(meta.slices[0]?.kind).toBe("delivery");
    expect(body).toContain("planner note");
  });

  test("roundtrip .atelierrc json", async () => {
    await writeAtelierRc(dir, defaultAtelierRc({ adapter: "cursor", mode: "deep" }));
    const rc = await readAtelierRc(dir);
    expect(rc.adapter).toBe("cursor");
    expect(rc.mode).toBe("deep");
  });
});
