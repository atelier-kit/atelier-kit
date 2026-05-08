#!/usr/bin/env node
import { Command } from "commander";
import { cwd as processCwd } from "node:process";
import { cmdInit } from "./commands/init.js";
import { cmdStatus } from "./commands/status.js";
import { cmdDoctor } from "./commands/doctor.js";
import { cmdValidate } from "./commands/validate.js";
import { cmdInstallAdapter } from "./commands/install-adapter.js";
import { cmdNew } from "./commands/new.js";
import { cmdRenderRules } from "./commands/rules.js";
import { cmdExportPlan } from "./commands/export-plan.js";
import { cmdReview } from "./commands/review.js";
import { cmdDone, cmdNext, cmdOff } from "./commands/lifecycle.js";

const program = new Command();
program
  .name("atelier")
  .description("Planning protocol CLI — installs .atelier/, validates state, renders adapters")
  .version("0.2.0");

program
  .command("init")
  .description("Install .atelier/ protocol files")
  .option("-y, --yes", "Skip prompts (default: generic, standard)")
  .action(async (opts: { yes?: boolean }) => {
    await cmdInit(processCwd(), opts);
  });

program
  .command("new <title>")
  .description("Create and activate a new Atelier epic")
  .option("--mode <quick|standard|deep>", "Atelier planning mode")
  .option("--goal <goal>", "Explicit epic goal")
  .action(async (title: string, opts: { mode?: string; goal?: string }) => {
    await cmdNew(processCwd(), title, opts);
  });

program
  .command("status")
  .description("Show active Atelier protocol state")
  .action(async () => {
    await cmdStatus(processCwd());
  });

program
  .command("doctor")
  .description("Diagnose Atelier installation and state")
  .action(async () => {
    await cmdDoctor(processCwd());
  });

program
  .command("validate")
  .description("Validate Atelier schemas, gates and protocol violations")
  .option("--gate <name>", "Run a specific gate: plan-ready")
  .action(async (opts: { gate?: string }) => {
    await cmdValidate(processCwd(), opts);
  });

program
  .command("render-rules")
  .description("Render core + adapter rules")
  .requiredOption("--adapter <name>", "cursor|claude-code|codex|gemini-cli|antigravity|kiro|kilo|cline|windsurf|generic")
  .option("--stdout", "Print rules instead of writing adapter files")
  .action(async (opts: { adapter: string; stdout?: boolean }) => {
    await cmdRenderRules(processCwd(), opts.adapter, { stdout: opts.stdout });
  });

program
  .command("export-plan")
  .description("Export the active Atelier plan to an agent-native mirror file")
  .option("--adapter <name>", "claude-code|cursor|kiro|antigravity|generic")
  .option("--path <path>", "Target path; supports {cwd}, {home}, {epic_id}, {title}")
  .option("--command <command>", "Optional shell command to run after export; receives ATELIER_PLAN_PATH")
  .option("--if-planned", "Skip unless the active epic is planned")
  .option("--quiet", "Suppress non-error output")
  .action(async (opts: {
    adapter?: string;
    path?: string;
    command?: string;
    ifPlanned?: boolean;
    quiet?: boolean;
  }) => {
    await cmdExportPlan(processCwd(), opts);
  });

program
  .command("review")
  .description("Create a review scaffold comparing implementation against the Atelier plan")
  .action(async () => {
    await cmdReview(processCwd());
  });

program
  .command("next")
  .description("Focus the next ready slice")
  .action(async () => {
    await cmdNext(processCwd());
  });

program
  .command("done")
  .description("Mark current planning/review task done")
  .action(async () => {
    await cmdDone(processCwd());
  });

program
  .command("off")
  .description("Disable Atelier and return to native mode")
  .action(async () => {
    await cmdOff(processCwd());
  });

program
  .command("install-adapter <name>")
  .description("claude-code | claude | cursor | codex | gemini-cli | antigravity | kiro | kilo | windsurf | cline | generic")
  .action(async (name: string) => {
    await cmdInstallAdapter(processCwd(), name);
  });

program
  .command("adapter")
  .description("Adapter helpers")
  .command("install <name>")
  .description("Install adapter files for an agent")
  .action(async (name: string) => {
    await cmdInstallAdapter(processCwd(), name);
  });

await program.parseAsync(process.argv);
