import { describe, expect, test, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cmdInit } from "../src/commands/init.js";
import { cmdInstallAdapter } from "../src/commands/install-adapter.js";
import { tempDir, kitPath } from "./helpers.js";
import {
  cmdPlannerStart,
  cmdPlannerNext,
  cmdPlannerDone,
} from "../src/commands/planner.js";

describe("agent adapters include planner protocol", () => {
  let cleanup: () => Promise<void> = async () => {};

  afterEach(async () => {
    await cleanup();
    delete process.env.ATELIER_KIT_ROOT;
  });

  test("generic adapter prompt includes /planner commands", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();

    await cmdInit(path, { yes: true });
    await cmdPlannerStart(path, "Migrate Python framework to PHP");
    await cmdPlannerNext(path);
    await cmdPlannerDone(path);

    const prompt = await readFile(join(path, "atelier-system-prompt.txt"), "utf8");
    expect(prompt).toContain("/planner <goal>");
    expect(prompt).toContain("atelier-kit planner start");
    expect(prompt).toContain("current_task:");
  });

  test("cline, kilo, and antigravity adapters render workspace rules", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();

    await cmdInit(path, { yes: true });
    await cmdPlannerStart(path, "Evaluate framework migration");

    await cmdInstallAdapter(path, "cline");
    const clineRules = await readFile(
      join(path, ".clinerules", "atelier-core.md"),
      "utf8",
    );
    expect(clineRules).toContain("/planner <goal>");

    await cmdInstallAdapter(path, "kilo");
    const kiloRules = await readFile(
      join(path, ".kilocode", "rules", "atelier-core.md"),
      "utf8",
    );
    const kiloAgents = await readFile(join(path, "AGENTS.md"), "utf8");
    expect(kiloRules).toContain("atelier-kit planner next");
    expect(kiloAgents).toContain("Current skill");

    await cmdInstallAdapter(path, "antigravity");
    const agRules = await readFile(
      join(path, ".agent", "rules", "atelier-core.md"),
      "utf8",
    );
    const gemini = await readFile(join(path, "GEMINI.md"), "utf8");
    expect(agRules).toContain("atelier-kit planner done");
    expect(gemini).toContain("/planner <goal>");
  });
});
