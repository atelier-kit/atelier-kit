import prompts from "prompts";
import pc from "picocolors";
import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getKitRoot } from "../paths.js";
import { installAdapter } from "../adapters/index.js";
import type { AdapterName } from "../adapters/types.js";
import { bootstrapWorkspace, ensureAtelierRoot, writeAtelierConfig } from "../protocol/workspace.js";
import { defaultAtelierConfig } from "../protocol/templates.js";
import { writeAtelierRc } from "../state/atelierrc.js";

const PROTOCOL_FILES = ["workflow.yaml", "gates.yaml", "skills.yaml", "modes.yaml"];
const RULE_FILES = ["core.md"];
const ADAPTER_RULE_FILES = ["cursor.md", "claude-code.md", "codex.md", "cline.md", "windsurf.md", "generic.md"];
const SKILL_FILES = [
  "repo-analyst.md",
  "tech-analyst.md",
  "business-analyst.md",
  "planner.md",
  "designer.md",
  "implementer.md",
  "reviewer.md",
];
const SCHEMA_FILES = [
  "atelier.schema.json",
  "active.schema.json",
  "epic-state.schema.json",
  "slice.schema.json",
  "gate.schema.json",
  "plan.schema.json",
];

export async function cmdInit(
  cwd: string,
  opts: { yes?: boolean },
): Promise<void> {
  const kit = getKitRoot();
  let adapter: AdapterName = "generic";
  let mode: "quick" | "standard" | "deep" = "standard";

  if (!opts.yes) {
    const a = await prompts({
      type: "select",
      name: "adapter",
      message: "Which agent environment?",
      choices: [
        { title: "Claude Code", value: "claude" },
        { title: "Cursor", value: "cursor" },
        { title: "Codex CLI", value: "codex" },
        { title: "Windsurf", value: "windsurf" },
        { title: "Cline", value: "cline" },
        { title: "Kilo", value: "kilo" },
        { title: "Anti-GRAVITY", value: "antigravity" },
        { title: "Generic prompt file", value: "generic" },
      ],
      initial: 7,
    });
    if (typeof a.adapter === "string") adapter = a.adapter as AdapterName;

    const m = await prompts({
      type: "select",
      name: "mode",
      message: "Default Atelier mode?",
      choices: [
        { title: "quick", value: "quick" },
        { title: "standard", value: "standard" },
        { title: "deep", value: "deep" },
      ],
      initial: 1,
    });
    if (typeof m.mode === "string") mode = m.mode as typeof mode;
  }

  const dest = await ensureAtelierRoot(cwd);
  await bootstrapWorkspace(cwd, adapter, mode);
  await copyProtocolKit(kit, dest);
  await writeAtelierConfig(cwd, defaultAtelierConfig(adapter, mode));
  await writeAtelierRc(cwd, { adapter, mode });
  await installAdapter(cwd, adapter);

  console.log(pc.green(`atelier initialized in ${dest}`));
  console.log(pc.dim("Atelier-Kit is inactive by default."));
  console.log(pc.dim(`Default adapter: ${adapter}`));
  console.log(pc.dim(`Default Atelier mode: ${mode}`));
  console.log(pc.dim('Next: run `atelier new "Your epic" --mode quick` to activate the protocol.'));
}

async function copyProtocolKit(kitRoot: string, destination: string): Promise<void> {
  await mkdir(join(destination, "protocol"), { recursive: true });
  await mkdir(join(destination, "rules", "adapters"), { recursive: true });
  await mkdir(join(destination, "skills"), { recursive: true });
  await mkdir(join(destination, "schemas"), { recursive: true });
  await mkdir(join(destination, "epics"), { recursive: true });

  for (const file of PROTOCOL_FILES) {
    await copyFile(join(kitRoot, "protocol", file), join(destination, "protocol", file));
  }
  for (const file of RULE_FILES) {
    await copyFile(join(kitRoot, "rules", file), join(destination, "rules", file));
  }
  for (const file of ADAPTER_RULE_FILES) {
    await copyFile(join(kitRoot, "rules", "adapters", file), join(destination, "rules", "adapters", file));
  }
  for (const file of SKILL_FILES) {
    await copyFile(join(kitRoot, "skills", file), join(destination, "skills", file));
  }
  for (const file of SCHEMA_FILES) {
    await copyFile(join(kitRoot, "schemas", file), join(destination, "schemas", file));
  }
}
