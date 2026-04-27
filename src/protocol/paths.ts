import { join } from "node:path";

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

export function protocolDir(cwd: string): string {
  return join(atelierRoot(cwd), "protocol");
}

export function rulesDir(cwd: string): string {
  return join(atelierRoot(cwd), "rules");
}

export function adapterRulesDir(cwd: string): string {
  return join(rulesDir(cwd), "adapters");
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

export function epicDir(cwd: string, epicSlug: string): string {
  return join(epicsDir(cwd), epicSlug);
}

export function epicStatePath(cwd: string, epicSlug: string): string {
  return join(epicDir(cwd, epicSlug), "state.json");
}

export function epicArtifactPath(cwd: string, epicSlug: string, artifact: string): string {
  return join(epicDir(cwd, epicSlug), artifact);
}
