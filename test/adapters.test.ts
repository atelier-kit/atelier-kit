import { describe, expect, test, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cmdInit } from "../src/commands/init.js";
import { cmdInstallAdapter } from "../src/commands/install-adapter.js";
import { cmdNew } from "../src/commands/new.js";
import { tempDir, kitPath } from "./helpers.js";

describe("agent adapters include the v2 planning protocol", () => {
  let cleanup: () => Promise<void> = async () => {};

  afterEach(async () => {
    await cleanup();
    delete process.env.ATELIER_KIT_ROOT;
  });

  test("generic adapter prompt explains opt-in activation", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();

    await cmdInit(path, { yes: true });
    await cmdNew(path, "Add payment endpoint", { mode: "quick" });

    const prompt = await readFile(join(path, "atelier-system-prompt.txt"), "utf8");
    expect(prompt).toContain("Atelier-Kit is inactive by default");
    expect(prompt).toContain("`/plan ...` stays in the host agent's native plan mode");
    expect(prompt).toContain(".atelier/epics/<active_epic>/state.json");
  });

  test("cline, kilo, and antigravity adapters render workspace rules", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();

    await cmdInit(path, { yes: true });

    await cmdInstallAdapter(path, "cline");
    const clineRules = await readFile(join(path, ".clinerules", "atelier-core.md"), "utf8");
    expect(clineRules).toContain("Atelier-Kit is inactive by default");

    await cmdInstallAdapter(path, "kilo");
    const kiloRules = await readFile(join(path, ".kilocode", "rules", "atelier-core.md"), "utf8");
    const kiloAgents = await readFile(join(path, "AGENTS.md"), "utf8");
    expect(kiloRules).toContain("atelier validate");
    expect(kiloAgents).toContain("atelier execute");

    await cmdInstallAdapter(path, "antigravity");
    const agRules = await readFile(join(path, ".agent", "rules", "atelier-core.md"), "utf8");
    const gemini = await readFile(join(path, "GEMINI.md"), "utf8");
    expect(agRules).toContain(".atelier/active.json");
    expect(gemini).toContain("atelier new");
  });
});
