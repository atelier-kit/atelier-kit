import { afterEach, describe, expect, test } from "vitest";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cmdInit } from "../src/commands/init.js";
import { cmdNew } from "../src/commands/new.js";
import { readEpicState, writeEpicState } from "../src/protocol/state.js";
import { validatePlanReady } from "../src/protocol/validator.js";
import { tempDir, kitPath } from "./helpers.js";
import type { EpicState, ProtocolSlice } from "../src/protocol/schema.js";

function tightSlice(overrides: Partial<ProtocolSlice> = {}): ProtocolSlice {
  return {
    id: "slice-001",
    title: "Login route",
    status: "ready",
    goal: "Add POST /login endpoint with JWT issuance",
    depends_on: [],
    allowed_files: ["src/auth/login.ts", "src/auth/login.test.ts"],
    acceptance_criteria: [
      "POST /login returns 200 with valid creds and includes a JWT in the response body.",
      "POST /login returns 401 when credentials are invalid.",
    ],
    validation: ["pnpm test src/auth/login.test.ts"],
    ...overrides,
  };
}

function plan(title: string, body?: { risks?: string }): string {
  const risks = body?.risks ?? `| Risk | Impact | Mitigation |
|---|---:|---|
| Token leak in logs | High | Redact secrets in logger middleware |`;
  return [
    `# Plan: ${title}`,
    "",
    "## Goal",
    "",
    "Add a login endpoint with JWT.",
    "",
    "## Risks",
    "",
    risks,
    "",
    "## Slices",
    "",
    "### Slice 1 - Login route",
    "",
    "**Goal:** Add POST /login endpoint with JWT issuance",
    "",
    "**Acceptance criteria:**",
    "",
    "- POST /login returns 200 with valid creds and includes a JWT in the response body.",
    "- POST /login returns 401 when credentials are invalid.",
    "",
    "**Validation:**",
    "",
    "- pnpm test src/auth/login.test.ts",
    "",
  ].join("\n");
}

async function setupPlanned(
  mode: "quick" | "standard" | "deep",
  slices: ProtocolSlice[],
  planBody?: { risks?: string },
): Promise<{ dir: string; state: EpicState; cleanup: () => Promise<void> }> {
  const tmp = await tempDir();
  process.env.ATELIER_KIT_ROOT = kitPath();
  await cmdInit(tmp.path, { yes: true });
  await cmdNew(tmp.path, "Add login", { mode });
  const state = await readEpicState(tmp.path, "add-login");
  state.status = "planned";
  state.active_skill = null;
  state.slices = slices;
  state.tasks = state.tasks.map((task) => ({ ...task, status: "done" as const }));
  await writeEpicState(tmp.path, state);
  await writeFile(
    join(tmp.path, ".atelier", "epics", state.epic_id, "plan.md"),
    plan("Add login", planBody),
    "utf8",
  );
  return {
    dir: tmp.path,
    state,
    cleanup: async () => {
      await tmp.cleanup();
      delete process.env.ATELIER_KIT_ROOT;
    },
  };
}

describe("validatePlanReady heuristics", () => {
  let cleanup: () => Promise<void> = async () => {};
  afterEach(async () => { await cleanup(); });

  test("PASS for a tight slice with executable validation", async () => {
    const ctx = await setupPlanned("quick", [tightSlice()]);
    cleanup = ctx.cleanup;
    const { errors, warnings } = await validatePlanReady(ctx.dir, ctx.state);
    expect(errors, errors.join("\n")).toHaveLength(0);
    expect(warnings, warnings.join("\n")).toHaveLength(0);
  });

  test("ERROR when a slice declares no allowed_files", async () => {
    const ctx = await setupPlanned("quick", [tightSlice({ allowed_files: [] })]);
    cleanup = ctx.cleanup;
    const { errors } = await validatePlanReady(ctx.dir, ctx.state);
    expect(errors.some((e) => e.includes("missing allowed_files"))).toBe(true);
  });

  test("ERROR when allowed_files contains a catch-all pattern like src/**", async () => {
    const ctx = await setupPlanned("quick", [tightSlice({ allowed_files: ["src/**"] })]);
    cleanup = ctx.cleanup;
    const { errors } = await validatePlanReady(ctx.dir, ctx.state);
    expect(errors.some((e) => e.includes("too broad"))).toBe(true);
    expect(errors.some((e) => e.includes("src/**"))).toBe(true);
  });

  test("ERROR for bare ** as well", async () => {
    const ctx = await setupPlanned("quick", [tightSlice({ allowed_files: ["**"] })]);
    cleanup = ctx.cleanup;
    const { errors } = await validatePlanReady(ctx.dir, ctx.state);
    expect(errors.some((e) => e.includes("too broad"))).toBe(true);
  });

  test("WARNING for a vague acceptance criterion", async () => {
    const ctx = await setupPlanned("quick", [
      tightSlice({ acceptance_criteria: ["Works"] }),
    ]);
    cleanup = ctx.cleanup;
    const { errors, warnings } = await validatePlanReady(ctx.dir, ctx.state);
    expect(errors).toHaveLength(0);
    expect(warnings.some((w) => w.includes("vague"))).toBe(true);
  });

  test("WARNING when no validation entry looks executable", async () => {
    const ctx = await setupPlanned("quick", [
      tightSlice({ validation: ["Run the tests by hand", "Eyeball the response"] }),
    ]);
    cleanup = ctx.cleanup;
    const { errors, warnings } = await validatePlanReady(ctx.dir, ctx.state);
    expect(errors).toHaveLength(0);
    expect(warnings.some((w) => w.includes("no recognizable executable command"))).toBe(true);
  });

  test("ERROR for deep mode with placeholder Risks", async () => {
    const ctx = await setupPlanned(
      "deep",
      [tightSlice()],
      { risks: "| Risk | Impact | Mitigation |\n|---|---:|---|\n| _Pending_ | _TBD_ | _TBD_ |" },
    );
    cleanup = ctx.cleanup;
    const { errors } = await validatePlanReady(ctx.dir, ctx.state);
    expect(errors.some((e) => e.includes("populated ## Risks"))).toBe(true);
  });

  test("PASS for deep mode with a real risk row", async () => {
    const ctx = await setupPlanned("deep", [tightSlice()]);
    cleanup = ctx.cleanup;
    const { errors } = await validatePlanReady(ctx.dir, ctx.state);
    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});
