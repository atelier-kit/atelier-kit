import { describe, expect, test, afterEach } from "vitest";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { cmdV2Init } from "../src/commands/v2/init.js";
import { cmdV2RenderRules } from "../src/commands/v2/render-rules.js";
import { tempDir, kitPath } from "./helpers.js";

describe("v2 render-rules", () => {
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

  test("cursor adapter creates .cursor/rules/atelier-core.mdc", async () => {
    const cwd = await setup();
    await cmdV2RenderRules(cwd, { adapter: "cursor" });
    const rulePath = join(cwd, ".cursor", "rules", "atelier-core.mdc");
    await access(rulePath);
    const content = await readFile(rulePath, "utf8");
    expect(content).toContain("alwaysApply: true");
    expect(content).toContain("Atelier-Kit is inactive by default");
  });

  test("generic adapter creates atelier-system-prompt.txt", async () => {
    const cwd = await setup();
    await cmdV2RenderRules(cwd, { adapter: "generic" });
    await access(join(cwd, "atelier-system-prompt.txt"));
    const content = await readFile(join(cwd, "atelier-system-prompt.txt"), "utf8");
    expect(content).toContain("Atelier-Kit is inactive by default");
  });

  test("claude-code adapter creates .claude/CLAUDE.md", async () => {
    const cwd = await setup();
    await cmdV2RenderRules(cwd, { adapter: "claude-code" });
    await access(join(cwd, ".claude", "CLAUDE.md"));
  });

  test("codex adapter creates AGENTS.md", async () => {
    const cwd = await setup();
    await cmdV2RenderRules(cwd, { adapter: "codex" });
    await access(join(cwd, "AGENTS.md"));
  });

  test("rendered rules contain the core rule content", async () => {
    const cwd = await setup();
    await cmdV2RenderRules(cwd, { adapter: "generic" });
    const content = await readFile(join(cwd, "atelier-system-prompt.txt"), "utf8");
    expect(content).toContain("When Atelier-Kit is active");
    expect(content).toContain("allowed_actions.write_project_code");
  });
});
