import { afterEach, describe, expect, test } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { cmdInit } from "../src/commands/init.js";
import { cmdNew } from "../src/commands/new.js";
import { cmdReview } from "../src/commands/review.js";
import {
  readActiveState,
  readEpicState,
  writeActiveState,
  writeEpicState,
} from "../src/protocol/state.js";
import { tempDir, kitPath } from "./helpers.js";
import type { ProtocolSlice } from "../src/protocol/schema.js";

const execFileAsync = promisify(execFile);

async function gitInit(dir: string): Promise<void> {
  await execFileAsync("git", ["init", "-q"], { cwd: dir });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: dir });
  await execFileAsync("git", ["config", "commit.gpgsign", "false"], { cwd: dir });
}

async function gitCommitAll(dir: string, message: string): Promise<string> {
  await execFileAsync("git", ["add", "-A"], { cwd: dir });
  await execFileAsync("git", ["commit", "-q", "-m", message], { cwd: dir });
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: dir });
  return stdout.trim();
}

async function readyPlannedEpic(
  dir: string,
  slices: ProtocolSlice[],
): Promise<string> {
  await cmdNew(dir, "Add login endpoint", { mode: "quick" });
  const state = await readEpicState(dir, "add-login-endpoint");
  state.status = "planned";
  state.active_skill = null;
  state.slices = slices;
  state.tasks = state.tasks.map((task) => ({ ...task, status: "done" as const }));
  await writeEpicState(dir, state);
  const active = await readActiveState(dir);
  await writeActiveState(dir, {
    ...active,
    active: true,
    active_epic: state.epic_id,
    active_phase: state.status,
    active_skill: state.active_skill,
    updated_at: new Date().toISOString(),
  });
  await writeFile(
    join(dir, ".atelier", "epics", state.epic_id, "plan.md"),
    [
      "# Plan: Add login endpoint",
      "",
      "## Goal",
      "",
      "Login endpoint.",
      "",
      "## Risks",
      "",
      "| Risk | Impact | Mitigation |",
      "|---|---:|---|",
      "| Scope drift | Medium | Slice covers only the route |",
      "",
      "## Slices",
      "",
      "### Slice 1 - Route",
      "",
      "**Goal:** Add the route",
      "",
      "**Acceptance criteria:**",
      "",
      "- Route responds 200 on valid creds.",
      "",
      "**Validation:**",
      "",
      "- true",
      "",
    ].join("\n"),
    "utf8",
  );
  return state.epic_id;
}

describe("atelier review", () => {
  let cleanup: () => Promise<void> = async () => {};

  afterEach(async () => {
    await cleanup();
    delete process.env.ATELIER_KIT_ROOT;
    process.exitCode = 0;
  });

  async function setupPlanned(slices: ProtocolSlice[]) {
    const tmp = await tempDir();
    cleanup = tmp.cleanup;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await mkdir(join(tmp.path, "src"), { recursive: true });
    await writeFile(join(tmp.path, "src", "placeholder.ts"), "export {};\n", "utf8");
    await gitInit(tmp.path);
    await cmdInit(tmp.path, { yes: true });
    const epicId = await readyPlannedEpic(tmp.path, slices);
    // Commit AFTER planning so the baseline includes all framework artifacts.
    // Real users do this when planning finishes; review then sees only
    // implementation changes layered on top.
    const baseline = await gitCommitAll(tmp.path, "planning complete");
    const state = await readEpicState(tmp.path, epicId);
    state.guards.baseline_ref = baseline;
    await writeEpicState(tmp.path, state);
    return { dir: tmp.path, epicId };
  }

  test("PASS when every change is inside allowed_files and validation succeeds", async () => {
    const { dir, epicId } = await setupPlanned([
      {
        id: "slice-001",
        title: "Route",
        status: "ready",
        goal: "Add the route",
        depends_on: [],
        allowed_files: ["src/**"],
        acceptance_criteria: ["Route responds 200 on valid creds."],
        validation: ["true"],
      },
    ]);
    await writeFile(join(dir, "src", "login.ts"), "export const x = 1;\n", "utf8");

    await cmdReview(dir);

    expect(process.exitCode ?? 0).toBe(0);
    const review = await readFile(join(dir, ".atelier", "epics", epicId, "review.md"), "utf8");
    expect(review).toContain("Overall: PASS");
    expect(review).toContain("Allowed-files violations: 0");
    expect(review).toContain("Failed validations: 0");
    expect(review).toContain("- src/login.ts");
  });

  test("FAIL with Violations block when a file is changed outside every slice's allowed_files", async () => {
    const { dir, epicId } = await setupPlanned([
      {
        id: "slice-001",
        title: "Route",
        status: "ready",
        goal: "Add the route",
        depends_on: [],
        allowed_files: ["src/**"],
        acceptance_criteria: ["Route responds 200 on valid creds."],
        validation: ["true"],
      },
    ]);
    await writeFile(join(dir, "src", "login.ts"), "export const x = 1;\n", "utf8");
    await writeFile(join(dir, "out-of-scope.md"), "drift\n", "utf8");

    await cmdReview(dir);

    expect(process.exitCode).toBe(1);
    const review = await readFile(join(dir, ".atelier", "epics", epicId, "review.md"), "utf8");
    expect(review).toContain("Overall: FAIL");
    expect(review).toContain("Allowed-files violations: 1");
    expect(review).toMatch(/## Violations[\s\S]*- out-of-scope\.md/);
  });

  test("FAIL when a validation command exits non-zero", async () => {
    const { dir, epicId } = await setupPlanned([
      {
        id: "slice-001",
        title: "Route",
        status: "ready",
        goal: "Add the route",
        depends_on: [],
        allowed_files: ["src/**"],
        acceptance_criteria: ["Route responds 200 on valid creds."],
        validation: ["false"],
      },
    ]);
    await writeFile(join(dir, "src", "login.ts"), "export const x = 1;\n", "utf8");

    await cmdReview(dir);

    expect(process.exitCode).toBe(1);
    const review = await readFile(join(dir, ".atelier", "epics", epicId, "review.md"), "utf8");
    expect(review).toContain("Overall: FAIL");
    expect(review).toContain("Allowed-files violations: 0");
    expect(review).toContain("Failed validations: 1");
    expect(review).toContain("FAIL `false`");
  });
});
