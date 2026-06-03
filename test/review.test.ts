import { afterEach, describe, expect, test } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { cmdReview } from "../src/commands/review.js";
import { tempDir } from "./helpers.js";

const execFileAsync = promisify(execFile);

async function gitInit(dir: string): Promise<void> {
  await execFileAsync("git", ["init", "-q"], { cwd: dir });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: dir });
  await execFileAsync("git", ["config", "commit.gpgsign", "false"], { cwd: dir });
}

function buildWork(
  mode: string,
  opts: { allowed: string; validation: string },
): string {
  return `# Work: Add login

## Mode

${mode}

## Plan

### Slice 1 — route

**Goal:** Add the login route returning 200 on valid credentials end to end.

**Allowed files:** \`${opts.allowed}\`

**Acceptance criteria:**

- The login route responds 200 on valid credentials and 401 otherwise.

**Validation:**

- \`${opts.validation}\`

## Review

_Filled by atelier review._
`;
}

describe("atelier review (work.md)", () => {
  let cleanup: () => Promise<void> = async () => {};
  let dir = "";

  afterEach(async () => {
    await cleanup();
    process.exitCode = 0;
  });

  async function setup(
    mode: string,
    opts: { allowed: string; validation: string },
  ): Promise<void> {
    const tmp = await tempDir();
    cleanup = tmp.cleanup;
    dir = tmp.path;
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(join(dir, "src", "placeholder.ts"), "export {};\n", "utf8");
    await mkdir(join(dir, ".atelier", "work"), { recursive: true });
    await writeFile(join(dir, ".atelier", "work", "add-login.md"), buildWork(mode, opts), "utf8");
    await gitInit(dir);
    // Commit everything so HEAD exists; later edits show up as the diff.
    await execFileAsync("git", ["add", "-A"], { cwd: dir });
    await execFileAsync("git", ["commit", "-q", "-m", "baseline"], { cwd: dir });
  }

  async function reviewSection(): Promise<string> {
    const raw = await readFile(join(dir, ".atelier", "work", "add-login.md"), "utf8");
    return raw.slice(raw.indexOf("## Review"));
  }

  test("standard PASS when changes are in scope and validation succeeds", async () => {
    await setup("standard", { allowed: "src/**", validation: "true" });
    await writeFile(join(dir, "src", "login.ts"), "export const x = 1;\n", "utf8");

    await cmdReview(dir);

    expect(process.exitCode ?? 0).toBe(0);
    const review = await reviewSection();
    expect(review).toContain("Overall: PASS");
    expect(review).toContain("Allowed-files violations: 0");
    expect(review).toContain("- src/login.ts");
  });

  test("standard FAIL when a file is changed outside allowed_files", async () => {
    await setup("standard", { allowed: "src/**", validation: "true" });
    await writeFile(join(dir, "src", "login.ts"), "export const x = 1;\n", "utf8");
    await writeFile(join(dir, "out-of-scope.md"), "drift\n", "utf8");

    await cmdReview(dir);

    expect(process.exitCode).toBe(1);
    const review = await reviewSection();
    expect(review).toContain("Overall: FAIL");
    expect(review).toContain("Allowed-files violations: 1");
    expect(review).toMatch(/### Violations[\s\S]*- out-of-scope\.md/);
  });

  test("standard FAIL when a validation command exits non-zero", async () => {
    await setup("standard", { allowed: "src/**", validation: "false" });
    await writeFile(join(dir, "src", "login.ts"), "export const x = 1;\n", "utf8");

    await cmdReview(dir);

    expect(process.exitCode).toBe(1);
    const review = await reviewSection();
    expect(review).toContain("Overall: FAIL");
    expect(review).toContain("Failed validations: 1");
    expect(review).toContain("FAIL `false`");
  });

  test("quick mode is advisory (exit 0) even with out-of-scope drift", async () => {
    await setup("quick", { allowed: "src/**", validation: "true" });
    await writeFile(join(dir, "anywhere.md"), "drift\n", "utf8");

    await cmdReview(dir);

    expect(process.exitCode ?? 0).toBe(0);
    const review = await reviewSection();
    expect(review).toContain("Overall: ADVISORY");
  });
});
