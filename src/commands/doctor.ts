import pc from "picocolors";
import { doctorProtocol } from "../protocol/validator.js";

export async function cmdDoctor(cwd: string): Promise<void> {
  const result = await doctorProtocol(cwd);
  if (result.ok) {
    console.log(pc.green("doctor: Atelier protocol installation is healthy"));
    return;
  }
  console.log(pc.red("doctor: Atelier protocol has issues"));
  for (const issue of result.errors) console.log(pc.dim(`  - ${issue}`));
  process.exitCode = 1;
}
