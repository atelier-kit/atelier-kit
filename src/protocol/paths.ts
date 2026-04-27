import { join } from "node:path";
import { atelierDir } from "../fs-utils.js";

export function atelierJsonPath(cwd: string): string {
  return join(atelierDir(cwd), "atelier.json");
}

export function activeJsonPath(cwd: string): string {
  return join(atelierDir(cwd), "active.json");
}

export function protocolDir(cwd: string): string {
  return join(atelierDir(cwd), "protocol");
}

export function rulesDir(cwd: string): string {
  return join(atelierDir(cwd), "rules");
}

export function skillsDirV2(cwd: string): string {
  return join(atelierDir(cwd), "skills");
}

export function schemasDir(cwd: string): string {
  return join(atelierDir(cwd), "schemas");
}

export function epicDir(cwd: string, epicSlug: string): string {
  return join(atelierDir(cwd), "epics", epicSlug);
}

export function epicStatePath(cwd: string, epicSlug: string): string {
  return join(epicDir(cwd, epicSlug), "state.json");
}

export function slugifyEpicTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "epic";
}
