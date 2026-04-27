import { describe, expect, test, afterEach } from "vitest";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { cmdV2Init } from "../src/commands/v2/init.js";
import { cmdV2New } from "../src/commands/v2/new.js";
import { tempDir, kitPath } from "./helpers.js";

describe("v2 new", () => {
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

  test("creates epic directory and state.json", async () => {
    const cwd = await setup();
    await cmdV2New(cwd, "Add payment endpoint", { mode: "quick" });
    const statePath = join(cwd, ".atelier", "epics", "add-payment-endpoint", "state.json");
    await access(statePath);
    const raw = await readFile(statePath, "utf8");
    const state = JSON.parse(raw);
    expect(state.version).toBe(2);
    expect(state.epic_id).toBe("add-payment-endpoint");
    expect(state.title).toBe("Add payment endpoint");
    expect(state.mode).toBe("quick");
    expect(state.status).toBe("discovery");
  });

  test("sets active.json to active=true with correct epic", async () => {
    const cwd = await setup();
    await cmdV2New(cwd, "Add payment endpoint", { mode: "quick" });
    const raw = await readFile(join(cwd, ".atelier", "active.json"), "utf8");
    const active = JSON.parse(raw);
    expect(active.active).toBe(true);
    expect(active.mode).toBe("atelier");
    expect(active.active_epic).toBe("add-payment-endpoint");
    expect(active.active_phase).toBe("discovery");
    expect(active.active_skill).toBe("repo-analyst");
  });

  test("sets allowed_actions.write_project_code=false in discovery", async () => {
    const cwd = await setup();
    await cmdV2New(cwd, "Add payment endpoint", { mode: "quick" });
    const statePath = join(cwd, ".atelier", "epics", "add-payment-endpoint", "state.json");
    const state = JSON.parse(await readFile(statePath, "utf8"));
    expect(state.allowed_actions.write_project_code).toBe(false);
  });

  test("creates questions.md stub", async () => {
    const cwd = await setup();
    await cmdV2New(cwd, "Add payment endpoint", { mode: "quick" });
    await access(join(cwd, ".atelier", "epics", "add-payment-endpoint", "questions.md"));
  });

  test("quick mode has correct required_artifacts", async () => {
    const cwd = await setup();
    await cmdV2New(cwd, "Quick change", { mode: "quick" });
    const state = JSON.parse(
      await readFile(
        join(cwd, ".atelier", "epics", "quick-change", "state.json"),
        "utf8",
      ),
    );
    expect(state.required_artifacts).toContain("questions.md");
    expect(state.required_artifacts).toContain("research/repo.md");
    expect(state.required_artifacts).toContain("plan.md");
    expect(state.required_artifacts).not.toContain("research/tech.md");
  });

  test("standard mode has all research artifacts", async () => {
    const cwd = await setup();
    await cmdV2New(cwd, "Standard feature", { mode: "standard" });
    const state = JSON.parse(
      await readFile(
        join(cwd, ".atelier", "epics", "standard-feature", "state.json"),
        "utf8",
      ),
    );
    expect(state.required_artifacts).toContain("research/repo.md");
    expect(state.required_artifacts).toContain("research/tech.md");
    expect(state.required_artifacts).toContain("research/business.md");
    expect(state.required_artifacts).toContain("synthesis.md");
    expect(state.required_artifacts).toContain("design.md");
  });

  test("deep mode has risk-register and rollback artifacts", async () => {
    const cwd = await setup();
    await cmdV2New(cwd, "Deep migration", { mode: "deep" });
    const state = JSON.parse(
      await readFile(
        join(cwd, ".atelier", "epics", "deep-migration", "state.json"),
        "utf8",
      ),
    );
    expect(state.required_artifacts).toContain("risk-register.md");
    expect(state.required_artifacts).toContain("rollback.md");
    expect(state.required_artifacts).toContain("critique.md");
  });
});
