import { describe, expect, test, afterEach } from "vitest";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { cmdInit } from "../src/commands/init.js";
import { cmdInstallAdapter } from "../src/commands/install-adapter.js";
import { cmdRenderRules } from "../src/commands/rules.js";
import { tempDir, kitPath } from "./helpers.js";
import { cmdNew } from "../src/commands/new.js";

describe("agent adapters include planner protocol", () => {
  let cleanup: () => Promise<void> = async () => {};

  afterEach(async () => {
    await cleanup();
    delete process.env.ATELIER_KIT_ROOT;
  });

  test("generic adapter prompt includes Atelier activation rules", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();

    await cmdInit(path, { yes: true });
    await cmdNew(path, "Migrate Python framework to PHP", { mode: "quick" });
    await cmdInstallAdapter(path, "generic");

    const prompt = await readFile(join(path, "atelier-system-prompt.txt"), "utf8");
    expect(prompt).toContain("/atelier quick");
    expect(prompt).toContain(".atelier/active.json");
    expect(prompt).toContain("active_skill: questioner");
  });

  test("cursor adapter renders workspace rules", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();

    await cmdInit(path, { yes: true });
    await cmdInstallAdapter(path, "cursor");
    const cursorRules = await readFile(
      join(path, ".cursor", "rules", "atelier-core.mdc"),
      "utf8",
    );
    expect(cursorRules).toContain("Atelier is **off** unless");
    expect(cursorRules).toContain("/atelier plan");
  });

  test("render-rules writes adapter files", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();

    await cmdInit(path, { yes: true });
    await cmdRenderRules(path, "cursor");

    const cursorRules = await readFile(
      join(path, ".cursor", "rules", "atelier-core.mdc"),
      "utf8",
    );
    expect(cursorRules).toContain("Atelier is **off** unless");
    expect(cursorRules).toContain("/plan ...");
  });

  test("render-rules writes generic agent instructions", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();

    await cmdInit(path, { yes: true });
    await cmdRenderRules(path, "generic");

    const agents = await readFile(join(path, "atelier-system-prompt.txt"), "utf8");
    expect(agents).toContain("Atelier is **off** unless");
    expect(agents).toContain("/atelier quick");
  });

  test("claude adapter installs command spec and mirrored skills", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();

    await cmdInit(path, { yes: true });
    await cmdInstallAdapter(path, "claude-code");

    const claude = await readFile(join(path, "CLAUDE.md"), "utf8");
    const command = await readFile(join(path, ".claude", "commands", "atelier.md"), "utf8");
    await access(join(path, ".claude", "skills", "atelier", "planner.md"));

    expect(claude).toContain("/plan ...");
    expect(claude).toContain("/atelier plan");
    expect(command).toContain('atelier new "<goal>" --mode standard');
  });

  test.each([
    ["gemini-cli", "GEMINI.md"],
    ["antigravity", ".antigravity/atelier.md"],
    ["kiro", ".kiro/steering/atelier.md"],
    ["kilo", ".kilocode/rules/atelier.md"],
  ])("%s adapter installs its market-agent rule file", async (adapter, file) => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();

    await cmdInit(path, { yes: true });
    await cmdInstallAdapter(path, adapter);

    const rules = await readFile(join(path, file), "utf8");
    expect(rules).toContain("Atelier-Kit is an opt-in planning protocol");
    expect(rules).toContain("/atelier quick");
  });
});
