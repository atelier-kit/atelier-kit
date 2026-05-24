import pc from "picocolors";
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { epicDir } from "../protocol/paths.js";
import { readActiveEpic, writeActiveState, writeEpicState } from "../protocol/state.js";
import { gitChangedFiles } from "../review/git-diff.js";
import { checkSlices } from "../review/slice-check.js";
import { runValidations } from "../review/validation-runner.js";
import { buildReview } from "../review/report.js";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function cmdReview(
  cwd: string,
  options: { timeoutMs?: number } = {},
): Promise<void> {
  try {
    const { state } = await readActiveEpic(cwd);
    if (!state) throw new Error("No active Atelier epic.");
    if (state.status !== "planned" && state.status !== "review" && state.status !== "done") {
      throw new Error(`Review requires status=planned or review; current status=${state.status}.`);
    }
    const dir = epicDir(cwd, state.epic_id);
    if (!(await exists(join(dir, "plan.md")))) {
      throw new Error(`plan.md not found at .atelier/epics/${state.epic_id}/plan.md`);
    }

    // Atelier's own state directory is bookkeeping, not implementation —
    // exclude it from drift detection so state.json bumps and review.md
    // writes don't count as out-of-scope changes.
    const changedFiles = (await gitChangedFiles(cwd, state.guards.baseline_ref))
      .filter((file) => !file.startsWith(".atelier/"));
    const { perSlice, violations } = checkSlices(state.slices, changedFiles);
    const perSliceWithValidations = await Promise.all(
      perSlice.map(async (match) => ({
        slice: match.slice,
        matchedFiles: match.matchedFiles,
        validations: await runValidations(cwd, match.slice.validation, {
          timeoutMs: options.timeoutMs,
        }),
      })),
    );
    const { markdown, failed } = buildReview({
      state,
      changedFiles,
      perSlice: perSliceWithValidations,
      violations,
    });

    await writeFile(join(dir, "review.md"), markdown, "utf8");
    state.status = "review";
    state.active_skill = "planner";
    await writeEpicState(cwd, state);
    await writeActiveState(cwd, {
      active: true,
      mode: "atelier",
      active_epic: state.epic_id,
      active_phase: state.status,
      active_skill: state.active_skill,
      updated_at: new Date().toISOString(),
    });

    const verdict = failed ? pc.red("FAIL") : pc.green("PASS");
    console.log(`review: ${state.epic_id} ${verdict}`);
    console.log(pc.dim(`  Violations: ${violations.length}`));
    console.log(
      pc.dim(
        `  Failed validations: ${
          perSliceWithValidations.reduce(
            (n, s) => n + s.validations.filter((v) => v.status !== "pass").length,
            0,
          )
        }`,
      ),
    );
    console.log(pc.dim(`  Review artifact: .atelier/epics/${state.epic_id}/review.md`));
    if (failed) process.exitCode = 1;
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}
