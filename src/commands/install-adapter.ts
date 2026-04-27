import pc from "picocolors";
import { AdapterSchema } from "../protocol/schema.js";
import { installAdapter } from "../adapters/index.js";
import { readAtelierConfig, writeAtelierConfig } from "../protocol/state.js";
import type { AdapterName as LegacyAdapterName } from "../adapters/types.js";

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
  const config = await readAtelierConfig(cwd);
  await writeAtelierConfig(cwd, { ...config, adapter: parsed.data });
  const legacyAdapter = parsed.data === "claude-code" ? "claude" : parsed.data;
  await installAdapter(cwd, legacyAdapter as LegacyAdapterName);
  console.log(pc.green(`Installed adapter: ${parsed.data}`));
}
