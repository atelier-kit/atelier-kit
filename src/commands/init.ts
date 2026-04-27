import prompts from "prompts";
import pc from "picocolors";
import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { getKitRoot } from "../paths.js";
import { atelierDir } from "../fs-utils.js";
import { defaultAtelierRc, writeAtelierRc } from "../state/atelierrc.js";
import { defaultContextMeta, writeContext } from "../state/context.js";
import { installAdapter } from "../adapters/index.js";
import type { AdapterName } from "../adapters/types.js";
import { ModeSchema } from "../state/schema.js";
import { installProtocolV2 } from "../protocol/init.js";

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
        { title: "Claude Code (.claude/skills)", value: "claude" },
        { title: "Cursor (.cursor/skills)", value: "cursor" },
        { title: "Codex CLI (AGENTS.md)", value: "codex" },
        { title: "Windsurf (.windsurfrules)", value: "windsurf" },
        { title: "Cline (.clinerules/)", value: "cline" },
        { title: "Kilo (.kilocode/rules + AGENTS.md)", value: "kilo" },
        { title: "Anti-GRAVITY (.agent/rules + AGENTS.md)", value: "antigravity" },
        { title: "Generic (atelier-system-prompt.txt)", value: "generic" },
      ],
      initial: 7,
    });
    if (typeof a.adapter === "string") adapter = a.adapter as AdapterName;

    const m = await prompts({
      type: "select",
      name: "mode",
      message: "Default mode?",
      choices: [
        { title: "quick (smaller gates)", value: "quick" },
        { title: "standard (full flow)", value: "standard" },
        { title: "deep (strict)", value: "deep" },
      ],
      initial: 1,
    });
    if (typeof m.mode === "string") mode = ModeSchema.parse(m.mode);
  }

  const dest = atelierDir(cwd);
  await mkdir(dest, { recursive: true });
  await mkdir(join(dest, "artifacts"), { recursive: true });
  await mkdir(join(dest, "plan"), { recursive: true });

  await cp(kit, dest, { recursive: true });

  await rm(join(dest, "brief.md"), { force: true }).catch(() => {});

  await writeAtelierRc(
    cwd,
    defaultAtelierRc({ adapter, mode }),
  );

  await writeContext(
    cwd,
    defaultContextMeta({
      workflow: "planner",
      planner_mode: "autoplan",
      planner_state: "idle",
      approval_status: "none",
      phase: "plan",
      mode,
      adapter,
      gate_pending: null,
      current_epic: null,
      current_task: null,
      current_slice: null,
      epics: [],
      tasks: [],
      slices: [],
      returns: [],
    }),
  );

  await installProtocolV2(cwd, adapter, mode);
  await installAdapter(cwd, adapter);

  console.log(pc.green(`atelier-kit initialized in ${dest}`));
  console.log(pc.dim(`Adapter: ${adapter}, mode: ${mode}`));
  console.log(pc.dim("v2 protocol: .atelier/atelier.json, active.json, protocol/, rules/, skills/*.md"));
  console.log(
    pc.dim(
      'Native plan: use `/plan` (no Atelier). Atelier: `/atelier plan "goal"` then `atelier new "..." --mode standard`.',
    ),
  );
  console.log(
    pc.dim(
      'CLI: `atelier` or `atelier-kit`. Install globally: `npm install -g @atelier-kit/atelier-kit`.',
    ),
  );
}
