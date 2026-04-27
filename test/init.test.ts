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

  test("creates the v2 .atelier structure and starts inactive", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdInit(path, { yes: true });

    await access(join(path, ".atelier", "atelier.json"));
    await access(join(path, ".atelier", "active.json"));
    await access(join(path, ".atelier", "protocol", "workflow.yaml"));
    await access(join(path, ".atelier", "rules", "core.md"));
    await access(join(path, ".atelier", "skills", "repo-analyst.md"));
    await access(join(path, "atelier-system-prompt.txt"));

    const config = JSON.parse(await readFile(join(path, ".atelier", "atelier.json"), "utf8"));
    const active = JSON.parse(await readFile(join(path, ".atelier", "active.json"), "utf8"));

    expect(config.version).toBe(2);
    expect(config.protocol).toBe("atelier-planning-protocol");
    expect(active.active).toBe(false);
    expect(active.mode).toBe("native");
  });
});
