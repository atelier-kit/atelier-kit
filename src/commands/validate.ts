import pc from "picocolors";
import { doctorProtocol, validateProtocol, validatePlanReady } from "../protocol/validator.js";
import { readActiveEpic } from "../protocol/state.js";

const VALID_GATES = ["plan-ready"] as const;
type Gate = (typeof VALID_GATES)[number];

export async function cmdValidate(
  cwd: string,
  opts: { gate?: string; verbose?: boolean } = {},
): Promise<void> {
  if (opts.gate !== undefined) {
    if (!VALID_GATES.includes(opts.gate as Gate)) {
      console.error(pc.red(`Unknown gate: ${opts.gate}. Valid gates: ${VALID_GATES.join(", ")}`));
      process.exitCode = 1;
      return;
    }
    const { state } = await readActiveEpic(cwd);
    if (!state) {
      console.error(pc.red("No active Atelier epic."));
      process.exitCode = 1;
      return;
    }
    const { errors, warnings } = await validatePlanReady(cwd, state);
    if (errors.length === 0 && warnings.length === 0) {
      console.log(pc.green(`atelier validate --gate ${opts.gate}: OK`));
    } else if (errors.length === 0) {
      console.log(pc.yellow(`atelier validate --gate ${opts.gate}: OK with warnings`));
      for (const w of warnings) console.log(pc.dim(`  ! ${w}`));
    } else {
      console.log(pc.red(`atelier validate --gate ${opts.gate}: failed`));
      for (const e of errors) console.log(pc.dim(`  - ${e}`));
      for (const w of warnings) console.log(pc.dim(`  ! ${w}`));
      process.exitCode = 1;
    }
    return;
  }

  const { ok, errors } = opts.verbose
    ? await doctorProtocol(cwd)
    : await validateProtocol(cwd);
  const label = opts.verbose ? "atelier validate --verbose" : "atelier validate";
  if (ok) {
    console.log(pc.green(`${label}: OK`));
  } else {
    console.log(pc.red(`${label}: failed`));
    for (const e of errors) console.log(pc.dim(`  - ${e}`));
    process.exitCode = 1;
  }
}
