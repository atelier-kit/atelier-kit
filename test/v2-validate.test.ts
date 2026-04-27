import { describe, expect, test, afterEach } from "vitest";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { cmdV2Init } from "../src/commands/v2/init.js";
import { cmdV2New } from "../src/commands/v2/new.js";
import {
  validateAtelierConfig,
  validateActiveState,
  validateEpicState,
} from "../src/protocol/validator.js";
import { tempDir, kitPath } from "./helpers.js";
import type { EpicState } from "../src/protocol/schema.js";

describe("v2 validate", () => {
  let cleanup: () => Promise<void> = async () => {};
  afterEach(async () => {
    await cleanup();
    delete process.env.ATELIER_KIT_ROOT;
  });

  async function setup() {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdV2Init(path, { yes: true });
    return path;
  }

  test("atelier.json validates after init", async () => {
    const cwd = await setup();
    const result = await validateAtelierConfig(cwd);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("active.json validates after init with active=false (native mode)", async () => {
    const cwd = await setup();
    const result = await validateActiveState(cwd);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("epic state.json validates after new", async () => {
    const cwd = await setup();
    await cmdV2New(cwd, "Add payment endpoint", { mode: "quick" });
    const result = await validateEpicState(cwd, "add-payment-endpoint");
    // No required artifacts exist yet, so validation flags missing artifacts
    expect(result.errors.some((e) => e.includes("questions.md") === false)).toBe(true);
  });

  test("before_execution gate fails when status=awaiting_approval and approval=pending", async () => {
    const cwd = await setup();
    await cmdV2New(cwd, "Awaiting approval epic", { mode: "quick" });

    const statePath = join(
      cwd,
      ".atelier",
      "epics",
      "awaiting-approval-epic",
      "state.json",
    );
    const state: EpicState = JSON.parse(await readFile(statePath, "utf8"));
    const updated: EpicState = {
      ...state,
      status: "awaiting_approval",
      approval: { status: "pending", approved_by: null, approved_at: null, notes: null },
    };
    await writeFile(statePath, JSON.stringify(updated, null, 2), "utf8");

    const result = await validateEpicState(cwd, "awaiting-approval-epic");
    // awaiting_approval with slices=0 fails before_approval gate
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("slice"))).toBe(true);
  });

  test("before_execution gate fails for execution without approval", async () => {
    const cwd = await setup();
    await cmdV2New(cwd, "Unapproved execution", { mode: "quick" });

    const statePath = join(
      cwd,
      ".atelier",
      "epics",
      "unapproved-execution",
      "state.json",
    );
    const state: EpicState = JSON.parse(await readFile(statePath, "utf8"));
    const updated: EpicState = {
      ...state,
      status: "execution",
      approval: { status: "none", approved_by: null, approved_at: null, notes: null },
    };
    await writeFile(statePath, JSON.stringify(updated, null, 2), "utf8");

    const result = await validateEpicState(cwd, "unapproved-execution");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("approval.status must be 'approved'"))).toBe(
      true,
    );
  });

  test("state.json missing approval field fails validation", async () => {
    const cwd = await setup();
    await cmdV2New(cwd, "No approval epic", { mode: "quick" });

    const statePath = join(cwd, ".atelier", "epics", "no-approval-epic", "state.json");
    const state = JSON.parse(await readFile(statePath, "utf8"));
    delete state.approval;
    await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");

    const result = await validateEpicState(cwd, "no-approval-epic");
    expect(result.ok).toBe(false);
  });

  test("slice missing acceptance_criteria fails before_approval gate", async () => {
    const cwd = await setup();
    await cmdV2New(cwd, "Bad slice epic", { mode: "quick" });

    const statePath = join(cwd, ".atelier", "epics", "bad-slice-epic", "state.json");
    const state: EpicState = JSON.parse(await readFile(statePath, "utf8"));
    const updated: EpicState = {
      ...state,
      status: "awaiting_approval",
      approval: { status: "pending", approved_by: null, approved_at: null, notes: null },
      slices: [
        {
          id: "slice-001",
          title: "Bad slice",
          status: "ready",
          goal: "Do something",
          depends_on: [],
          allowed_files: [],
          acceptance_criteria: [],
          validation: ["run tests"],
        },
      ],
    };
    await writeFile(statePath, JSON.stringify(updated, null, 2), "utf8");

    const result = await validateEpicState(cwd, "bad-slice-epic");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("acceptance_criteria"))).toBe(true);
  });
});
