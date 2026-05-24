import { exec } from "node:child_process";

export type ValidationStatus = "pass" | "fail" | "timeout" | "error";

export type ValidationResult = {
  command: string;
  status: ValidationStatus;
  exitCode: number | null;
  output: string;
  durationMs: number;
};

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_OUTPUT_LINES = 30;

function tail(output: string, lines: number): string {
  const all = output.replace(/\r\n/g, "\n").split("\n");
  if (all.length <= lines) return output.trimEnd();
  return `…(${all.length - lines} earlier lines omitted)\n${all.slice(-lines).join("\n")}`.trimEnd();
}

function runOne(
  cwd: string,
  command: string,
  timeoutMs: number,
): Promise<ValidationResult> {
  const started = Date.now();
  return new Promise((resolve) => {
    const child = exec(
      command,
      { cwd, timeout: timeoutMs, killSignal: "SIGTERM" },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - started;
        const output = tail(`${stdout}${stderr}`, MAX_OUTPUT_LINES);
        if (!error) {
          resolve({ command, status: "pass", exitCode: 0, output, durationMs });
          return;
        }
        const killed = (error as { killed?: boolean }).killed === true;
        const exitCode = typeof child.exitCode === "number" ? child.exitCode : null;
        if (killed && durationMs >= timeoutMs - 50) {
          resolve({
            command,
            status: "timeout",
            exitCode,
            output: `${output}\n\n[timed out after ${timeoutMs}ms]`,
            durationMs,
          });
          return;
        }
        if (exitCode === null) {
          resolve({
            command,
            status: "error",
            exitCode,
            output: `${output}\n\n[runner error: ${(error as Error).message}]`,
            durationMs,
          });
          return;
        }
        resolve({ command, status: "fail", exitCode, output, durationMs });
      },
    );
  });
}

export async function runValidations(
  cwd: string,
  commands: string[],
  options: { timeoutMs?: number } = {},
): Promise<ValidationResult[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const results: ValidationResult[] = [];
  for (const command of commands) {
    results.push(await runOne(cwd, command, timeoutMs));
  }
  return results;
}
