import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ATELIER_DIR = ".atelier";

export function atelierRoot(cwd: string): string {
  return join(cwd, ATELIER_DIR);
}

export function atelierConfigPath(cwd: string): string {
  return join(atelierRoot(cwd), "atelier.json");
}

export function activeStatePath(cwd: string): string {
  return join(atelierRoot(cwd), "active.json");
}

export function epicDir(cwd: string, epicId: string): string {
  return join(atelierRoot(cwd), "epics", epicId);
}

export function epicStatePath(cwd: string, epicId: string): string {
  return join(epicDir(cwd, epicId), "state.json");
}

export function protocolDir(cwd: string): string {
  return join(atelierRoot(cwd), "protocol");
}

export function rulesDir(cwd: string): string {
  return join(atelierRoot(cwd), "rules");
}

export function skillsDir(cwd: string): string {
  return join(atelierRoot(cwd), "skills");
}

export function schemasDir(cwd: string): string {
  return join(atelierRoot(cwd), "schemas");
}

export function epicsDir(cwd: string): string {
  return join(atelierRoot(cwd), "epics");
}

export function getKitRoot(): string {
  const override = process.env.ATELIER_KIT_ROOT;
  if (override) return override;
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "kit");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
