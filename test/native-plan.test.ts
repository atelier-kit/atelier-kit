import { afterEach, describe, expect, test } from "vitest";
import { cmdInit } from "../src/commands/init.js";
import { readActiveEpic, readActiveState, readEpicState } from "../src/protocol/state.js";
import { formatHostPlanFrameworkNudge } from "../src/commands/host-plan-nudge.js";
import {
  tryBootstrapHostPlanFromClaudePrompt,
} from "../src/commands/native-plan.js";
import { tempDir, kitPath } from "./helpers.js";

describe("native-plan Claude hooks", () => {
  let cleanup: () => Promise<void> = async () => {};

  afterEach(async () => {
    await cleanup();
    delete process.env.ATELIER_KIT_ROOT;
  });

  async function initialized() {
    const tmp = await tempDir();
    cleanup = tmp.cleanup;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdInit(tmp.path, { yes: true });
    return tmp.path;
  }

  test("claude prompt hook bootstraps a V2 epic when permission_mode is plan and Atelier is idle", async () => {
    const dir = await initialized();
    await tryBootstrapHostPlanFromClaudePrompt(
      JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        permission_mode: "plan",
        cwd: dir,
        prompt: "Ship feature X with tests",
        session_id: "s1",
      }),
    );

    const active = await readActiveState(dir);
    expect(active.active).toBe(true);
    expect(active.active_epic).toBeTruthy();
    const state = await readEpicState(dir, active.active_epic!);
    expect(state.status).toBe("discovery");
    expect(state.active_skill).toBe("questioner");
  });

  test("framework nudge points at active V2 artifacts and skills", async () => {
    const dir = await initialized();
    await tryBootstrapHostPlanFromClaudePrompt(
      JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        permission_mode: "plan",
        cwd: dir,
        prompt: "Goal for nudge test",
      }),
    );

    const nudge = formatHostPlanFrameworkNudge(await readActiveEpic(dir));
    expect(nudge).toContain(".atelier/epics/");
    expect(nudge).toContain("questions.md");
    expect(nudge).toContain("state.json");
    expect(nudge).toContain("plannotator annotate <artifact-path>");
    expect(nudge).not.toContain(".atelier/context.md");
    expect(nudge).not.toContain(".atelier/plan/");
  });

  test("permission_mode Plan (mixed case) still bootstraps and nudges", async () => {
    const dir = await initialized();
    await tryBootstrapHostPlanFromClaudePrompt(
      JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        permission_mode: "Plan",
        cwd: dir,
        prompt: "Case check",
      }),
    );

    const active = await readActiveState(dir);
    expect(active.active).toBe(true);
    expect(formatHostPlanFrameworkNudge(await readActiveEpic(dir))).toContain("questions.md");
  });

  test("skips bootstrap when permission_mode is not plan", async () => {
    const dir = await initialized();
    await tryBootstrapHostPlanFromClaudePrompt(
      JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        permission_mode: "default",
        cwd: dir,
        prompt: "hello",
      }),
    );

    const active = await readActiveState(dir);
    expect(active.active).toBe(false);
  });

  test("invalid hook payload is ignored", async () => {
    const dir = await initialized();
    await tryBootstrapHostPlanFromClaudePrompt("{not-json");
    const active = await readActiveState(dir);
    expect(active.active).toBe(false);
  });
});
