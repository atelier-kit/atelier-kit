import { describe, expect, test, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cmdInit } from "../src/commands/init.js";
import { cmdInstallAdapter } from "../src/commands/install-adapter.js";
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
    expect(prompt).toContain("active_skill: repo-analyst");
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
    expect(cursorRules).toContain("Atelier-Kit is inactive by default");
    expect(cursorRules).toContain("/atelier plan");
  });
});
