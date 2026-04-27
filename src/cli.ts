#!/usr/bin/env node
import { Command } from "commander";
import { cwd as processCwd } from "node:process";

// v2 commands
import { cmdV2Init } from "./commands/v2/init.js";
import { cmdV2Status } from "./commands/v2/status.js";
import { cmdV2New } from "./commands/v2/new.js";
import { cmdV2Validate } from "./commands/v2/validate.js";
import { cmdV2Doctor } from "./commands/v2/doctor.js";
import { cmdV2Approve, cmdV2Reject } from "./commands/v2/approve.js";
import { cmdV2Execute, cmdV2Next, cmdV2Done } from "./commands/v2/execute.js";
import { cmdV2Pause, cmdV2Off } from "./commands/v2/off.js";
import { cmdV2RenderRules } from "./commands/v2/render-rules.js";

const program = new Command();
program
  .name("atelier")
  .description("Atelier-Kit v2 — filesystem-native planning protocol for coding agents")
  .version("2.0.0");

program
  .command("init")
  .description("Install .atelier/ planning protocol, rules, skills and schemas")
  .option("-y, --yes", "Skip prompts (default: generic, standard)")
  .option("--adapter <adapter>", "cursor | claude-code | codex | cline | windsurf | generic")
  .option("--mode <mode>", "quick | standard | deep")
  .action(async (opts: { yes?: boolean; adapter?: string; mode?: string }) => {
    await cmdV2Init(processCwd(), opts);
  });

program
  .command("status")
  .description("Show active mode, active epic, phase, skill and approval state")
  .action(async () => {
    await cmdV2Status(processCwd());
  });

program
  .command("new <title>")
  .description('Create a new epic ledger: atelier new "Add payment endpoint" --mode quick')
  .option("--mode <mode>", "quick | standard | deep")
  .action(async (title: string, opts: { mode?: string }) => {
    await cmdV2New(processCwd(), title, opts);
  });

program
  .command("validate")
  .description("Validate schemas, gates and protocol violations")
  .action(async () => {
    await cmdV2Validate(processCwd());
  });

program
  .command("doctor")
  .description("Diagnose installation and broken state")
  .action(async () => {
    await cmdV2Doctor(processCwd());
  });

program
  .command("render-rules")
  .description("Generate agent rules for Cursor, Claude Code, Codex, Cline, etc.")
  .option("--adapter <adapter>", "cursor | claude-code | codex | cline | windsurf | generic")
  .action(async (opts: { adapter?: string }) => {
    await cmdV2RenderRules(processCwd(), opts);
  });

program
  .command("approve")
  .description("Mark pending plan as approved")
  .action(async () => {
    await cmdV2Approve(processCwd());
  });

program
  .command("reject")
  .description("Reject plan and return to planning")
  .requiredOption("-r, --reason <text>", "Reason for rejection")
  .action(async (opts: { reason: string }) => {
    await cmdV2Reject(processCwd(), opts.reason);
  });

program
  .command("execute")
  .description("Start execution after approval (sets current_slice to first ready slice)")
  .action(async () => {
    await cmdV2Execute(processCwd());
  });

program
  .command("next")
  .description("Move to the next slice")
  .action(async () => {
    await cmdV2Next(processCwd());
  });

program
  .command("done")
  .description("Mark current slice as done")
  .action(async () => {
    await cmdV2Done(processCwd());
  });

program
  .command("pause")
  .description("Pause Atelier without deleting the active epic")
  .action(async () => {
    await cmdV2Pause(processCwd());
  });

program
  .command("off")
  .description("Disable Atelier (return to native agent mode)")
  .action(async () => {
    await cmdV2Off(processCwd());
  });

await program.parseAsync(process.argv);
