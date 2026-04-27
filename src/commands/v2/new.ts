import pc from "picocolors";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readAtelierConfig, writeActiveState, writeEpicState } from "../../protocol/io.js";
import {
  epicDir,
  epicStatePath,
  atelierRoot,
  slugify,
} from "../../protocol/paths.js";
import type { AtelierMode, EpicState, ActiveState } from "../../protocol/schema.js";

const MODE_ARTIFACTS: Record<AtelierMode, string[]> = {
  quick: ["questions.md", "research/repo.md", "plan.md", "execution-log.md", "review.md"],
  standard: [
    "questions.md",
    "research/repo.md",
    "research/tech.md",
    "research/business.md",
    "synthesis.md",
    "decisions.md",
    "design.md",
    "plan.md",
    "execution-log.md",
    "review.md",
  ],
  deep: [
    "questions.md",
    "research/repo.md",
    "research/tech.md",
    "research/business.md",
    "synthesis.md",
    "decisions.md",
    "design.md",
    "risk-register.md",
    "rollback.md",
    "test-strategy.md",
    "plan.md",
    "critique.md",
    "execution-log.md",
    "review.md",
  ],
};

const MODE_TASKS: Record<
  AtelierMode,
  Array<{ id: string; type: string; artifact: string }>
> = {
  quick: [{ id: "repo-research", type: "repo", artifact: "research/repo.md" }],
  standard: [
    { id: "repo-research", type: "repo", artifact: "research/repo.md" },
    { id: "tech-research", type: "tech", artifact: "research/tech.md" },
    { id: "business-research", type: "business", artifact: "research/business.md" },
  ],
  deep: [
    { id: "repo-research", type: "repo", artifact: "research/repo.md" },
    { id: "tech-research", type: "tech", artifact: "research/tech.md" },
    { id: "business-research", type: "business", artifact: "research/business.md" },
    { id: "risk-register", type: "risk", artifact: "risk-register.md" },
  ],
};

export async function cmdV2New(
  cwd: string,
  title: string,
  opts: { mode?: string },
): Promise<void> {
  let config;
  try {
    config = await readAtelierConfig(cwd);
  } catch {
    console.log(
      pc.red("No atelier.json found. Run `atelier init` first."),
    );
    process.exitCode = 1;
    return;
  }

  const mode: AtelierMode = (opts.mode as AtelierMode) ?? config.default_atelier_mode ?? "standard";
  const epicId = slugify(title);

  if (!epicId) {
    console.log(pc.red("Invalid epic title — could not generate slug."));
    process.exitCode = 1;
    return;
  }

  const epicBase = epicDir(cwd, epicId);
  await mkdir(epicBase, { recursive: true });
  await mkdir(join(epicBase, "research"), { recursive: true });

  const now = new Date().toISOString();

  const tasks = MODE_TASKS[mode].map((t) => ({
    id: t.id,
    type: t.type,
    status: "pending" as const,
    artifact: t.artifact,
  }));

  const epicState: EpicState = {
    version: 2,
    epic_id: epicId,
    title,
    goal: title,
    mode,
    status: "discovery",
    active_skill: "repo-analyst",
    current_slice: null,
    approval: {
      status: "none",
      approved_by: null,
      approved_at: null,
      notes: null,
    },
    allowed_actions: {
      read_project_code: true,
      write_project_code: false,
      write_atelier_files: true,
      run_tests: false,
    },
    required_artifacts: MODE_ARTIFACTS[mode],
    tasks,
    slices: [],
    guards: {
      baseline_ref: "HEAD",
      allowed_pre_execution_paths: [".atelier/**"],
    },
    violations: [],
  };

  await writeEpicState(cwd, epicId, epicState);

  // Create questions.md stub
  await writeFile(
    join(epicBase, "questions.md"),
    `# Questions: ${title}\n\n_Fill in open questions for the ${mode} research phase._\n`,
    "utf8",
  );

  const activeState: ActiveState = {
    active: true,
    mode: "atelier",
    active_epic: epicId,
    active_phase: "discovery",
    active_skill: "repo-analyst",
    updated_at: now,
  };

  await writeActiveState(cwd, activeState);

  console.log(pc.green(`Epic created: ${epicId}`));
  console.log(pc.dim(`  title:   ${title}`));
  console.log(pc.dim(`  mode:    ${mode}`));
  console.log(pc.dim(`  status:  discovery`));
  console.log(pc.dim(`  skill:   repo-analyst`));
  console.log(pc.dim(`  path:    .atelier/epics/${epicId}/`));
  console.log("");
  console.log(pc.cyan("Atelier is now active. Next steps:"));
  console.log(pc.dim(`  1. Fill in .atelier/epics/${epicId}/questions.md`));
  console.log(pc.dim(`  2. Agent will run repo-analyst to produce research/repo.md`));
  console.log(pc.dim("  3. After all research: agent moves to planning phase"));
  console.log(pc.dim("  4. Run `atelier validate` to check state at any point"));
  console.log(pc.dim("  5. Run `atelier approve` when plan is ready"));
}
