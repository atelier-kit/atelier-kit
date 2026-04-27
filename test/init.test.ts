import { describe, expect, test, afterEach } from "vitest";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { cmdInit } from "../src/commands/init.js";
import { tempDir, kitPath } from "./helpers.js";

describe("init", () => {
  let cleanup: () => Promise<void> = async () => {};
  afterEach(async () => {
    await cleanup();
    delete process.env.ATELIER_KIT_ROOT;
  });

  test("creates .atelier and generic prompt", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdInit(path, { yes: true });
    await access(join(path, ".atelier", "atelier.json"));
    await access(join(path, ".atelier", "active.json"));
    await access(join(path, ".atelier", "protocol", "workflow.yaml"));
    await access(join(path, ".atelier", "rules", "core.md"));
    await access(join(path, ".atelier", "skills", "questioner.md"));
    await access(join(path, ".atelier", "skills", "repo-analyst.md"));
    await access(join(path, ".atelier", "skills", "tech-analyst.md"));
    await access(join(path, ".atelier", "skills", "business-analyst.md"));
    await access(join(path, ".atelier", "skills", "planner.md"));
    await access(join(path, ".atelier", "skills", "designer.md"));
    await access(join(path, ".atelier", "skills", "implementer.md"));
    await access(join(path, ".atelier", "skills", "reviewer.md"));
    await access(join(path, ".atelier", "schemas", "task.schema.json"));
    await access(join(path, ".atelier", "METHOD.md"));
    await access(join(path, "atelier-system-prompt.txt"));
    const config = JSON.parse(await readFile(join(path, ".atelier", "atelier.json"), "utf8"));
    const active = JSON.parse(await readFile(join(path, ".atelier", "active.json"), "utf8"));
    expect(config.adapter).toBe("generic");
    expect(config.version).toBe(2);
    expect(active.active).toBe(false);
    expect(active.mode).toBe("native");
    const method = await readFile(join(path, ".atelier", "METHOD.md"), "utf8");
    expect(method).toContain("Atelier-Kit v2 is inactive by default");
    expect(method).not.toContain(".atelier/context.md");
    const planner = await readFile(join(path, ".atelier", "skills", "planner.md"), "utf8");
    expect(planner).toContain("## Allowed Writes");
    expect(planner).toContain(".atelier/epics/<active_epic>/state.json");
  });
});
