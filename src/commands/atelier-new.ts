import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";
import { ensureDir, writeText } from "../fs-utils.js";
import { activeJsonPath, epicDir, epicStatePath, slugifyEpicTitle } from "../protocol/paths.js";
import { initialEpicState, nowIso, requiredArtifactsForMode } from "../protocol/defaults.js";
import type { ActiveJson } from "../protocol/types.js";

const STUB = `# (stub)\n\nFill during the protocol.\n`;

export async function cmdAtelierNew(
  cwd: string,
  title: string,
  mode: "quick" | "standard" | "deep",
): Promise<void> {
  const epicId = slugifyEpicTitle(title);
  const base = epicDir(cwd, epicId);
  await ensureDir(join(base, "research"));

  const state = initialEpicState(epicId, title, title, mode);
  await writeText(epicStatePath(cwd, epicId), `${JSON.stringify(state, null, 2)}\n`);

  const artifacts = new Map<string, string>();
  for (const rel of requiredArtifactsForMode(mode)) {
    artifacts.set(rel, STUB);
  }
  artifacts.set("questions.md", `# Questions\n\n${STUB}`);
  artifacts.set("plan.md", planTemplate(title, mode));

  for (const [rel, body] of artifacts) {
    const p = join(base, rel);
    await ensureDir(join(p, ".."));
    await writeFile(p, body, "utf8");
  }

  const active: ActiveJson = {
    active: true,
    mode: "atelier",
    active_epic: epicId,
    active_phase: "discovery",
    active_skill: "repo-analyst",
    updated_at: nowIso(),
  };
  await writeText(activeJsonPath(cwd), `${JSON.stringify(active, null, 2)}\n`);

  console.log(pc.green(`Epic created: ${epicId}`));
  console.log(pc.dim(`Active skill: repo-analyst (discovery)`));
}

function planTemplate(title: string, mode: string): string {
  return `# Plan: ${title}

## Goal

${title}

## Mode

${mode}

## Evidence Summary

### Repository Evidence

- TBD

### Technical Evidence

- TBD

### Business / Product Evidence

- TBD

## Assumptions

- TBD

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| TBD | medium | TBD |

## Slices

### Slice 1 — First delivery

**Goal:** TBD

**Allowed files:**

- \`src/**\`

**Acceptance criteria:**

- TBD

**Validation:**

- TBD

## Approval

Status: pending

Human approval required before implementation.
`;
}
