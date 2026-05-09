import { describe, expect, test } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { listSkillFiles, loadSkill } from "../src/skill-loader.js";
import { tempDir } from "./helpers.js";

describe("skill loader", () => {
  test("loads flat v2 skill files", async () => {
    const tmp = await tempDir();
    try {
      const skills = join(tmp.path, "skills");
      await mkdir(skills, { recursive: true });
      await writeFile(
        join(skills, "planner.md"),
        [
          "---",
          "name: planner",
          "description: Plan active epics",
          "---",
          "",
          "# Planner",
          "",
          "## Instructions",
          "",
          "- Read active state.",
        ].join("\n"),
        "utf8",
      );

      const loaded = await loadSkill(skills, "planner");

      expect(loaded.front.name).toBe("planner");
      expect(loaded.front.description).toBe("Plan active epics");
      expect(loaded.instructions).toContain("Read active state");
    } finally {
      await tmp.cleanup();
    }
  });

  test("ignores legacy SKILL.md directories", async () => {
    const tmp = await tempDir();
    try {
      const skills = join(tmp.path, "skills");
      await mkdir(join(skills, "planner"), { recursive: true });
      await writeFile(
        join(skills, "planner", "SKILL.md"),
        "# Legacy\n\n- Use legacy.\n",
        "utf8",
      );

      const files = await listSkillFiles(skills);

      expect(files).toEqual([]);
      await expect(loadSkill(skills, "planner")).rejects.toThrow();
    } finally {
      await tmp.cleanup();
    }
  });
});
