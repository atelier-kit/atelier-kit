import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { writeContext, readContext, defaultContextMeta } from "../src/state/context.js";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  writeAtelierRc,
  defaultAtelierRc,
  readAtelierRc,
} from "../src/state/atelierrc.js";

describe("context + atelierrc", () => {
  let dir = "";
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "atk-ctx-"));
    await mkdir(join(dir, ".atelier"), { recursive: true });
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("roundtrip context.md", async () => {
    await writeContext(
      dir,
      defaultContextMeta({ phase: "plan", gate_pending: null }),
      "note line",
    );
    const { meta, body } = await readContext(dir);
    expect(meta.phase).toBe("plan");
    expect(body).toContain("note line");
  });

  test("roundtrip .atelierrc json", async () => {
    await writeAtelierRc(dir, defaultAtelierRc({ adapter: "cursor", mode: "deep" }));
    const rc = await readAtelierRc(dir);
    expect(rc.adapter).toBe("cursor");
    expect(rc.mode).toBe("deep");
  });
});
