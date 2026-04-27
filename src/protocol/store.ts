import { readFile, writeFile } from "node:fs/promises";
import {
  ActiveJsonSchema,
  AtelierJsonSchema,
  EpicStateSchema,
  type ActiveJson,
  type AtelierJson,
  type EpicState,
} from "./types.js";
import { activeJsonPath, atelierJsonPath, epicStatePath } from "./paths.js";

export async function readAtelierJson(cwd: string): Promise<AtelierJson> {
  const raw = await readFile(atelierJsonPath(cwd), "utf8");
  return AtelierJsonSchema.parse(JSON.parse(raw));
}

export async function readActiveJson(cwd: string): Promise<ActiveJson> {
  const raw = await readFile(activeJsonPath(cwd), "utf8");
  return ActiveJsonSchema.parse(JSON.parse(raw));
}

export async function writeActiveJson(cwd: string, data: ActiveJson): Promise<void> {
  await writeFile(activeJsonPath(cwd), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function readEpicState(cwd: string, epicSlug: string): Promise<EpicState> {
  const raw = await readFile(epicStatePath(cwd, epicSlug), "utf8");
  return EpicStateSchema.parse(JSON.parse(raw));
}

export async function writeEpicState(
  cwd: string,
  epicSlug: string,
  state: EpicState,
): Promise<void> {
  await writeFile(epicStatePath(cwd, epicSlug), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
