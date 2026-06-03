import pc from "picocolors";
import { relative } from "node:path";
import { resolveWorkFile } from "../work/discover.js";
import { parseWorkFile } from "../work/parse.js";
import { planReady } from "../work/plan-ready.js";

/**
 * Run the `plan-ready` gate against a work file's `## Plan` slices.
 * Mode-scaled: quick is advisory (always OK), standard/deep enforce the contract.
 */
export async function cmdValidate(
  cwd: string,
  opts: { file?: string; gate?: string } = {},
): Promise<void> {
  let file: string;
  try {
    file = await resolveWorkFile(cwd, opts.file);
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
    return;
  }

  const work = await parseWorkFile(file);
  const { errors, warnings, skipped } = planReady(work);
  const label = `validate ${relative(cwd, file)} (mode=${work.mode})`;

  if (skipped) {
    console.log(pc.green(`${label}: OK (quick mode — contract not required)`));
    return;
  }
  if (errors.length === 0 && warnings.length === 0) {
    console.log(pc.green(`${label}: OK`));
    return;
  }
  if (errors.length === 0) {
    console.log(pc.yellow(`${label}: OK with warnings`));
    for (const w of warnings) console.log(pc.dim(`  ! ${w}`));
    return;
  }
  console.log(pc.red(`${label}: failed`));
  for (const e of errors) console.log(pc.dim(`  - ${e}`));
  for (const w of warnings) console.log(pc.dim(`  ! ${w}`));
  process.exitCode = 1;
}
