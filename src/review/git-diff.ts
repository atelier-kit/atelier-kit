import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Files changed against `baseline` plus untracked files. Returns paths
 * relative to the git root. Returns [] if `cwd` is not a git repo or any git
 * command fails — callers can decide how to surface that.
 */
export async function gitChangedFiles(
  cwd: string,
  baseline: string,
): Promise<string[]> {
  try {
    const { stdout: diff } = await execFileAsync(
      "git",
      ["diff", "--name-only", baseline, "--"],
      { cwd },
    );
    const { stdout: untracked } = await execFileAsync(
      "git",
      ["ls-files", "--others", "--exclude-standard"],
      { cwd },
    );
    return [...diff.split("\n"), ...untracked.split("\n")]
      .map((file) => file.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
