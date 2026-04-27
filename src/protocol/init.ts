import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getKitRoot } from "../paths.js";
import { writeJson } from "./state.js";
import {
  adapterRule,
  coreRule,
  defaultAtelierConfig,
  gatesYaml,
  inactiveState,
  modesYaml,
  schemaFiles,
  skillBody,
  skillsYaml,
  SKILLS,
  STANDARD_ADAPTERS,
  workflowYaml,
} from "./templates.js";
import type { AdapterName, AtelierMode } from "./schema.js";
import { atelierPath, activeStatePath, atelierConfigPath } from "./paths.js";
import { installAdapter } from "../adapters/index.js";
import type { AdapterName as LegacyAdapterName } from "../adapters/types.js";

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

async function copyBundledKit(cwd: string): Promise<void> {
  const kit = getKitRoot();
  await cp(kit, atelierPath(cwd), { recursive: true, force: true }).catch(() => {});
}

export async function initializeProtocol(cwd: string, options?: {
  adapter?: AdapterName;
  mode?: Exclude<AtelierMode, "native">;
}): Promise<{ atelierDir: string }> {
  const adapter = options?.adapter ?? "generic";
  const mode = options?.mode ?? "standard";
  await mkdir(atelierPath(cwd), { recursive: true });
  await copyBundledKit(cwd);

  await writeJson(atelierConfigPath(cwd), defaultAtelierConfig(adapter, mode));
  await writeJson(activeStatePath(cwd), inactiveState());

  await writeText(atelierPath(cwd, "protocol", "workflow.yaml"), workflowYaml);
  await writeText(atelierPath(cwd, "protocol", "gates.yaml"), gatesYaml);
  await writeText(atelierPath(cwd, "protocol", "modes.yaml"), modesYaml);
  await writeText(atelierPath(cwd, "protocol", "skills.yaml"), skillsYaml);

  await writeText(atelierPath(cwd, "rules", "core.md"), coreRule());
  for (const name of STANDARD_ADAPTERS) {
    await writeText(atelierPath(cwd, "rules", "adapters", `${name}.md`), adapterRule(name));
  }
  await writeText(
    atelierPath(cwd, "rules", "adapters", "claude-code.md"),
    adapterRule("claude-code"),
  );
  await writeText(atelierPath(cwd, "rules", "adapters", "claude-code.md"), adapterRule("claude-code"));

  for (const skill of SKILLS) {
    await writeText(atelierPath(cwd, "skills", `${skill}.md`), skillBody(skill));
  }

  for (const [name, content] of Object.entries(schemaFiles())) {
    await writeText(atelierPath(cwd, "schemas", name), content);
  }
  await installAdapter(
    cwd,
    (adapter === "claude-code" ? "claude" : adapter) as LegacyAdapterName,
  );
  return { atelierDir: atelierPath(cwd) };
}

export async function readRule(cwd: string, adapter: AdapterName): Promise<string> {
  const core = await readFile(atelierPath(cwd, "rules", "core.md"), "utf8");
  const adapterBody = await readFile(
    atelierPath(cwd, "rules", "adapters", `${adapter}.md`),
    "utf8",
  );
  return `${core.trim()}\n\n---\n\n${adapterBody.trim()}\n`;
}
