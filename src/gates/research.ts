import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { atelierDir } from "../fs-utils.js";

const CODE_REF = /[`][^`]+[`]|\.(?:ts|tsx|js|jsx|go|rs|py)|\/[\w.-]+\//;

export async function validateResearchGate(cwd: string): Promise<{
  ok: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const base = atelierDir(cwd);
  let questionsRaw = "";
  let researchRaw = "";
  try {
    questionsRaw = await readFile(join(base, "artifacts", "questions.md"), "utf8");
  } catch {
    return { ok: true, errors: [] };
  }
  if (questionsRaw.includes("_TBD_")) {
    return { ok: true, errors: [] };
  }
  try {
    researchRaw = await readFile(join(base, "artifacts", "research.md"), "utf8");
  } catch {
    errors.push("research.md missing while questions.md exists");
    return { ok: false, errors };
  }
  if (researchRaw.includes("_TBD_")) {
    return { ok: true, errors: [] };
  }

  const qLines = questionsRaw.split("\n").filter((l) => /^\s*[-*]\s/.test(l));
  for (let i = 0; i < qLines.length; i++) {
    const block = sectionForQuestion(researchRaw, i + 1);
    if (!block || !CODE_REF.test(block)) {
      errors.push(
        `Question ${i + 1}: expected answer block with code/path reference`,
      );
    }
  }
  return { ok: errors.length === 0, errors };
}

function sectionForQuestion(research: string, n: number): string {
  const re = new RegExp(
    `^##\\s+Answer:\\s*${n}\\s*$`,
    "m",
  );
  const idx = research.search(re);
  if (idx < 0) return "";
  const rest = research.slice(idx);
  const next = rest.search(/\n##\s+Answer:\s*\d+/);
  return next > 0 ? rest.slice(0, next) : rest;
}
