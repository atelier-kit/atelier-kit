import pc from "picocolors";
import { validateProtocolV2 } from "../protocol/validator.js";

export async function cmdAtelierValidate(cwd: string): Promise<void> {
  const { ok, issues } = await validateProtocolV2(cwd);
  for (const i of issues) {
    const color = i.level === "error" ? pc.red : pc.yellow;
    console.log(color(`[${i.level}] ${i.message}`));
  }
  if (ok) {
    console.log(pc.green("validate: OK"));
  } else {
    console.log(pc.red("validate: failed"));
    process.exitCode = 1;
  }
}
