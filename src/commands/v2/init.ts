import pc from "picocolors";
import prompts from "prompts";
import { initAtelierProtocol } from "../../protocol/init.js";
import type { AtelierAdapter, AtelierMode } from "../../protocol/schema.js";

export async function cmdV2Init(
  cwd: string,
  opts: { yes?: boolean; adapter?: string; mode?: string },
): Promise<void> {
  let adapter: AtelierAdapter = "generic";
  let mode: AtelierMode = "standard";

  if (!opts.yes) {
    const adapterAnswer = await prompts({
      type: "select",
      name: "adapter",
      message: "Which agent environment?",
      choices: [
        { title: "Cursor (.cursor/rules/)", value: "cursor" },
        { title: "Claude Code (.claude/)", value: "claude-code" },
        { title: "Codex CLI (AGENTS.md)", value: "codex" },
        { title: "Cline (.clinerules/)", value: "cline" },
        { title: "Windsurf (.windsurfrules)", value: "windsurf" },
        { title: "Generic (atelier-system-prompt.txt)", value: "generic" },
      ],
      initial: 5,
    });
    if (typeof adapterAnswer.adapter === "string") {
      adapter = adapterAnswer.adapter as AtelierAdapter;
    }

    const modeAnswer = await prompts({
      type: "select",
      name: "mode",
      message: "Default Atelier mode?",
      choices: [
        { title: "quick (small changes, ≤3 slices)", value: "quick" },
        { title: "standard (normal features, full research)", value: "standard" },
        { title: "deep (high-risk architectural changes)", value: "deep" },
      ],
      initial: 1,
    });
    if (typeof modeAnswer.mode === "string") {
      mode = modeAnswer.mode as AtelierMode;
    }
  } else {
    if (opts.adapter) adapter = opts.adapter as AtelierAdapter;
    if (opts.mode) mode = opts.mode as AtelierMode;
  }

  await initAtelierProtocol(cwd, adapter, mode);

  console.log(pc.green("Atelier-Kit v2 initialized."));
  console.log(pc.dim(`  adapter: ${adapter}`));
  console.log(pc.dim(`  mode:    ${mode}`));
  console.log(pc.dim("  .atelier/atelier.json  — global config"));
  console.log(pc.dim("  .atelier/active.json   — activation state (inactive by default)"));
  console.log(pc.dim("  .atelier/protocol/     — workflow, gates, modes, skills"));
  console.log(pc.dim("  .atelier/rules/        — core rule + adapter rules"));
  console.log(pc.dim("  .atelier/skills/       — on-demand agent skills"));
  console.log(pc.dim("  .atelier/schemas/      — JSON schemas for validation"));
  console.log("");
  console.log(pc.cyan("Next: render rules for your agent"));
  console.log(pc.dim(`  atelier render-rules --adapter ${adapter}`));
  console.log("");
  console.log(pc.cyan("To start an epic:"));
  console.log(pc.dim('  atelier new "Add payment endpoint" --mode quick'));
}
