import { cp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  atelierRoot,
  atelierConfigPath,
  activeStatePath,
  protocolDir,
  rulesDir,
  skillsDir,
  schemasDir,
  epicsDir,
  getKitRoot,
} from "./paths.js";
import type { AtelierConfig, ActiveState, AtelierAdapter, AtelierMode } from "./schema.js";

async function writeJson(p: string, data: unknown): Promise<void> {
  await mkdir(join(p, ".."), { recursive: true }).catch(() => {});
  await writeFile(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function defaultAtelierConfig(
  adapter: AtelierAdapter = "generic",
  mode: AtelierMode = "standard",
): AtelierConfig {
  return {
    version: 2,
    protocol: "atelier-planning-protocol",
    default_agent_mode: "native",
    default_atelier_mode: mode,
    adapter,
    rules: {
      activation: "explicit",
      core_max_tokens: 1200,
      skills_load_strategy: "on_demand",
    },
    guards: {
      detect_pre_approval_code_changes: true,
      use_git_diff: true,
    },
  };
}

export function defaultActiveState(): ActiveState {
  return {
    active: false,
    mode: "native",
    active_epic: null,
    active_phase: null,
    active_skill: null,
    updated_at: null,
  };
}

export async function initAtelierProtocol(
  cwd: string,
  adapter: AtelierAdapter,
  mode: AtelierMode,
): Promise<void> {
  const kitRoot = getKitRoot();
  const root = atelierRoot(cwd);

  await mkdir(root, { recursive: true });
  await mkdir(protocolDir(cwd), { recursive: true });
  await mkdir(rulesDir(cwd), { recursive: true });
  await mkdir(join(rulesDir(cwd), "adapters"), { recursive: true });
  await mkdir(skillsDir(cwd), { recursive: true });
  await mkdir(schemasDir(cwd), { recursive: true });
  await mkdir(epicsDir(cwd), { recursive: true });

  const kitProtocol = join(kitRoot, "protocol");
  const kitRules = join(kitRoot, "rules");
  const kitSkills = join(kitRoot, "skills");
  const kitSchemas = join(kitRoot, "schemas");

  await cp(kitProtocol, protocolDir(cwd), { recursive: true });
  await cp(kitRules, rulesDir(cwd), { recursive: true });
  await cp(kitSkills, skillsDir(cwd), { recursive: true });
  await cp(kitSchemas, schemasDir(cwd), { recursive: true });

  await writeJson(atelierConfigPath(cwd), defaultAtelierConfig(adapter, mode));
  await writeJson(activeStatePath(cwd), defaultActiveState());
}
