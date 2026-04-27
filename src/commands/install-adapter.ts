import pc from "picocolors";
import { installAdapter } from "../adapters/index.js";
import type { AdapterName } from "../adapters/types.js";
import { readAtelierConfig, requireInitialized, writeAtelierConfig } from "../protocol/workspace.js";
import { defaultAtelierRc, writeAtelierRc } from "../state/atelierrc.js";

const ADAPTERS = new Set<AdapterName>([
  "claude",
  "cursor",
  "codex",
  "windsurf",
  "cline",
  "kilo",
  "antigravity",
  "generic",
]);

export async function cmdInstallAdapter(
  cwd: string,
  name: string,
): Promise<void> {
  await requireInitialized(cwd);
  if (!ADAPTERS.has(name as AdapterName)) {
    console.error(pc.red(`Invalid adapter: ${name}`));
    process.exitCode = 1;
    return;
  }
  const adapter = name as AdapterName;
  const config = await readAtelierConfig(cwd);
  await writeAtelierConfig(cwd, { ...config, adapter });
  await writeAtelierRc(cwd, defaultAtelierRc({ adapter, mode: config.default_atelier_mode }));
  await installAdapter(cwd, adapter);
  console.log(pc.green(`Installed adapter: ${adapter}`));
}
