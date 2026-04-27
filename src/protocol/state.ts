import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  ActiveStateSchema,
  AtelierConfigSchema,
  EpicStateSchema,
  type ActiveState,
  type AtelierConfig,
  type EpicState,
} from "./schema.js";
import {
  activeStatePath,
  atelierConfigPath,
  epicDir,
  epicStatePath,
} from "./paths.js";

export async function readJsonFile<T>(
  path: string,
  parse: (value: unknown) => T,
): Promise<T> {
  const raw = await readFile(path, "utf8");
  return parse(JSON.parse(raw));
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readAtelierConfig(cwd: string): Promise<AtelierConfig> {
  return readJsonFile(atelierConfigPath(cwd), (value) =>
    AtelierConfigSchema.parse(value),
  );
}

export async function writeAtelierConfig(
  cwd: string,
  config: AtelierConfig,
): Promise<void> {
  await writeJson(atelierConfigPath(cwd), AtelierConfigSchema.parse(config));
}

export async function readActiveState(cwd: string): Promise<ActiveState> {
  return readJsonFile(activeStatePath(cwd), (value) =>
    ActiveStateSchema.parse(value),
  );
}

export async function writeActiveState(
  cwd: string,
  active: ActiveState,
): Promise<void> {
  await writeJson(activeStatePath(cwd), ActiveStateSchema.parse(active));
}

export async function readEpicState(
  cwd: string,
  epicId: string,
): Promise<EpicState> {
  return readJsonFile(epicStatePath(cwd, epicId), (value) =>
    EpicStateSchema.parse(value),
  );
}

export async function writeEpicState(
  cwd: string,
  state: EpicState,
): Promise<void> {
  await writeJson(epicStatePath(cwd, state.epic_id), EpicStateSchema.parse(state));
}

export async function readActiveEpic(cwd: string): Promise<{
  active: ActiveState;
  state: EpicState | null;
}> {
  const active = await readActiveState(cwd);
  if (!active.active || !active.active_epic) {
    return { active, state: null };
  }
  return { active, state: await readEpicState(cwd, active.active_epic) };
}

export async function ensureEpicDirectories(
  cwd: string,
  epicId: string,
): Promise<void> {
  await mkdir(join(epicDir(cwd, epicId), "research"), { recursive: true });
}

