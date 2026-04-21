import prompts from "prompts";
import pc from "picocolors";
import { cp, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { getKitRoot } from "../paths.js";
import { atelierDir, writeText } from "../fs-utils.js";
import { defaultAtelierRc, writeAtelierRc } from "../state/atelierrc.js";
import { defaultContextMeta, writeContext } from "../state/context.js";
import { installAdapter } from "../adapters/index.js";
import type { AdapterName } from "../adapters/types.js";
import { ModeSchema } from "../state/schema.js";

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
        { title: "Generic (atelier-system-prompt.txt)", value: "generic" },
      ],
      initial: 4,
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

  await cp(kit, dest, { recursive: true });

  const briefTplPath = join(kit, "templates", "brief.md");
  try {
    const briefTpl = await readFile(briefTplPath, "utf8");
    await writeText(join(dest, "brief.md"), briefTpl);
  } catch {
    await writeText(
      join(dest, "brief.md"),
      "# Brief\n\n## Goal\n\n## Acceptance criteria\n\n## Out of scope\n\n## Constraints\n",
    );
  }

  const artFiles = [
    "questions.md",
    "research.md",
    "design.md",
    "outline.md",
    "plan.md",
    "impl-log.md",
    "review.md",
    "decision-log.md",
  ];
  for (const f of artFiles) {
    const p = join(kit, "templates", f);
    try {
      const body = await readFile(p, "utf8");
      await writeText(join(dest, "artifacts", f), body);
    } catch {
      await writeText(
        join(dest, "artifacts", f),
        `# ${f.replace(".md", "")}\n\n_TBD_\n`,
      );
    }
  }

  await writeAtelierRc(
    cwd,
    defaultAtelierRc({ adapter, mode }),
  );

  await writeContext(
    cwd,
    defaultContextMeta({
      phase: "brief",
      mode,
      adapter,
      gate_pending: null,
      returns: [],
    }),
  );

  await installAdapter(cwd, adapter);

  console.log(pc.green(`atelier-kit initialized in ${dest}`));
  console.log(pc.dim(`Adapter: ${adapter}, mode: ${mode}`));
  console.log(
    pc.dim(
      "Next: edit .atelier/brief.md, then: atelier-kit phase questions",
    ),
  );
}
