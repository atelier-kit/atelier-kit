import pc from "picocolors";
import { relative } from "node:path";
import { writeText } from "../fs-utils.js";
import { resolveWorkFile } from "../work/discover.js";
import { parseWorkFile } from "../work/parse.js";
import { replaceReviewSection } from "../work/update.js";
import { gitChangedFiles } from "../review/git-diff.js";
import { checkSlices } from "../review/slice-check.js";
import { runValidations } from "../review/validation-runner.js";
import { buildReview } from "../review/report.js";

/**
 * Compare the implementation diff against the work file's slice contract and
 * write the result into the file's `## Review` section.
 * Mode-scaled: quick is advisory (exit 0); standard/deep exit 1 on drift/fail.
 */
export async function cmdReview(
  cwd: string,
  opts: { file?: string; base?: string; timeoutMs?: number } = {},
): Promise<void> {
  let file: string;
  try {
    file = await resolveWorkFile(cwd, opts.file);
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
    return;
  }

  const work = await parseWorkFile(file);
  const baseline = opts.base ?? "HEAD";

  // `.atelier/` is bookkeeping, not implementation — exclude it from drift.
  const changedFiles = (await gitChangedFiles(cwd, baseline)).filter(
    (f) => !f.startsWith(".atelier/"),
  );
  const { perSlice, violations } = checkSlices(work.slices, changedFiles);
  const perSliceWithValidations = await Promise.all(
    perSlice.map(async (match) => ({
      slice: match.slice,
      matchedFiles: match.matchedFiles,
      validations: await runValidations(cwd, match.slice.validation, {
        timeoutMs: opts.timeoutMs,
      }),
    })),
  );
  const { markdown, failed } = buildReview({
    title: work.title,
    mode: work.mode,
    baseline,
    changedFiles,
    perSlice: perSliceWithValidations,
    violations,
  });

  await writeText(file, replaceReviewSection(work.raw, markdown));

  const gates = work.mode !== "quick" && failed;
  const verdict =
    work.mode === "quick"
      ? pc.cyan("ADVISORY")
      : failed
        ? pc.red("FAIL")
        : pc.green("PASS");
  console.log(`review ${relative(cwd, file)} (mode=${work.mode}): ${verdict}`);
  console.log(pc.dim(`  Violations: ${violations.length}`));
  console.log(
    pc.dim(
      `  Failed validations: ${perSliceWithValidations.reduce(
        (n, s) => n + s.validations.filter((v) => v.status !== "pass").length,
        0,
      )}`,
    ),
  );
  if (gates) process.exitCode = 1;
}
