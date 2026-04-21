import { describe, expect, test } from "vitest";
import { validateInstructionBudget } from "../src/gates/instruction-budget.js";
import { kitPath } from "./helpers.js";

describe("instruction budget", () => {
  test("skills in kit respect default max (40)", async () => {
    const { ok, errors } = await validateInstructionBudget(
      `${kitPath()}/skills`,
      40,
    );
    expect(errors, errors.join("\n")).toHaveLength(0);
    expect(ok).toBe(true);
  });
});
