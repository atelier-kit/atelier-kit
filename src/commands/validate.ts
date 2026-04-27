import pc from "picocolors";
import { validateProtocol, validateBeforeApproval, validateBeforeExecution } from "../protocol/validator.js";
import { readActiveEpic } from "../protocol/state.js";

const VALID_GATES = ["before-approval", "before-execution"] as const;
type Gate = (typeof VALID_GATES)[number];

export async function cmdValidate(cwd: string, opts: { gate?: string } = {}): Promise<void> {
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
    const errors =
      opts.gate === "before-approval"
        ? await validateBeforeApproval(cwd, state)
        : validateBeforeExecution(state);
    if (errors.length === 0) {
      console.log(pc.green(`atelier validate --gate ${opts.gate}: OK`));
    } else {
      console.log(pc.red(`atelier validate --gate ${opts.gate}: failed`));
      for (const e of errors) console.log(pc.dim(`  - ${e}`));
      process.exitCode = 1;
    }
    return;
  }

  const { ok, errors } = await validateProtocol(cwd);
  if (ok) {
    console.log(pc.green("atelier validate: OK"));
  } else {
    console.log(pc.red("atelier validate: failed"));
    for (const e of errors) console.log(pc.dim(`  - ${e}`));
    process.exitCode = 1;
  }
}
