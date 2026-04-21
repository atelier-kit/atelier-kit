import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateQuestionsGate } from "../src/gates/questions.js";
import { validateResearchGate } from "../src/gates/research.js";

let dir = "";

async function seed(files: Record<string, string>): Promise<void> {
  await mkdir(join(dir, ".atelier", "artifacts"), { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    const p = name.startsWith("artifacts/")
      ? join(dir, ".atelier", name)
      : join(dir, ".atelier", name);
    await writeFile(p, body, "utf8");
  }
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "atk-gates-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("validateQuestionsGate — scope tags and coherence", () => {
  test("missing scope tag fails", async () => {
    await seed({
      "brief.md": "# Brief\n\nGoal: build a thing.",
      "artifacts/questions.md": "# Questions\n\n- Which modules import the auth service?\n",
    });
    const res = await validateQuestionsGate(dir);
    expect(res.ok).toBe(false);
    expect(res.errors.join("\n")).toMatch(/missing scope tag/);
  });

  test("[repo] question with URL is flagged as mis-classified", async () => {
    await seed({
      "brief.md": "# Brief\n\nGoal: build a thing.",
      "artifacts/questions.md":
        "# Questions\n\n- [repo] Check https://example.com/docs for the contract?\n",
    });
    const res = await validateQuestionsGate(dir);
    expect(res.ok).toBe(false);
    expect(res.errors.join("\n")).toMatch(/\[repo\] question contains a URL/);
  });

  test("[tech] question referencing only a repo path is flagged", async () => {
    await seed({
      "brief.md": "# Brief\n\nGoal: build a thing.",
      "artifacts/questions.md":
        "# Questions\n\n- [tech] What does `src/payments/index.ts` export?\n",
    });
    const res = await validateQuestionsGate(dir);
    expect(res.ok).toBe(false);
    expect(res.errors.join("\n")).toMatch(
      /\[tech\] question references a repo-only path/,
    );
  });

  test("well-tagged questions pass", async () => {
    await seed({
      "brief.md": "# Brief\n\nGoal: build a thing.",
      "artifacts/questions.md":
        "# Questions\n\n- [repo] Which modules import the auth service?\n- [tech] What are the rate limits of the target API?\n- [market] How do peer products price their free tier today?\n",
    });
    const res = await validateQuestionsGate(dir);
    expect(res.errors, res.errors.join("\n")).toHaveLength(0);
    expect(res.ok).toBe(true);
  });
});

describe("validateResearchGate — evidence and stage placement", () => {
  const questions =
    "# Questions\n\n- [repo] Which modules import the auth service?\n- [tech] What are the rate limits of the target API?\n- [market] How do peer products price their free tier today?\n";

  test("correct stages + evidence passes", async () => {
    const research = [
      "# Research",
      "",
      "## Stage 1 — Repository mapping (`[repo]`)",
      "",
      "### Answer: 1",
      "- Finding: see `src/auth/index.ts`",
      "",
      "## Stage 2 — External technical research (`[tech]`)",
      "",
      "### Answer: 2",
      "- Finding: 10 rps per key",
      "- Sources: https://docs.example.com/rate-limits",
      "",
      "## Stage 3 — Market and UX benchmark (`[market]`)",
      "",
      "### Answer: 3",
      "- Finding: free tier averages 1k events/mo",
      "- Sources: https://pricing.example.com",
      "",
    ].join("\n");
    await seed({
      "brief.md": "# Brief\n\nGoal: build a thing.",
      "artifacts/questions.md": questions,
      "artifacts/research.md": research,
    });
    const res = await validateResearchGate(dir);
    expect(res.errors, res.errors.join("\n")).toHaveLength(0);
    expect(res.ok).toBe(true);
  });

  test("answer under the wrong stage is flagged", async () => {
    const research = [
      "# Research",
      "",
      "## Stage 1 — Repository mapping (`[repo]`)",
      "",
      "### Answer: 1",
      "- Finding: see `src/auth/index.ts`",
      "",
      "### Answer: 2",
      "- Finding: 10 rps per key",
      "- Sources: https://docs.example.com/rate-limits",
      "",
      "## Stage 2 — External technical research (`[tech]`)",
      "",
      "## Stage 3 — Market and UX benchmark (`[market]`)",
      "",
      "### Answer: 3",
      "- Finding: free tier averages 1k events/mo",
      "- Sources: https://pricing.example.com",
      "",
    ].join("\n");
    await seed({
      "brief.md": "# Brief\n\nGoal: build a thing.",
      "artifacts/questions.md": questions,
      "artifacts/research.md": research,
    });
    const res = await validateResearchGate(dir);
    expect(res.ok).toBe(false);
    expect(res.errors.join("\n")).toMatch(
      /Question 2 \[tech\]: answer block lives under Stage `\[repo\]`/,
    );
  });

  test("missing source URL on a [tech] answer is flagged", async () => {
    const research = [
      "# Research",
      "",
      "## Stage 1 — Repository mapping (`[repo]`)",
      "",
      "### Answer: 1",
      "- Finding: see `src/auth/index.ts`",
      "",
      "## Stage 2 — External technical research (`[tech]`)",
      "",
      "### Answer: 2",
      "- Finding: 10 rps per key (no source)",
      "",
      "## Stage 3 — Market and UX benchmark (`[market]`)",
      "",
      "### Answer: 3",
      "- Finding: free tier averages 1k events/mo",
      "- Sources: https://pricing.example.com",
      "",
    ].join("\n");
    await seed({
      "brief.md": "# Brief\n\nGoal: build a thing.",
      "artifacts/questions.md": questions,
      "artifacts/research.md": research,
    });
    const res = await validateResearchGate(dir);
    expect(res.ok).toBe(false);
    expect(res.errors.join("\n")).toMatch(
      /Question 2 \[tech\]: expected answer block with at least one source URL/,
    );
  });
});
