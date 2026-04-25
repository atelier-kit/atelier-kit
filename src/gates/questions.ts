import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { atelierDir } from "../fs-utils.js";
import { readAnyArtifactMarkdown } from "../state/plan-artifacts.js";

const PRESCRIPTIVE = [
  /how\s+(can|could|should)\s+we/i,
  /where\s+(should|would)\s+(be\s+)?(best|better)/i,
  /implement\s+support/i,
  /add\s+support\s+to/i,
  /needs?\s+to\s+change/i,
];

const SCOPE_TAG = /^\s*[-*]\s+\[(repo|tech|market)\]\s+/i;
const BULLET = /^\s*[-*]\s+/;
const URL_IN_CONTENT = /https?:\/\/[^\s)]+/i;
const REPO_CODE_HINT =
  /`[^`]*\.(?:ts|tsx|js|jsx|go|rs|py|rb|java|kt|swift|cs|sql)`|`[^`]*\/[^`\s]+`|\bsrc\/[\w.-]+/i;

type Scope = "repo" | "tech" | "market";

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
    questions =
      (await readAnyArtifactMarkdown(cwd, "questions.md")) ??
      (await readFile(join(base, "artifacts", "questions.md"), "utf8"));
  } catch {
    return { ok: true, errors: [] };
  }
  if (questions.includes("_TBD_") || questions.trim().length < 40) {
    return { ok: true, errors: [] };
  }

  const briefTokens = tokenize(brief);
  const bulletLines = questions.split("\n").filter((l) => BULLET.test(l));
  const realBullets = bulletLines.filter((l) => l.replace(BULLET, "").trim().length > 0);

  for (const line of realBullets) {
    if (!SCOPE_TAG.test(line)) {
      errors.push(
        `questions.md: bullet missing scope tag [repo|tech|market]: "${line.trim()}"`,
      );
      continue;
    }
    const scope = (line.match(SCOPE_TAG)![1].toLowerCase()) as Scope;
    const content = line.replace(SCOPE_TAG, "").trim();
    const coherence = tagContentCoherence(scope, content);
    if (coherence) {
      errors.push(`questions.md: ${coherence} — "${content}"`);
    }
  }

  const questionBody = realBullets
    .map((l) => l.replace(SCOPE_TAG, "").replace(BULLET, ""))
    .join("\n");
  const qLower = questionBody.toLowerCase();

  for (const re of PRESCRIPTIVE) {
    if (re.test(questionBody)) {
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

function tagContentCoherence(scope: Scope, content: string): string | null {
  const hasUrl = URL_IN_CONTENT.test(content);
  const hasRepoCodeHint = REPO_CODE_HINT.test(content);

  if (scope === "repo" && hasUrl) {
    return "[repo] question contains a URL; external evidence suggests [tech] or [market]";
  }
  if ((scope === "tech" || scope === "market") && hasRepoCodeHint && !hasUrl) {
    return `[${scope}] question references a repo-only path/identifier; may belong under [repo]`;
  }
  return null;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 5);
}
