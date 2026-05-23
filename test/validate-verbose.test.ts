import { describe, expect, test, afterEach } from "vitest";
import { cmdInit } from "../src/commands/init.js";
import { cmdValidate } from "../src/commands/validate.js";
import { tempDir, kitPath } from "./helpers.js";

describe("validate --verbose (replaces atelier doctor)", () => {
  let cleanup: () => Promise<void> = async () => {};
  afterEach(async () => {
    await cleanup();
    delete process.env.ATELIER_KIT_ROOT;
  });

  test("passes with inactive native state after init", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdInit(path, { yes: true });
    const prev = process.exitCode;
    process.exitCode = 0;
    await cmdValidate(path, { verbose: true });
    const code = process.exitCode ?? 0;
    process.exitCode = prev;
    expect(code).toBe(0);
  });
});
