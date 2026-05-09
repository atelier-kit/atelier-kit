import { stdin } from "node:process";
import { formatHostPlanFrameworkNudge } from "./host-plan-nudge.js";
import { createEpic } from "../protocol/epic.js";
import { readActiveEpic } from "../protocol/state.js";

const MAX_GOAL_CHARS = 4000;

/** Claude plan permission mode; accept string variants from different CLI versions. */
function isClaudePlanPermissionMode(payload: Record<string, unknown>): boolean {
  const raw = payload.permission_mode;
  if (typeof raw !== "string") return false;
  return raw.trim().toLowerCase() === "plan";
}

function readStdinUtf8(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (stdin.isTTY) {
      resolve("");
      return;
    }
    const chunks: Buffer[] = [];
    stdin.on("data", (c: string | Buffer) => {
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c, "utf8"));
    });
    stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stdin.on("error", (err) => reject(err));
    stdin.resume();
  });
}

export async function tryBootstrapHostPlanFromClaudePayload(
  payload: Record<string, unknown>,
): Promise<void> {
  if (payload.hook_event_name !== "UserPromptSubmit") return;
  if (!isClaudePlanPermissionMode(payload)) return;

  const cwd = typeof payload.cwd === "string" ? payload.cwd : "";
  if (!cwd) return;

  const prompt =
    typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  if (!prompt) return;

  try {
    const { active, state } = await readActiveEpic(cwd);
    if (active.active || state) return;

    await createEpic(cwd, {
      title: prompt.slice(0, MAX_GOAL_CHARS),
      goal: prompt.slice(0, MAX_GOAL_CHARS),
      mode: "standard",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[atelier-kit] native-plan hook: ${msg}\n`);
  }
}

/** Parse stdin JSON then bootstrap if applicable (tests, scripts). */
export async function tryBootstrapHostPlanFromClaudePrompt(
  raw: string,
): Promise<void> {
  const trimmed = raw.trim();
  if (!trimmed) return;
  try {
    const payload = JSON.parse(trimmed) as Record<string, unknown>;
    await tryBootstrapHostPlanFromClaudePayload(payload);
  } catch {
    /* invalid JSON */
  }
}

/**
 * Claude requires stdout to be only JSON (no shell noise, no trailing newline).
 * UserPromptSubmit accepts top-level `additionalContext` per hooks docs.
 */
function emitUserPromptNudge(additionalContext: string): void {
  process.stdout.write(
    JSON.stringify({
      additionalContext,
    }),
  );
}

/**
 * UserPromptSubmit — bootstrap host plan when idle; inject framework pipeline nudge each plan-mode turn.
 * @see https://code.claude.com/docs/en/hooks#userpromptsubmit
 */
export async function cmdNativePlanClaudePromptHook(): Promise<void> {
  const raw = await readStdinUtf8();
  const trimmed = raw.trim();
  if (!trimmed) return;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return;
  }

  await tryBootstrapHostPlanFromClaudePayload(payload);

  if (payload.hook_event_name !== "UserPromptSubmit") return;
  if (!isClaudePlanPermissionMode(payload)) return;

  const cwd = typeof payload.cwd === "string" ? payload.cwd : "";
  if (!cwd) return;

  try {
    const nudge = formatHostPlanFrameworkNudge(await readActiveEpic(cwd));
    if (nudge) {
      emitUserPromptNudge(nudge);
    }
  } catch {
    /* no .atelier */
  }
}

/**
 * PreToolUse (ExitPlanMode) — consume stdin so the process can exit cleanly.
 */
export async function cmdNativePlanClaudeExitPlanHook(): Promise<void> {
  await readStdinUtf8();
}

/**
 * PostToolUse — consume stdin; reserved for future evidence sync.
 */
export async function cmdNativePlanClaudeToolEvidenceHook(): Promise<void> {
  await readStdinUtf8();
}
