import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { atelierDir } from "../fs-utils.js";

const CODE_REF = /[`][^`]+[`]|\.(?:ts|tsx|js|jsx|go|rs|py)|\/[\w.-]+\//;
const URL_REF = /https?:\/\/[^\s)]+/i;
const SCOPE_TAG = /^\s*[-*]\s+\[(repo|tech|market)\]\s+/i;
const BULLET = /^\s*[-*]\s+/;
const STAGE_HEADING = /^##\s+Stage\s+\d+[^\n]*?\[(repo|tech|market)\]/gim;
const ANSWER_HEADING = /^#{2,}\s+Answer:\s*(\d+)\s*$/gm;

type Scope = "repo" | "tech" | "market";

interface StageMarker {
  scope: Scope;
  start: number;
}

interface AnswerMarker {
  index: number;
  start: number;
}

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

  const scopes = extractScopes(questionsRaw);
  const stages = extractStages(researchRaw);
  const answers = extractAnswers(researchRaw);

  for (let i = 0; i < scopes.length; i++) {
    const idx = i + 1;
    const scope = scopes[i];
    const answer = answers.find((a) => a.index === idx);
    if (!answer) {
      errors.push(`Question ${idx} (${scope}): missing answer block`);
      continue;
    }
    const block = answerBlock(researchRaw, answer, answers);
    if (scope === "repo") {
      if (!CODE_REF.test(block)) {
        errors.push(
          `Question ${idx} [repo]: expected answer block with code/path reference`,
        );
      }
    } else {
      if (!URL_REF.test(block)) {
        errors.push(
          `Question ${idx} [${scope}]: expected answer block with at least one source URL`,
        );
      }
    }

    if (stages.length > 0) {
      const enclosingStage = stages
        .filter((s) => s.start <= answer.start)
        .pop();
      if (!enclosingStage) {
        errors.push(
          `Question ${idx} [${scope}]: answer block is not under any \`## Stage\` section`,
        );
      } else if (enclosingStage.scope !== scope) {
        errors.push(
          `Question ${idx} [${scope}]: answer block lives under Stage \`[${enclosingStage.scope}]\`; move it under the \`[${scope}]\` stage`,
        );
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function extractScopes(questionsRaw: string): Scope[] {
  const scopes: Scope[] = [];
  const lines = questionsRaw.split("\n");
  for (const line of lines) {
    if (!BULLET.test(line)) continue;
    if (line.replace(BULLET, "").trim().length === 0) continue;
    const m = line.match(SCOPE_TAG);
    scopes.push(((m?.[1] ?? "repo").toLowerCase()) as Scope);
  }
  return scopes;
}

function extractStages(researchRaw: string): StageMarker[] {
  const markers: StageMarker[] = [];
  STAGE_HEADING.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = STAGE_HEADING.exec(researchRaw)) !== null) {
    markers.push({ scope: m[1].toLowerCase() as Scope, start: m.index });
  }
  return markers;
}

function extractAnswers(researchRaw: string): AnswerMarker[] {
  const markers: AnswerMarker[] = [];
  ANSWER_HEADING.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ANSWER_HEADING.exec(researchRaw)) !== null) {
    markers.push({ index: Number(m[1]), start: m.index });
  }
  return markers;
}

function answerBlock(
  researchRaw: string,
  current: AnswerMarker,
  all: AnswerMarker[],
): string {
  const next = all.find((a) => a.start > current.start);
  return researchRaw.slice(current.start, next ? next.start : undefined);
}
