import { cp, mkdir, readFile } from "node:fs/promises";
import { getKitRoot } from "../paths.js";
import { writeJson } from "./state.js";
import {
  defaultAtelierConfig,
  inactiveState,
} from "./templates.js";
import type { AdapterName, AtelierMode } from "./schema.js";
import { atelierPath, activeStatePath, atelierConfigPath } from "./paths.js";
import { installAdapter } from "../adapters/index.js";
import type { AdapterName as LegacyAdapterName } from "../adapters/types.js";

async function copyBundledKit(cwd: string): Promise<void> {
  const kit = getKitRoot();
  await cp(kit, atelierPath(cwd), { recursive: true, force: true });
}

export async function initializeProtocol(cwd: string, options?: {
  adapter?: AdapterName;
  mode?: Exclude<AtelierMode, "native">;
}): Promise<{ atelierDir: string }> {
  const adapter = options?.adapter ?? "generic";
  const mode = options?.mode ?? "standard";
  await mkdir(atelierPath(cwd), { recursive: true });
  await copyBundledKit(cwd);

  await writeJson(atelierConfigPath(cwd), defaultAtelierConfig(adapter, mode));
  await writeJson(activeStatePath(cwd), inactiveState());

  await installAdapter(
    cwd,
    adapter as LegacyAdapterName,
  );
  return { atelierDir: atelierPath(cwd) };
}

export async function readRule(cwd: string, adapter: AdapterName): Promise<string> {
  const core = await readFile(atelierPath(cwd, "rules", "core.md"), "utf8");
  const adapterBody = await readFile(
    atelierPath(cwd, "rules", "adapters", `${adapter}.md`),
    "utf8",
  );
  return `${core.trim()}\n\n---\n\n${adapterBody.trim()}\n`;
}
