import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { atelierDir } from "../fs-utils.js";
import type { ContextMeta, Task } from "../state/schema.js";
import { readAnyArtifactMarkdown, readActiveArtifactContent } from "../state/plan-artifacts.js";

const CODE_REF = /[`][^`]+[`]|\.(?:ts|tsx|js|jsx|go|rs|py)|\/[\w.-]+\//;
const URL_REF = /https?:\/\/[^\s)]+/i;
const CHECKED_REF = /(?:checked\s+at|checked|version|date|data|vers[aã]o|fecha)\s*:/i;
const IMPACT_REF = /(?:impact\s+on\s+plan|impact|impacto\s+no\s+plano|impacto|impacto\s+en\s+el\s+plan)\s*:/i;
const BLOCKED_REF = /status\s*:\s*blocked|blocked|bloquead[oa]|bloqueado|bloqueada/i;
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
    questionsRaw =
      (await readAnyArtifactMarkdown(cwd, "questions.md")) ??
      (await readFile(join(base, "artifacts", "questions.md"), "utf8"));
  } catch {
    return { ok: true, errors: [] };
  }
  if (questionsRaw.includes("_TBD_")) {
    return { ok: true, errors: [] };
  }
  try {
    researchRaw =
      (await readAnyArtifactMarkdown(cwd, "research.md")) ??
      (await readFile(join(base, "artifacts", "research.md"), "utf8"));
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

export async function validatePlannerTechnicalResearchGate(
  cwd: string,
  meta: ContextMeta,
): Promise<{
  ok: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const techTasks = meta.tasks.filter((task) => task.type === "tech");
  if (techTasks.length === 0) {
    return { ok: true, errors };
  }

  let researchRaw = "";
  try {
    researchRaw = await readActiveArtifactContent(cwd, meta, "research.md");
  } catch {
    for (const task of techTasks) {
      if (task.evidence_refs.length === 0) {
        errors.push(`${task.id}: technical research evidence is missing`);
      }
    }
    return { ok: errors.length === 0, errors };
  }

  const techStage = extractStageBlock(researchRaw, "tech");
  const optionalTemplate = /_Optional in planner-first mode\._/i.test(researchRaw);
  for (const task of techTasks) {
    if (task.evidence_refs.length > 0) continue;
    if (!techStage || optionalTemplate) {
      errors.push(`${task.id}: missing Stage 2 technical research evidence`);
      continue;
    }
    const stageErrors = validateTechEvidenceBlock(techStage, task);
    errors.push(...stageErrors.map((err) => `${task.id}: ${err}`));
  }

  return { ok: errors.length === 0, errors };
}

export function validateTechEvidenceBlock(block: string, task?: Task): string[] {
  const errors: string[] = [];
  if (block.trim().length === 0) {
    return ["technical research block is empty"];
  }
  const blocked = BLOCKED_REF.test(block);
  if (!blocked && !URL_REF.test(block)) {
    errors.push("expected at least one source URL or explicit blocked status");
  }
  if (!CHECKED_REF.test(block)) {
    errors.push("expected checked date or version metadata");
  }
  if (!IMPACT_REF.test(block)) {
    errors.push("expected impact on plan");
  }
  if (task?.open_questions.length && !/answer:\s*\d+/i.test(block) && !/finding\s*:/i.test(block)) {
    errors.push("expected answer or finding entries for technical open questions");
  }
  return errors;
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

function extractStageBlock(researchRaw: string, scope: Scope): string | null {
  const stages = extractStages(researchRaw);
  const current = stages.find((stage) => stage.scope === scope);
  if (!current) return null;
  const next = stages.find((stage) => stage.start > current.start);
  return researchRaw.slice(current.start, next ? next.start : undefined);
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
