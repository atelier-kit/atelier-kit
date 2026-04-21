import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { atelierDir } from "../fs-utils.js";

const PRESCRIPTIVE = [
  /how\s+(can|could|should)\s+we/i,
  /where\s+(should|would)\s+(be\s+)?(best|better)/i,
  /implement\s+support/i,
  /add\s+support\s+to/i,
  /needs?\s+to\s+change/i,
];

export async function validateQuestionsGate(cwd: string): Promise<{
  ok: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const base = atelierDir(cwd);
  let brief = "";
  let questions = "";
  try {
    brief = await readFile(join(base, "brief.md"), "utf8");
  } catch {
    return { ok: true, errors: [] };
  }
  try {
    questions = await readFile(join(base, "artifacts", "questions.md"), "utf8");
  } catch {
    return { ok: true, errors: [] };
  }
  if (questions.includes("_TBD_") || questions.trim().length < 40) {
    return { ok: true, errors: [] };
  }

  const briefTokens = tokenize(brief);
  const qLower = questions.toLowerCase();

  for (const re of PRESCRIPTIVE) {
    if (re.test(questions)) {
      errors.push(`questions.md matches prescriptive pattern: ${re}`);
    }
  }

  for (const tok of briefTokens) {
    if (tok.length < 5) continue;
    if (qLower.includes(tok)) {
      errors.push(
        `possible intent leak: term "${tok}" appears in both brief.md and questions.md`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 5);
}
