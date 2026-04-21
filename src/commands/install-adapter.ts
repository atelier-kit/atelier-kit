import pc from "picocolors";
import { AdapterSchema } from "../state/schema.js";
import { installAdapter } from "../adapters/index.js";
import { defaultAtelierRc, readAtelierRc, writeAtelierRc } from "../state/atelierrc.js";

export async function cmdInstallAdapter(
  cwd: string,
  name: string,
): Promise<void> {
  const parsed = AdapterSchema.safeParse(name);
  if (!parsed.success) {
    console.error(pc.red(`Invalid adapter: ${name}`));
    process.exitCode = 1;
    return;
  }
  const rc = await readAtelierRc(cwd).catch(() => defaultAtelierRc());
  await writeAtelierRc(cwd, { ...rc, adapter: parsed.data });
  await installAdapter(cwd, parsed.data);
  console.log(pc.green(`Installed adapter: ${parsed.data}`));
}
