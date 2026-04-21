import pc from "picocolors";
import { ModeSchema } from "../state/schema.js";
import { readAtelierRc, writeAtelierRc } from "../state/atelierrc.js";

export async function cmdMode(
  cwd: string,
  mode: string,
): Promise<void> {
  const parsed = ModeSchema.safeParse(mode);
  if (!parsed.success) {
    console.error(pc.red(`Invalid mode: ${mode}`));
    process.exitCode = 1;
    return;
  }
  const rc = await readAtelierRc(cwd);
  await writeAtelierRc(cwd, { ...rc, mode: parsed.data });
  console.log(pc.green(`Mode set to ${parsed.data}`));
}
