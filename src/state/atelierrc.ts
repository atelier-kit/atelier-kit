import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AtelierRcSchema, type AtelierRc } from "./schema.js";
import { CONFIG_FILE } from "../paths.js";

export async function readAtelierRc(cwd: string): Promise<AtelierRc> {
  const p = join(cwd, CONFIG_FILE);
  const raw = await readFile(p, "utf8");
  return AtelierRcSchema.parse(JSON.parse(raw));
}

export async function writeAtelierRc(cwd: string, rc: AtelierRc): Promise<void> {
  const p = join(cwd, CONFIG_FILE);
  await writeFile(p, `${JSON.stringify(rc, null, 2)}\n`, "utf8");
}

export function defaultAtelierRc(partial?: Partial<AtelierRc>): AtelierRc {
  return AtelierRcSchema.parse({
    version: 1,
    adapter: "generic",
    mode: "standard",
    ...partial,
  });
}
