import pc from "picocolors";
import { validateProtocol } from "../protocol/validator.js";

export async function cmdValidate(cwd: string): Promise<void> {
  const { ok, errors } = await validateProtocol(cwd);
  if (ok) {
    console.log(pc.green("atelier validate: OK"));
  } else {
    console.log(pc.red("atelier validate: failed"));
    for (const e of errors) console.log(pc.dim(`  - ${e}`));
    process.exitCode = 1;
  }
}
