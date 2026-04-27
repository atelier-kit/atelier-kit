import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function gitChangedFiles(
  cwd: string,
  ref: string,
): Promise<string[] | null> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["diff", "--name-only", ref],
      { cwd, maxBuffer: 10 * 1024 * 1024 },
    );
    const names = stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return names;
  } catch {
    return null;
  }
}

export async function gitRevParse(
  cwd: string,
  ref: string,
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--verify", ref], {
      cwd,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}
