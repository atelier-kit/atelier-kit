#!/usr/bin/env node
import { Command } from "commander";
import { cwd as processCwd } from "node:process";
import { cmdNew } from "./commands/new.js";
import { cmdValidate } from "./commands/validate.js";
import { cmdReview } from "./commands/review.js";

const program = new Command();
program
  .name("atelier")
  .description(
    "Atelier Kit — the verifiable-plan contract for skill-driven agents. " +
      "Skills are distributed via `npx skills`; this CLI only validates and reviews the plan.",
  )
  .version("0.4.0");

program
  .command("new <title>")
  .description("Create a .atelier/work/<slug>.md from the template")
  .option("--mode <quick|standard|deep>", "Planning depth (default: standard)")
  .action(async (title: string, opts: { mode?: string }) => {
    await cmdNew(processCwd(), title, opts);
  });

program
  .command("validate [file]")
  .description("Check a work file's plan against the contract (mode-scaled)")
  .option("--gate <name>", "Gate to run (only plan-ready)", "plan-ready")
  .action(async (file: string | undefined, opts: { gate?: string }) => {
    await cmdValidate(processCwd(), { file, gate: opts.gate });
  });

program
  .command("review [file]")
  .description("Compare the diff against the plan slices; write the ## Review section")
  .option("--base <ref>", "Git baseline to diff against (default: HEAD)")
  .action(async (file: string | undefined, opts: { base?: string }) => {
    await cmdReview(processCwd(), { file, base: opts.base });
  });

await program.parseAsync(process.argv);
