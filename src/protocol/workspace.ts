import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { writeText } from "../fs-utils.js";
import type { AdapterName } from "../adapters/types.js";
import {
  ActiveStateSchema,
  AtelierModeSchema,
  AtelierConfigSchema,
  EpicStateSchema,
} from "./schema.js";
import {
  activeStatePath,
  atelierConfigPath,
  atelierRoot,
  epicDir,
  epicStatePath,
  epicsDir,
} from "./paths.js";
import {
  allowedActionsForStatus,
  defaultAtelierConfig,
  inactiveActiveState,
  nowIso,
  slugifyTitle,
} from "./templates.js";
import type { ActiveState, AtelierConfig, AtelierMode, EpicState } from "./types.js";

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function ensureAtelierRoot(cwd: string): Promise<string> {
  const root = atelierRoot(cwd);
  await mkdir(root, { recursive: true });
  return root;
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJsonFile(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeAtelierConfig(cwd: string, config: AtelierConfig): Promise<void> {
  await writeJsonFile(atelierConfigPath(cwd), config);
}

export async function readAtelierConfig(cwd: string): Promise<AtelierConfig> {
  return AtelierConfigSchema.parse(await readJsonFile(atelierConfigPath(cwd)));
}

export async function writeActiveState(cwd: string, state: ActiveState): Promise<void> {
  await writeJsonFile(activeStatePath(cwd), state);
}

export async function readActiveState(cwd: string): Promise<ActiveState> {
  return ActiveStateSchema.parse(await readJsonFile(activeStatePath(cwd)));
}

export async function writeEpicState(cwd: string, epicId: string, state: EpicState): Promise<void> {
  await writeJsonFile(epicStatePath(cwd, epicId), state);
}

export async function readEpicState(cwd: string, epicId: string): Promise<EpicState> {
  return EpicStateSchema.parse(await readJsonFile(epicStatePath(cwd, epicId)));
}

export async function requireInitialized(cwd: string): Promise<void> {
  const missing: string[] = [];
  if (!(await pathExists(atelierRoot(cwd)))) missing.push(".atelier/");
  if (!(await pathExists(atelierConfigPath(cwd)))) missing.push(".atelier/atelier.json");
  if (!(await pathExists(activeStatePath(cwd)))) missing.push(".atelier/active.json");
  if (missing.length > 0) {
    throw new Error(`Atelier is not initialized. Missing: ${missing.join(", ")}`);
  }
}

export async function listEpicIds(cwd: string): Promise<string[]> {
  if (!(await pathExists(epicsDir(cwd)))) return [];
  const entries = await readdir(epicsDir(cwd), { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

export async function uniqueEpicId(cwd: string, title: string): Promise<string> {
  const base = slugifyTitle(title);
  const existing = new Set(await listEpicIds(cwd));
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

export function activeStateFromEpic(epicId: string, state: EpicState): ActiveState {
  return {
    active: true,
    mode: "atelier",
    active_epic: epicId,
    active_phase: state.status,
    active_skill: state.active_skill,
    updated_at: nowIso(),
  };
}

export async function getActiveEpicContext(cwd: string): Promise<{
  config: AtelierConfig;
  active: ActiveState;
  epicId: string;
  state: EpicState;
}> {
  const config = await readAtelierConfig(cwd);
  const active = await readActiveState(cwd);
  if (!active.active || !active.active_epic) {
    throw new Error("Atelier is inactive. Start or resume an epic first.");
  }
  const epicId = active.active_epic;
  const state = await readEpicState(cwd, epicId);
  return { config, active, epicId, state };
}

export async function bootstrapWorkspace(cwd: string, adapter: AdapterName, mode: AtelierMode): Promise<void> {
  await ensureAtelierRoot(cwd);
  await writeAtelierConfig(cwd, defaultAtelierConfig(adapter, mode));
  await writeActiveState(cwd, inactiveActiveState());
}

export async function writeArtifacts(cwd: string, epicId: string, artifacts: Record<string, string>): Promise<void> {
  await mkdir(epicDir(cwd, epicId), { recursive: true });
  for (const [artifact, content] of Object.entries(artifacts)) {
    await writeText(`${epicDir(cwd, epicId)}/${artifact}`, content);
  }
}

export function parseRequestedMode(mode: string | undefined, fallback: AtelierMode): AtelierMode {
  if (!mode) return fallback;
  return AtelierModeSchema.parse(mode);
}

export function transitionEpicState(
  state: EpicState,
  status: EpicState["status"],
  overrides: Partial<EpicState> = {},
): EpicState {
  return {
    ...state,
    ...overrides,
    status,
    allowed_actions: allowedActionsForStatus(status),
  };
}

export async function deactivateAtelier(cwd: string): Promise<void> {
  await writeActiveState(cwd, inactiveActiveState());
}
