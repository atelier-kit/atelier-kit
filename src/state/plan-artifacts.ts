import matter from "gray-matter";
import { access, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { atelierDir, writeText } from "../fs-utils.js";
import { readContext } from "./context.js";
import type { ContextMeta, Epic } from "./schema.js";
import { ContextMetaSchema } from "./schema.js";
import { getKitRoot } from "../paths.js";

export const PLANS_SUBDIR = "plan";
export const PLAN_MANIFEST = "manifest.json";
export const PLAN_SNAPSHOT = "context.md";
export const PLAN_REVIEW = "plan.md";
export const PLAN_ARTIFACT_FILES = [
  "questions.md",
  "research.md",
  "design.md",
  "outline.md",
  PLAN_REVIEW,
  "impl-log.md",
  "review.md",
  "decision-log.md",
] as const;

export type PlanArtifactFile = typeof PLAN_ARTIFACT_FILES[number];

const MANIFEST_VERSION = 1 as const;

export type PlanManifestV1 = {
  atelier_plan_manifest_version: typeof MANIFEST_VERSION;
  epic_id: string;
  goal: string;
  created_at: string;
  updated_at: string;
  paths: {
    plan: string;
    context_snapshot: string;
    artifacts?: Record<PlanArtifactFile, string>;
  };
};

/**
 * Slug for plan directory / epic id from a goal string.
 * Matches the previous inline `slugify` in planner.ts.
 */
export function slugifyGoal(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "planner-epic";
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** `.atelier/plan` */
export function plansRoot(cwd: string): string {
  return join(atelierDir(cwd), PLANS_SUBDIR);
}

/** `.atelier/plan/<epicId>` */
export function planDirForEpic(cwd: string, epicId: string): string {
  return join(plansRoot(cwd), epicId);
}

export function artifactPathForEpic(
  cwd: string,
  epicId: string,
  file: PlanArtifactFile,
): string {
  return join(planDirForEpic(cwd, epicId), file);
}

/**
 * Picks a unique epic id: not already used in `epics` and no existing directory
 * with that name under `.atelier/plan/`, using `-2`, `-3`, … when the base slug is taken.
 */
export async function allocateUniquePlanId(
  cwd: string,
  goal: string,
  epics: Epic[],
): Promise<string> {
  const base = slugifyGoal(goal);
  const used = new Set(epics.map((e) => e.id));
  const root = plansRoot(cwd);
  let candidate = base;
  let n = 2;
  for (;;) {
    if (!used.has(candidate) && !(await pathExists(join(root, candidate)))) {
      return candidate;
    }
    candidate = `${base}-${n++}`;
  }
}

function parseManifestJson(raw: string): PlanManifestV1 | null {
  try {
    const data = JSON.parse(raw) as PlanManifestV1;
    if (data?.atelier_plan_manifest_version === MANIFEST_VERSION && data.epic_id) {
      return data;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Resolves the path to the human review plan for the active epic, or the legacy
 * `.atelier/artifacts/plan.md` if missing.
 */
export async function resolveActivePlanPath(
  cwd: string,
  meta: ContextMeta,
): Promise<string> {
  return resolveActiveArtifactPath(cwd, meta, PLAN_REVIEW);
}

export async function resolveActiveArtifactPath(
  cwd: string,
  meta: ContextMeta,
  file: PlanArtifactFile,
): Promise<string> {
  if (meta.current_epic) {
    const underPlan = artifactPathForEpic(cwd, meta.current_epic, file);
    if (await pathExists(underPlan)) {
      return underPlan;
    }
  }
  return join(atelierDir(cwd), "artifacts", file);
}

/**
 * Reads `plan.md` for gates/CLI: active plan under `.atelier/plan/…` or legacy `artifacts/`.
 */
export async function readPlanArtifactContent(
  cwd: string,
  meta: ContextMeta,
): Promise<string> {
  const p = await resolveActivePlanPath(cwd, meta);
  return readFile(p, "utf8");
}

export async function readActiveArtifactContent(
  cwd: string,
  meta: ContextMeta,
  file: PlanArtifactFile,
): Promise<string> {
  const p = await resolveActiveArtifactPath(cwd, meta, file);
  return readFile(p, "utf8");
}

/**
 * Tries per-epic plan (when `current_epic` is set) then always `.atelier/artifacts/plan.md`.
 * Returns `null` if neither file exists.
 */
export async function readAnyPlanMarkdown(cwd: string): Promise<string | null> {
  return readAnyArtifactMarkdown(cwd, PLAN_REVIEW);
}

export async function readAnyArtifactMarkdown(
  cwd: string,
  file: PlanArtifactFile,
): Promise<string | null> {
  try {
    const ctx = await readContext(cwd);
    const { meta } = ctx;
    if (meta.current_epic) {
      const inPlan = artifactPathForEpic(cwd, meta.current_epic, file);
      if (await pathExists(inPlan)) {
        return readFile(inPlan, "utf8");
      }
    }
  } catch {
    // no context or per-epic file — fall through to legacy path
  }
  const legacy = join(atelierDir(cwd), "artifacts", file);
  if (await pathExists(legacy)) {
    return readFile(legacy, "utf8");
  }
  return null;
}

async function readOrCreateManifest(
  dir: string,
  epicId: string,
  goal: string,
  now: string,
): Promise<PlanManifestV1> {
  const p = join(dir, PLAN_MANIFEST);
  if (await pathExists(p)) {
    const raw = await readFile(p, "utf8");
    const existing = parseManifestJson(raw);
    if (existing) {
      return {
        ...existing,
        epic_id: epicId,
        goal: existing.goal || goal,
        updated_at: now,
      };
    }
  }
  return {
    atelier_plan_manifest_version: MANIFEST_VERSION,
    epic_id: epicId,
    goal,
    created_at: now,
    updated_at: now,
    paths: {
      plan: PLAN_REVIEW,
      context_snapshot: PLAN_SNAPSHOT,
      artifacts: Object.fromEntries(
        PLAN_ARTIFACT_FILES.map((file) => [file, file]),
      ) as Record<PlanArtifactFile, string>,
    },
  };
}

export async function ensurePlanArtifactBundle(
  cwd: string,
  meta: ContextMeta,
): Promise<void> {
  const epicId = meta.current_epic;
  if (!epicId) return;
  const dir = planDirForEpic(cwd, epicId);
  await mkdir(dir, { recursive: true });
  const now = new Date().toISOString();
  const epic = meta.epics.find((e) => e.id === epicId);
  const goal = epic?.goal ?? epic?.title ?? epicId;
  const manifest = await readOrCreateManifest(dir, epicId, goal, now);
  manifest.updated_at = now;
  manifest.goal = goal;
  manifest.paths.artifacts = Object.fromEntries(
    PLAN_ARTIFACT_FILES.map((file) => [file, file]),
  ) as Record<PlanArtifactFile, string>;

  for (const file of PLAN_ARTIFACT_FILES) {
    const p = artifactPathForEpic(cwd, epicId, file);
    if (await pathExists(p)) continue;
    await writeText(p, await defaultArtifactBody(file));
  }
  await writeText(
    join(dir, PLAN_MANIFEST),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

async function defaultArtifactBody(file: PlanArtifactFile): Promise<string> {
  if (file === "questions.md" || file === "research.md") {
    return `# ${file.replace(".md", "")}\n\n_Optional in planner-first mode._\n`;
  }
  if (file === PLAN_REVIEW) {
    return "# Plan\n\n_TBD_\n";
  }
  try {
    return await readFile(join(getKitRoot(), "templates", file), "utf8");
  } catch {
    return `# ${file.replace(".md", "")}\n\n_TBD_\n`;
  }
}

/**
 * Writes `plan.md` under the epic’s plan directory, mirrors to `.atelier/artifacts/plan.md`,
 * snapshots context to the plan directory, and updates `manifest.json`.
 */
export async function writePlanBundle(
  cwd: string,
  meta: ContextMeta,
  planMarkdown: string,
): Promise<void> {
  const epicId = meta.current_epic;
  if (!epicId) {
    const legacy = join(atelierDir(cwd), "artifacts", PLAN_REVIEW);
    await writeText(legacy, planMarkdown);
    return;
  }

  const dir = planDirForEpic(cwd, epicId);
  await ensurePlanArtifactBundle(cwd, meta);
  const now = new Date().toISOString();
  const epic = meta.epics.find((e) => e.id === epicId);
  const goal = epic?.goal ?? epic?.title ?? epicId;
  const manifest = await readOrCreateManifest(dir, epicId, goal, now);
  if (!(await pathExists(join(dir, PLAN_MANIFEST)))) {
    manifest.created_at = now;
  }
  manifest.updated_at = now;
  manifest.goal = goal;

  await writeText(join(dir, PLAN_REVIEW), planMarkdown);
  await writeText(
    join(dir, PLAN_MANIFEST),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await writePlanContextSnapshot(cwd, dir);
}

/**
 * Full `.atelier/context.md` snapshot (YAML frontmatter + body) for audit / retomada.
 */
async function writePlanContextSnapshot(cwd: string, planDir: string): Promise<void> {
  const { meta, body } = await readContext(cwd);
  const yaml = {
    ...ContextMetaSchema.parse({ ...meta, updated_at: new Date().toISOString() }),
  };
  const note = `${body ? `${body}\n` : "\n"}\n<!-- atelier: snapshot of .atelier/context.md for this plan folder -->\n`;
  const out = matter.stringify(note, yaml);
  await writeText(join(planDir, PLAN_SNAPSHOT), out);
}
