import prompts from "prompts";
import pc from "picocolors";
import { initializeProtocol } from "../protocol/init.js";
import { AdapterSchema, AtelierModeSchema, type AdapterName } from "../protocol/schema.js";

export async function cmdInit(
  cwd: string,
  opts: { yes?: boolean },
): Promise<void> {
  let adapter: AdapterName = "generic";
  let mode: "quick" | "standard" | "deep" = "standard";

  if (!opts.yes) {
    const a = await prompts({
      type: "select",
      name: "adapter",
      message: "Which agent environment?",
      choices: [
        { title: "Cursor (.cursor/rules)", value: "cursor" },
        { title: "Claude Code", value: "claude-code" },
        { title: "Codex CLI", value: "codex" },
        { title: "Windsurf", value: "windsurf" },
        { title: "Cline", value: "cline" },
        { title: "Generic (atelier-system-prompt.txt)", value: "generic" },
      ],
      initial: 5,
    });
    if (typeof a.adapter === "string") adapter = AdapterSchema.parse(a.adapter);

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
    if (typeof m.mode === "string") {
      const parsed = AtelierModeSchema.parse(m.mode);
      if (parsed !== "native") mode = parsed;
    }
  }

  const result = await initializeProtocol(cwd, { adapter, mode });
  console.log(pc.green(`atelier-kit initialized in ${result.atelierDir}`));
  console.log(pc.dim(`Adapter: ${adapter}, default Atelier mode: ${mode}`));
  console.log(
    pc.dim(
      'Next: use native `/plan ...`, or activate Atelier with `atelier new "your goal" --mode quick`.',
    ),
  );
  console.log(
    pc.dim(
      'Atelier is inactive until `/atelier ...`, "Use Atelier-Kit", or `atelier new` explicitly activates it.',
    ),
  );
}
