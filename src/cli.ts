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
import {
  cmdApprove,
  cmdDone,
  cmdExecute,
  cmdNext,
  cmdOff,
  cmdPause,
  cmdReject,
  cmdResume,
} from "./commands/lifecycle.js";

const program = new Command();
program
  .name("atelier")
  .description("Filesystem-native Planning Protocol for coding agents")
  .version("0.2.0");

program
  .command("init")
  .description("Install .atelier/ v2 protocol files")
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
  .command("validate [phase]")
  .description("Validate Atelier schemas, gates and protocol violations")
  .action(async () => {
    await cmdValidate(processCwd());
  });

program
  .command("render-rules")
  .description("Render core + adapter rules")
  .requiredOption("--adapter <name>", "cursor|claude-code|codex|cline|windsurf|generic")
  .option("--stdout", "Print rules instead of writing adapter files")
  .action(async (opts: { adapter: string; stdout?: boolean }) => {
    await cmdRenderRules(processCwd(), opts.adapter, { stdout: opts.stdout });
  });

program
  .command("approve")
  .description("Mark a pending plan approved")
  .option("--by <name>", "Approver name")
  .option("--notes <text>", "Approval notes")
  .action(async (opts: { by?: string; notes?: string }) => {
    await cmdApprove(processCwd(), opts);
  });

program
  .command("reject")
  .description("Reject the active plan and return to planning")
  .requiredOption("-r, --reason <text>", "Reason for rejection")
  .action(async (opts: { reason: string }) => {
    await cmdReject(processCwd(), opts.reason);
  });

program
  .command("execute")
  .description("Start execution after approval")
  .action(async () => {
    await cmdExecute(processCwd());
  });

program
  .command("next")
  .description("Focus the next ready slice")
  .action(async () => {
    await cmdNext(processCwd());
  });

program
  .command("done")
  .description("Mark current slice done and advance to review or next slice")
  .action(async () => {
    await cmdDone(processCwd());
  });

program
  .command("pause")
  .description("Pause Atelier without deleting the active epic")
  .action(async () => {
    await cmdPause(processCwd());
  });

program
  .command("resume")
  .description("Resume a paused Atelier epic")
  .action(async () => {
    await cmdResume(processCwd());
  });

program
  .command("off")
  .description("Disable Atelier and return to native mode")
  .action(async () => {
    await cmdOff(processCwd());
  });

program
  .command("install-adapter <name>")
  .description("claude-code | claude | cursor | codex | windsurf | cline | generic")
  .action(async (name: string) => {
    await cmdInstallAdapter(processCwd(), name);
  });

await program.parseAsync(process.argv);
