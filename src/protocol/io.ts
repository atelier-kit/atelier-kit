import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  AtelierConfigSchema,
  ActiveStateSchema,
  EpicStateSchema,
  type AtelierConfig,
  type ActiveState,
  type EpicState,
} from "./schema.js";
import {
  atelierConfigPath,
  activeStatePath,
  epicStatePath,
} from "./paths.js";

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

async function readJson(p: string): Promise<unknown> {
  const text = await readFile(p, "utf8");
  return JSON.parse(text);
}

async function writeJson(p: string, data: unknown): Promise<void> {
  await ensureDir(dirname(p));
  await writeFile(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function readAtelierConfig(cwd: string): Promise<AtelierConfig> {
  const raw = await readJson(atelierConfigPath(cwd));
  return AtelierConfigSchema.parse(raw);
}

export async function writeAtelierConfig(
  cwd: string,
  config: AtelierConfig,
): Promise<void> {
  await writeJson(atelierConfigPath(cwd), config);
}

export async function readActiveState(cwd: string): Promise<ActiveState> {
  const raw = await readJson(activeStatePath(cwd));
  return ActiveStateSchema.parse(raw);
}

export async function writeActiveState(
  cwd: string,
  state: ActiveState,
): Promise<void> {
  await writeJson(activeStatePath(cwd), state);
}

export async function readEpicState(
  cwd: string,
  epicId: string,
): Promise<EpicState> {
  const raw = await readJson(epicStatePath(cwd, epicId));
  return EpicStateSchema.parse(raw);
}

export async function writeEpicState(
  cwd: string,
  epicId: string,
  state: EpicState,
): Promise<void> {
  await writeJson(epicStatePath(cwd, epicId), state);
}
