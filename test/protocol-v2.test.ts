import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { cmdInit } from "../src/commands/init.js";
import { cmdNew } from "../src/commands/new.js";
import { cmdApprove } from "../src/commands/approve.js";
import { cmdExecute } from "../src/commands/execute.js";
import { cmdDone } from "../src/commands/done.js";
import { validateWorkspace } from "../src/protocol/validator.js";

const planContent = [
  "# Plan: Add payment endpoint",
  "",
  "## Goal",
  "",
  "Add a payment endpoint using existing API patterns.",
  "",
  "## Mode",
  "",
  "quick",
  "",
  "## Evidence Summary",
  "",
  "### Repository Evidence",
  "",
  "- Existing route and controller conventions live under src/api.",
  "",
  "### Technical Evidence",
  "",
  "- Optional for quick mode.",
  "",
  "### Business / Product Evidence",
  "",
  "- Optional for quick mode.",
  "",
  "## Assumptions",
  "",
  "- Authentication rules follow the existing middleware pattern.",
  "",
  "## Risks",
  "",
  "| Risk | Impact | Mitigation |",
  "|---|---:|---|",
  "| Route shape mismatch | Medium | Mirror the existing endpoint conventions |",
  "",
  "## Slices",
  "",
  "### Slice 1 - Add route and handler",
  "",
  "**Goal:** Add the route and handler using the current API structure.",
  "",
  "**Allowed files:**",
  "",
  "- `src/api/routes.ts`",
  "- `src/api/payments.ts`",
  "",
  "**Acceptance criteria:**",
  "",
  "- Route exists.",
  "- Handler returns the expected status.",
  "",
  "**Validation:**",
  "",
  "- Run the request test covering the endpoint.",
  "",
  "---",
  "",
  "## Approval",
  "",
  "Status: pending",
  "",
  "Human approval required before implementation.",
  "",
].join("
");

describe("Atelier v2 protocol flow", () => {
  let dir = "";

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "atelier-v2-"));
    process.env.ATELIER_KIT_ROOT = join(process.cwd(), "kit");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    delete process.env.ATELIER_KIT_ROOT;
  });

  test("new creates an active epic ledger", async () => {
    await cmdInit(dir, { yes: true });
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });

    const active = JSON.parse(await readFile(join(dir, ".atelier", "active.json"), "utf8"));
    const state = JSON.parse(await readFile(join(dir, ".atelier", "epics", "add-payment-endpoint", "state.json"), "utf8"));

    expect(active.active).toBe(true);
    expect(active.active_epic).toBe("add-payment-endpoint");
    expect(state.status).toBe("discovery");
    expect(state.allowed_actions.write_project_code).toBe(false);
  });

  test("approve, execute, and done advance the epic lifecycle", async () => {
    await cmdInit(dir, { yes: true });
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });

    const epicDir = join(dir, ".atelier", "epics", "add-payment-endpoint");
    await writeFile(join(epicDir, "plan.md"), planContent, "utf8");

    const statePath = join(epicDir, "state.json");
    const state = JSON.parse(await readFile(statePath, "utf8"));
    state.status = "planning";
    state.active_skill = "planner";
    state.approval.status = "pending";
    await writeFile(statePath, JSON.stringify(state, null, 2) + "
", "utf8");

    await cmdApprove(dir);
    let updated = JSON.parse(await readFile(statePath, "utf8"));
    expect(updated.status).toBe("approved");
    expect(updated.approval.status).toBe("approved");
    expect(updated.slices).toHaveLength(1);

    await cmdExecute(dir);
    updated = JSON.parse(await readFile(statePath, "utf8"));
    expect(updated.status).toBe("execution");
    expect(updated.current_slice).toBe("slice-001");
    expect(updated.allowed_actions.write_project_code).toBe(true);

    await cmdDone(dir);
    updated = JSON.parse(await readFile(statePath, "utf8"));
    expect(updated.status).toBe("review");
    expect(updated.current_slice).toBeNull();
    expect(updated.allowed_actions.write_project_code).toBe(false);
  });

  test("validate reports premature code changes before execution", async () => {
    execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: dir, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Test User"], { cwd: dir, stdio: "ignore" });

    await cmdInit(dir, { yes: true });
    await cmdNew(dir, "Add payment endpoint", { mode: "quick" });
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(join(dir, "src", "app.ts"), "export const app = true;
", "utf8");

    execFileSync("git", ["add", "."], { cwd: dir, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "baseline"], { cwd: dir, stdio: "ignore" });

    await writeFile(join(dir, "src", "app.ts"), "export const app = false;
", "utf8");

    const result = await validateWorkspace(dir);
    expect(result.ok).toBe(false);
    expect(result.violations.join("
")).toContain("Premature project code changes detected before execution");
  });
});
