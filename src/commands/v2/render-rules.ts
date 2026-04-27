import pc from "picocolors";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { rulesDir, atelierRoot } from "../../protocol/paths.js";
import type { AtelierAdapter } from "../../protocol/schema.js";

const ADAPTER_TARGETS: Record<
  AtelierAdapter,
  { dir: string; filename: string; format: "mdc" | "md" | "txt" }
> = {
  cursor: { dir: ".cursor/rules", filename: "atelier-core.mdc", format: "mdc" },
  "claude-code": { dir: ".claude", filename: "CLAUDE.md", format: "md" },
  codex: { dir: ".", filename: "AGENTS.md", format: "md" },
  cline: { dir: ".clinerules", filename: "atelier-core.md", format: "md" },
  windsurf: { dir: ".", filename: ".windsurfrules", format: "md" },
  generic: { dir: ".", filename: "atelier-system-prompt.txt", format: "txt" },
};

export async function cmdV2RenderRules(
  cwd: string,
  opts: { adapter?: string },
): Promise<void> {
  const adapter = (opts.adapter as AtelierAdapter) ?? "generic";
  const target = ADAPTER_TARGETS[adapter];

  if (!target) {
    console.log(pc.red(`Unknown adapter: ${adapter}`));
    console.log(
      pc.dim(
        "Valid adapters: cursor, claude-code, codex, cline, windsurf, generic",
      ),
    );
    process.exitCode = 1;
    return;
  }

  // Read core rule from .atelier/rules/core.md
  const corePath = join(rulesDir(cwd), "core.md");
  let coreContent: string;
  try {
    coreContent = await readFile(corePath, "utf8");
  } catch {
    console.log(
      pc.red(
        "Could not read .atelier/rules/core.md — run `atelier init` first.",
      ),
    );
    process.exitCode = 1;
    return;
  }

  // Try to read adapter-specific overlay
  const adapterPath = join(rulesDir(cwd), "adapters", `${adapter}.md`);
  let adapterOverlay = "";
  try {
    adapterOverlay = await readFile(adapterPath, "utf8");
  } catch {
    // No adapter overlay, that's fine
  }

  const content = buildRuleContent(adapter, coreContent, adapterOverlay, target.format);

  const destDir = join(cwd, target.dir);
  await mkdir(destDir, { recursive: true });
  const destFile = join(destDir, target.filename);
  await writeFile(destFile, content, "utf8");

  console.log(pc.green(`Rules rendered for adapter: ${adapter}`));
  console.log(pc.dim(`  Written to: ${join(target.dir, target.filename)}`));
}

function buildRuleContent(
  adapter: AtelierAdapter,
  core: string,
  overlay: string,
  format: "mdc" | "md" | "txt",
): string {
  const header =
    format === "mdc"
      ? `---\ndescription: Atelier-Kit Planning Protocol\nalwaysApply: true\n---\n\n`
      : "";

  let body = core;
  if (overlay) {
    body += `\n\n---\n\n## ${adapter} Adapter\n\n${overlay}`;
  }

  return header + body;
}
