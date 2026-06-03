import { describe, expect, test } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { listSkillFiles, loadSkill } from "../src/skill-loader.js";
import { tempDir } from "./helpers.js";

const SKILL = [
  "---",
  "name: planner",
  "description: Plan and review work",
  "---",
  "",
  "# Planner",
  "",
  "## Instructions",
  "",
  "- Read the work file.",
].join("\n");

describe("skill loader", () => {
  test("discovers folder-based SKILL.md skills", async () => {
    const tmp = await tempDir();
    try {
      const skills = join(tmp.path, "skills");
      await mkdir(join(skills, "planner"), { recursive: true });
      await writeFile(join(skills, "planner", "SKILL.md"), SKILL, "utf8");

      const files = await listSkillFiles(skills);
      expect(files.map((f) => f.name)).toEqual(["planner"]);

      const loaded = await loadSkill(skills, "planner");
      expect(loaded.front.name).toBe("planner");
      expect(loaded.front.description).toBe("Plan and review work");
      expect(loaded.instructions).toContain("Read the work file");
    } finally {
      await tmp.cleanup();
    }
  });

  test("ignores flat markdown files without a SKILL.md folder", async () => {
    const tmp = await tempDir();
    try {
      const skills = join(tmp.path, "skills");
      await mkdir(skills, { recursive: true });
      await writeFile(join(skills, "planner.md"), SKILL, "utf8");

      const files = await listSkillFiles(skills);
      expect(files).toEqual([]);
    } finally {
      await tmp.cleanup();
    }
  });
});
