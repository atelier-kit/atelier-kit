import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { activeStatePath, epicDir } from "./paths.js";
import { readAtelierConfig, writeJson, writeEpicState } from "./state.js";
import { defaultEpicState, emptyArtifact } from "./templates.js";
import type { AtelierMode, EpicState, ProtocolSlice, SkillName } from "./schema.js";

const execFileAsync = promisify(execFile);

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "atelier-epic";
}

async function uniqueEpicId(cwd: string, title: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;
  while (true) {
    try {
      await stat(epicDir(cwd, candidate));
      candidate = `${base}-${suffix}`;
      suffix += 1;
    } catch {
      return candidate;
    }
  }
}

async function baselineRef(cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--verify", "HEAD"], {
      cwd,
    });
    return stdout.trim() || "HEAD";
  } catch {
    return "HEAD";
  }
}

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

function artifactStub(artifact: string, state: EpicState): string {
  const heading = artifact
    .replace(/\.md$/, "")
    .split(/[/-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  if (artifact === "questions.md") {
    return `# Questions: ${state.title}

- [repo] Which existing files and patterns constrain this work?
- [tech] Which framework or dependency constraints need verification?
- [business] What user-visible outcomes and edge cases define success?
`;
  }
  if (artifact === "plan.md") {
    return emptyArtifact("plan.md", state.title, state.goal, state.mode);
  }
  return `# ${heading}

Pending.
`;
}

export async function createEpic(cwd: string, params: {
  title: string;
  goal?: string;
  mode?: Exclude<AtelierMode, "native">;
}): Promise<EpicState> {
  const config = await readAtelierConfig(cwd);
  const mode = params.mode ?? config.default_atelier_mode;
  const epicId = await uniqueEpicId(cwd, params.title);
  const state = defaultEpicState({
    epicId,
    title: params.title,
    goal: params.goal ?? params.title,
    mode,
    baselineRef: await baselineRef(cwd),
  });

  await mkdir(join(epicDir(cwd, epicId), "research"), { recursive: true });
  for (const artifact of state.required_artifacts) {
    await writeText(join(epicDir(cwd, epicId), artifact), artifactStub(artifact, state));
  }
  await writeEpicState(cwd, state);
  await writeJson(activeStatePath(cwd), {
    active: true,
    mode: "atelier",
    active_epic: epicId,
    active_phase: state.status,
    active_skill: state.active_skill,
    updated_at: new Date().toISOString(),
  });
  return state;
}

export function skillForStatus(status: string): SkillName | null {
  if (status === "discovery") return "repo-analyst";
  if (status === "synthesis" || status === "planning" || status === "awaiting_approval") return "planner";
  if (status === "design") return "designer";
  if (status === "execution") return "implementer";
  if (status === "review") return "reviewer";
  return null;
}

export function firstReadySlice(state: EpicState): ProtocolSlice | null {
  return state.slices.find((slice) => slice.status === "ready") ?? null;
}

export function allowedActionsForStatus(
  status: EpicState["status"],
): EpicState["allowed_actions"] {
  const executing = status === "execution";
  return {
    read_project_code: true,
    write_project_code: executing,
    write_atelier_files: true,
    run_tests: executing || status === "review",
  };
}
