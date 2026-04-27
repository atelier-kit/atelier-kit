import pc from "picocolors";
import { installAdapter } from "../adapters/index.js";
import { readAtelierConfig, requireInitialized, writeAtelierConfig } from "../protocol/workspace.js";
import { defaultAtelierRc, writeAtelierRc } from "../state/atelierrc.js";
import type { AdapterName } from "../adapters/types.js";

export async function cmdRenderRules(
  cwd: string,
  opts: { adapter?: string },
): Promise<void> {
  await requireInitialized(cwd);
  const config = await readAtelierConfig(cwd);
  const adapter = (opts.adapter ?? config.adapter) as AdapterName;
  await writeAtelierConfig(cwd, { ...config, adapter });
  await writeAtelierRc(cwd, defaultAtelierRc({ adapter, mode: config.default_atelier_mode }));
  await installAdapter(cwd, adapter);
  console.log(pc.green(`Rendered rules for adapter: ${adapter}`));
}
