import { readFile } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";
import { atelierDir, ensureDir, writeText } from "../fs-utils.js";
import { rulesDir } from "../protocol/paths.js";

const ADAPTER_FILES: Record<string, string> = {
  cursor: "cursor.md",
  "claude-code": "claude-code.md",
  codex: "codex.md",
  cline: "cline.md",
  windsurf: "windsurf.md",
  generic: "generic.md",
};

export async function cmdRenderRules(
  cwd: string,
  adapter: string,
  outPath?: string,
): Promise<void> {
  const file = ADAPTER_FILES[adapter];
  if (!file) {
    console.error(
      pc.red(`Unknown adapter: ${adapter}. Use: ${Object.keys(ADAPTER_FILES).join(", ")}`),
    );
    process.exitCode = 1;
    return;
  }
  const core = await readFile(join(rulesDir(cwd), "core.md"), "utf8").catch(() => "");
  const adapterBody = await readFile(
    join(rulesDir(cwd), "adapters", file),
    "utf8",
  ).catch(() => "");

  const combined = `${core}\n\n---\n\n${adapterBody}\n`;

  if (outPath) {
    await ensureDir(join(outPath, ".."));
    await writeText(outPath, combined);
    console.log(pc.green(`Wrote ${outPath}`));
    return;
  }

  if (adapter === "cursor") {
    await ensureDir(join(cwd, ".cursor", "rules"));
    await writeText(join(cwd, ".cursor", "rules", "atelier-protocol.mdc"), combined);
    console.log(pc.green("Wrote .cursor/rules/atelier-protocol.mdc"));
    return;
  }

  await writeText(join(cwd, `atelier-rules-${adapter}.md`), combined);
  console.log(pc.green(`Wrote atelier-rules-${adapter}.md`));
}
