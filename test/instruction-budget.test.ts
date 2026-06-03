import { describe, expect, test } from "vitest";
import { validateInstructionBudget } from "../src/gates/instruction-budget.js";
import { skillsPath } from "./helpers.js";

describe("instruction budget", () => {
  test("shipped skills respect the default max (40)", async () => {
    const { ok, errors } = await validateInstructionBudget(skillsPath(), 40);
    expect(errors, errors.join("\n")).toHaveLength(0);
    expect(ok).toBe(true);
  });
});
