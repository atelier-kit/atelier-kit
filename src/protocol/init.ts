import { cp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getKitRoot } from "../paths.js";
import { atelierDir, ensureDir, writeText } from "../fs-utils.js";
import {
  activeJsonPath,
  atelierJsonPath,
  protocolDir,
  rulesDir,
  schemasDir,
  skillsDirV2,
} from "./paths.js";
import { defaultAtelierJson, inactiveActiveJson } from "./defaults.js";
import type { AdapterName } from "../adapters/types.js";
import type { AtelierAdapterId } from "./types.js";

const V2_SKILL_FILES = [
  "repo-analyst.md",
  "tech-analyst.md",
  "business-analyst.md",
  "planner.md",
  "designer.md",
  "implementer.md",
  "reviewer.md",
] as const;

function rcAdapterToProtocolAdapter(adapter: AdapterName): AtelierAdapterId {
  if (adapter === "claude") return "claude-code";
  if (adapter === "antigravity" || adapter === "kilo") return "generic";
  return adapter as AtelierAdapterId;
}

export async function installProtocolV2(
  cwd: string,
  adapter: AdapterName,
  defaultAtelierMode: "quick" | "standard" | "deep",
): Promise<void> {
  const kit = getKitRoot();
  const dest = atelierDir(cwd);
  await ensureDir(dest);
  await mkdir(join(dest, "epics"), { recursive: true });

  await cp(join(kit, "protocol"), protocolDir(cwd), { recursive: true });
  await cp(join(kit, "rules"), rulesDir(cwd), { recursive: true });
  await cp(join(kit, "schemas"), schemasDir(cwd), { recursive: true });

  const skillsDest = skillsDirV2(cwd);
  await ensureDir(skillsDest);
  for (const f of V2_SKILL_FILES) {
    await cp(join(kit, "skills", f), join(skillsDest, f));
  }

  const protoAdapter = rcAdapterToProtocolAdapter(adapter);
  const atelierJson = defaultAtelierJson(protoAdapter);
  atelierJson.default_atelier_mode = defaultAtelierMode;

  await writeText(atelierJsonPath(cwd), `${JSON.stringify(atelierJson, null, 2)}\n`);
  await writeText(
    activeJsonPath(cwd),
    `${JSON.stringify(inactiveActiveJson(), null, 2)}\n`,
  );
}
