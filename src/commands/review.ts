import pc from "picocolors";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { epicDir } from "../protocol/paths.js";
import { readActiveEpic, writeActiveState, writeEpicState } from "../protocol/state.js";

const execFileAsync = promisify(execFile);

async function gitChangedFiles(cwd: string, baseline: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["diff", "--name-only", baseline, "--"], { cwd });
    const { stdout: untracked } = await execFileAsync("git", ["ls-files", "--others", "--exclude-standard"], { cwd });
    return [...stdout.split("\n"), ...untracked.split("\n")]
      .map((file) => file.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function globToRegExp(pattern: string): RegExp {
  let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  // Order matters: consume ** (and **/) before single-segment wildcards.
  escaped = escaped.replace(/\*\*\/?/g, "\u0000");
  escaped = escaped.replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]");
  escaped = escaped.replace(/\u0000/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function matchesAny(file: string, patterns: string[]): boolean {
  return patterns.some((pattern) => globToRegExp(pattern).test(file));
}

export function outOfScopeFiles(params: {
  changed: string[];
  allowed: string[];
  ignored: string[];
}): string[] {
  if (params.allowed.length === 0) return [];
  return params.changed.filter(
    (file) => !matchesAny(file, params.ignored) && !matchesAny(file, params.allowed),
  );
}

export async function cmdReview(cwd: string): Promise<void> {
  try {
    const { state } = await readActiveEpic(cwd);
    if (!state) throw new Error("No active Atelier epic.");
    if (state.status !== "planned" && state.status !== "review" && state.status !== "done") {
      throw new Error(`Review requires status=planned or review; current status=${state.status}.`);
    }
    const dir = epicDir(cwd, state.epic_id);
    const plan = await readFile(join(dir, "plan.md"), "utf8");
    const changed = await gitChangedFiles(cwd, state.guards.baseline_ref);
    const allowed = [...new Set(state.slices.flatMap((slice) => slice.allowed_files))];
    const outOfScope = outOfScopeFiles({
      changed,
      allowed,
      ignored: state.guards.allowed_pre_planned_paths,
    });
    const scopeLines = allowed.length === 0
      ? ["- No allowed_files recorded in slices; scope check skipped."]
      : outOfScope.length === 0
        ? [`- OK: all changed files match the planned allowed_files (${allowed.join(", ")}).`]
        : [
            `- Allowed patterns: ${allowed.join(", ")}`,
            "- Files changed outside the planned allowed_files:",
            ...outOfScope.map((file) => `  - ${file}`),
          ];
    if (outOfScope.length > 0) {
      const known = new Set(state.violations);
      for (const file of outOfScope) {
        const violation = `out-of-scope change: ${file}`;
        if (!known.has(violation)) state.violations.push(violation);
      }
    }
    const review = [
      `# Review: ${state.title}`,
      "",
      "## Plan Source",
      "",
      `- .atelier/epics/${state.epic_id}/plan.md`,
      `- Baseline: ${state.guards.baseline_ref}`,
      "",
      "## Changed Files",
      "",
      ...(changed.length ? changed.map((file) => `- ${file}`) : ["- No project changes detected." ]),
      "",
      "## Scope Check (diff × allowed_files)",
      "",
      ...scopeLines,
      "",
      "## Plan Checklist",
      "",
      "- [ ] Implementation matches the stated goal.",
      "- [ ] Each planned slice is represented in the changes.",
      "- [ ] Changed files stay within the planned allowed_files (see Scope Check).",
      "- [ ] Acceptance criteria are satisfied.",
      "- [ ] Validation steps were run or explicitly deferred.",
      "- [ ] Deviations from the plan are documented below.",
      "",
      "## Deviations",
      "",
      "- _None recorded._",
      "",
      "## Plan Excerpt",
      "",
      "```markdown",
      plan.trim(),
      "```",
      "",
    ].join("\n");
    await writeFile(join(dir, "review.md"), review, "utf8");
    state.status = "review";
    state.active_skill = "reviewer";
    await writeEpicState(cwd, state);
    await writeActiveState(cwd, {
      active: true,
      mode: "atelier",
      active_epic: state.epic_id,
      active_phase: state.status,
      active_skill: state.active_skill,
      updated_at: new Date().toISOString(),
    });
    console.log(pc.green(`review: ${state.epic_id} status=review`));
    console.log(pc.dim(`Review artifact: .atelier/epics/${state.epic_id}/review.md`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}
