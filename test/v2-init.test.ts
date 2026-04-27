import { describe, expect, test, afterEach } from "vitest";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { cmdV2Init } from "../src/commands/v2/init.js";
import { tempDir, kitPath } from "./helpers.js";

describe("v2 init", () => {
  let cleanup: () => Promise<void> = async () => {};
  afterEach(async () => {
    await cleanup();
    delete process.env.ATELIER_KIT_ROOT;
  });

  test("creates .atelier/atelier.json with version=2", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdV2Init(path, { yes: true });
    const raw = await readFile(join(path, ".atelier", "atelier.json"), "utf8");
    const config = JSON.parse(raw);
    expect(config.version).toBe(2);
    expect(config.protocol).toBe("atelier-planning-protocol");
    expect(config.rules.activation).toBe("explicit");
  });

  test("creates .atelier/active.json with active=false", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdV2Init(path, { yes: true });
    const raw = await readFile(join(path, ".atelier", "active.json"), "utf8");
    const active = JSON.parse(raw);
    expect(active.active).toBe(false);
    expect(active.mode).toBe("native");
    expect(active.active_epic).toBeNull();
  });

  test("creates .atelier/protocol/ directory with workflow.yaml", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdV2Init(path, { yes: true });
    await access(join(path, ".atelier", "protocol", "workflow.yaml"));
    await access(join(path, ".atelier", "protocol", "gates.yaml"));
    await access(join(path, ".atelier", "protocol", "modes.yaml"));
    await access(join(path, ".atelier", "protocol", "skills.yaml"));
  });

  test("creates .atelier/rules/core.md", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdV2Init(path, { yes: true });
    const core = await readFile(join(path, ".atelier", "rules", "core.md"), "utf8");
    expect(core).toContain("Atelier-Kit is inactive by default");
    expect(core).toContain("/atelier");
  });

  test("creates .atelier/skills/ with all skills", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdV2Init(path, { yes: true });
    await access(join(path, ".atelier", "skills", "repo-analyst.md"));
    await access(join(path, ".atelier", "skills", "planner.md"));
    await access(join(path, ".atelier", "skills", "implementer.md"));
    await access(join(path, ".atelier", "skills", "reviewer.md"));
  });

  test("creates .atelier/schemas/ with JSON schemas", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdV2Init(path, { yes: true });
    await access(join(path, ".atelier", "schemas", "atelier.schema.json"));
    await access(join(path, ".atelier", "schemas", "active.schema.json"));
    await access(join(path, ".atelier", "schemas", "epic-state.schema.json"));
  });

  test("respects --adapter and --mode flags in --yes mode", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdV2Init(path, { yes: true, adapter: "cursor", mode: "deep" });
    const raw = await readFile(join(path, ".atelier", "atelier.json"), "utf8");
    const config = JSON.parse(raw);
    expect(config.adapter).toBe("cursor");
    expect(config.default_atelier_mode).toBe("deep");
  });
});
