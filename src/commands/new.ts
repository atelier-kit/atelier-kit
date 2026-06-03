import pc from "picocolors";
import { access } from "node:fs/promises";
import { relative } from "node:path";
import { isMode, type Mode } from "../work/types.js";
import { slugify, workFilePath } from "../work/paths.js";
import { workTemplate } from "../work/template.js";
import { writeText } from "../fs-utils.js";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Create a single `.atelier/work/<slug>.md` from the template. Convenience only. */
export async function cmdNew(
  cwd: string,
  title: string,
  opts: { mode?: string } = {},
): Promise<void> {
  let mode: Mode = "standard";
  if (opts.mode) {
    if (!isMode(opts.mode)) {
      console.error(
        pc.red(`Invalid mode: ${opts.mode}. Use quick | standard | deep.`),
      );
      process.exitCode = 1;
      return;
    }
    mode = opts.mode;
  }

  const slug = slugify(title);
  const path = workFilePath(cwd, slug);
  if (await exists(path)) {
    console.error(pc.red(`Work already exists: ${relative(cwd, path)}`));
    process.exitCode = 1;
    return;
  }

  await writeText(path, workTemplate(title, mode));
  console.log(pc.green(`Created work: ${slug} (mode=${mode})`));
  console.log(pc.dim(relative(cwd, path)));
}
