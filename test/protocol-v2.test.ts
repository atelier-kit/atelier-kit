import { describe, expect, test, afterEach } from "vitest";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { cmdInit } from "../src/commands/init.js";
import { cmdAtelierNew } from "../src/commands/atelier-new.js";
import { validateProtocolV2 } from "../src/protocol/validator.js";
import { cmdAtelierApprove } from "../src/commands/atelier-lifecycle.js";
import { readEpicState, writeEpicState } from "../src/protocol/store.js";
import { tempDir, kitPath } from "./helpers.js";

describe("protocol v2", () => {
  let cleanup: () => Promise<void> = async () => {};
  afterEach(async () => {
    await cleanup();
    delete process.env.ATELIER_KIT_ROOT;
  });

  test("init leaves active=false and validate passes", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdInit(path, { yes: true });
    const active = JSON.parse(await readFile(join(path, ".atelier", "active.json"), "utf8"));
    expect(active.active).toBe(false);
    const { ok, issues } = await validateProtocolV2(path);
    expect(issues.filter((i) => i.level === "error")).toHaveLength(0);
    expect(ok).toBe(true);
  });

  test("atelier new creates epic and discovery state", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdInit(path, { yes: true });
    await cmdAtelierNew(path, "Add payment endpoint", "quick");
    await access(join(path, ".atelier", "epics", "add-payment-endpoint", "state.json"));
    const active = JSON.parse(await readFile(join(path, ".atelier", "active.json"), "utf8"));
    expect(active.active).toBe(true);
    expect(active.active_epic).toBe("add-payment-endpoint");
    const state = await readEpicState(path, "add-payment-endpoint");
    expect(state.status).toBe("discovery");
    expect(state.allowed_actions.write_project_code).toBe(false);
  });

  test("approve updates approval when awaiting_approval", async () => {
    const { path, cleanup: c } = await tempDir();
    cleanup = c;
    process.env.ATELIER_KIT_ROOT = kitPath();
    await cmdInit(path, { yes: true });
    await cmdAtelierNew(path, "Test epic", "quick");
    const epic = "test-epic";
    const st = await readEpicState(path, epic);
    st.status = "awaiting_approval";
    st.approval = { status: "pending", approved_by: null, approved_at: null, notes: null };
    await writeEpicState(path, epic, st);
    await cmdAtelierApprove(path);
    const after = await readEpicState(path, epic);
    expect(after.approval.status).toBe("approved");
    expect(after.status).toBe("approved");
  });
});
