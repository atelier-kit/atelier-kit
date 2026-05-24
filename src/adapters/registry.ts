import { join } from "node:path";
import { cp } from "node:fs/promises";
import { ensureDir } from "../fs-utils.js";
import { readActiveEpic, readAtelierConfig } from "../protocol/state.js";
import { readRule } from "../protocol/init.js";
import { claudeAtelierCommand } from "./command-spec.js";
import type { AdapterName } from "./types.js";

/**
 * Per-file write spec. `body` overrides the adapter's default body for this
 * file; `wrap` decorates the resolved body (e.g. Cursor's MDC frontmatter).
 */
export type FileSpec = {
  path: string;
  body?: (cwd: string, defaultBody: string) => string | Promise<string>;
  wrap?: (body: string) => string;
};

export type AdapterSpec = {
  /** Canonical adapter name (aliases resolve to this). */
  name: Exclude<AdapterName, "claude">;
  /** Title injected at the top of the default body. */
  label: string;
  /** Files written on install (and verified by `validate --verbose`). */
  files: FileSpec[];
  /** Override the default body (used by `generic`, which embeds live state). */
  body?: (cwd: string) => Promise<string>;
  /** Non-file side effects, e.g. mirroring `.atelier/skills/` into `.claude/skills/atelier/`. */
  extras?: (cwd: string) => Promise<void>;
};

const cursorMdcFrontmatter = (body: string): string =>
  `---
description: atelier-kit — opt-in planning protocol
alwaysApply: true
---

${body}
`;

async function mirrorSkillsToClaudeDir(cwd: string): Promise<void> {
  const target = join(cwd, ".claude", "skills", "atelier");
  await ensureDir(target);
  await cp(join(cwd, ".atelier", "skills"), target, {
    recursive: true,
    force: true,
  });
}

async function renderGenericPrompt(cwd: string): Promise<string> {
  const config = await readAtelierConfig(cwd);
  const { active, state } = await readActiveEpic(cwd);
  const rules = await readRule(cwd, config.adapter);
  return `atelier-kit — generated Planning Protocol prompt (generic adapter)
Not affiliated with HumanLayer.

=== Activation ===
active: ${active.active}
active_epic: ${active.active_epic ?? "null"}
active_phase: ${active.active_phase ?? "null"}
active_skill: ${active.active_skill ?? "null"}

=== Active epic ===
status: ${state?.status ?? "none"}

=== Rules ===
${rules}
`;
}

export const ADAPTERS: Record<Exclude<AdapterName, "claude">, AdapterSpec> = {
  "claude-code": {
    name: "claude-code",
    label: "atelier-kit (Claude Code)",
    files: [
      { path: "CLAUDE.md" },
      { path: ".claude/commands/atelier.md", body: () => claudeAtelierCommand() },
    ],
    extras: mirrorSkillsToClaudeDir,
  },
  cursor: {
    name: "cursor",
    label: "atelier-kit (Cursor)",
    files: [{ path: ".cursor/rules/atelier-core.mdc", wrap: cursorMdcFrontmatter }],
  },
  codex: {
    name: "codex",
    label: "AGENTS — atelier-kit (Codex CLI)",
    files: [{ path: "AGENTS.md" }],
  },
  "gemini-cli": {
    name: "gemini-cli",
    label: "atelier-kit (Gemini CLI)",
    files: [{ path: "GEMINI.md" }],
  },
  antigravity: {
    name: "antigravity",
    label: "atelier-kit (Antigravity)",
    files: [{ path: ".antigravity/atelier.md" }],
  },
  kiro: {
    name: "kiro",
    label: "atelier-kit (Kiro)",
    files: [{ path: ".kiro/steering/atelier.md" }],
  },
  kilo: {
    name: "kilo",
    label: "atelier-kit (Kilo Code)",
    files: [{ path: ".kilocode/rules/atelier.md" }],
  },
  windsurf: {
    name: "windsurf",
    label: "atelier-kit — .windsurfrules",
    files: [{ path: ".windsurfrules" }],
  },
  cline: {
    name: "cline",
    label: "atelier-kit (Cline)",
    files: [{ path: ".clinerules/atelier-core.md" }],
  },
  generic: {
    name: "generic",
    label: "atelier-kit (Generic)",
    files: [{ path: "atelier-system-prompt.txt" }],
    body: renderGenericPrompt,
  },
};

/** Resolve aliases (`claude` -> `claude-code`) to a canonical spec. */
export function resolveAdapter(name: AdapterName): AdapterSpec {
  const canonical = name === "claude" ? "claude-code" : name;
  return ADAPTERS[canonical];
}
