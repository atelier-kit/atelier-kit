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
      "## Plan Checklist",
      "",
      "- [ ] Implementation matches the stated goal.",
      "- [ ] Each planned slice is represented in the changes.",
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
