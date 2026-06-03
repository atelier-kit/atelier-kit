import { access, readdir, stat } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { workDir, workFilePath } from "./paths.js";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve which work file a command should act on:
 * - explicit `.md` path (absolute or relative) → used as-is;
 * - a slug → `.atelier/work/<slug>.md`;
 * - nothing → the single work file, or the most recently modified one.
 */
export async function resolveWorkFile(
  cwd: string,
  arg?: string,
): Promise<string> {
  if (arg) {
    if (arg.endsWith(".md")) {
      const path = isAbsolute(arg) ? arg : resolve(cwd, arg);
      if (await exists(path)) return path;
      throw new Error(`Work file not found: ${arg}`);
    }
    const path = workFilePath(cwd, arg);
    if (await exists(path)) return path;
    throw new Error(`Work file not found for slug "${arg}": ${path}`);
  }

  const dir = workDir(cwd);
  let entries: string[];
  try {
    entries = (await readdir(dir)).filter((f) => f.endsWith(".md"));
  } catch {
    throw new Error(
      `No work files found. Create one with \`atelier new "<title>"\`.`,
    );
  }
  if (entries.length === 0) {
    throw new Error(
      `No work files found in ${dir}. Create one with \`atelier new "<title>"\`.`,
    );
  }
  if (entries.length === 1) return join(dir, entries[0]);

  const withMtime = await Promise.all(
    entries.map(async (name) => {
      const path = join(dir, name);
      return { path, mtime: (await stat(path)).mtimeMs };
    }),
  );
  withMtime.sort((a, b) => b.mtime - a.mtime);
  return withMtime[0].path;
}
