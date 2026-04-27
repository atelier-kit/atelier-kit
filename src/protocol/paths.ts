import { join } from "node:path";
import { ATELIER_DIR } from "../paths.js";

export const ATELIER_CONFIG_FILE = "atelier.json";
export const ACTIVE_FILE = "active.json";

export function atelierPath(cwd: string, ...parts: string[]): string {
  return join(cwd, ATELIER_DIR, ...parts);
}

export function atelierConfigPath(cwd: string): string {
  return atelierPath(cwd, ATELIER_CONFIG_FILE);
}

export function activeStatePath(cwd: string): string {
  return atelierPath(cwd, ACTIVE_FILE);
}

export function epicDir(cwd: string, epicId: string): string {
  return atelierPath(cwd, "epics", epicId);
}

export function epicStatePath(cwd: string, epicId: string): string {
  return join(epicDir(cwd, epicId), "state.json");
}

