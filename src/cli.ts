#!/usr/bin/env node
import { Command } from "commander";
import { cwd as processCwd } from "node:process";
import { cmdInit } from "./commands/init.js";
import { cmdStatus } from "./commands/status.js";
import { cmdDoctor } from "./commands/doctor.js";
import { cmdValidate } from "./commands/validate.js";
import { cmdInstallAdapter } from "./commands/install-adapter.js";
import { cmdNew } from "./commands/new.js";
import { cmdRenderRules } from "./commands/render-rules.js";
import { cmdApprove } from "./commands/approve.js";
import { cmdReject } from "./commands/reject.js";
import { cmdExecute } from "./commands/execute.js";
import { cmdNext } from "./commands/next.js";
import { cmdDone } from "./commands/done.js";
import { cmdPause } from "./commands/pause.js";
import { cmdOff } from "./commands/off.js";

const program = new Command();
program
  .name("atelier")
  .description("Filesystem-native planning protocol for coding agents")
  .version("0.2.0");

program
  .command("init")
  .description("Install the Atelier planning protocol under .atelier/")
  .option("-y, --yes", "Skip prompts")
  .action(async (opts: { yes?: boolean }) => {
    await cmdInit(processCwd(), opts);
  });

program
  .command("status")
  .description("Show the active Atelier protocol state")
  .action(async () => {
    await cmdStatus(processCwd());
  });

program
  .command("new <title>")
  .description("Create a new epic ledger and activate Atelier")
  .option("--mode <mode>", "quick | standard | deep")
  .action(async (title: string, opts: { mode?: string }) => {
    await cmdNew(processCwd(), title, opts);
  });

program
  .command("validate")
  .description("Validate schemas, protocol gates, and git-diff guardrails")
  .action(async () => {
    await cmdValidate(processCwd());
  });

program
  .command("doctor")
  .description("Diagnose installation and protocol health")
  .action(async () => {
    await cmdDoctor(processCwd());
  });

program
  .command("render-rules")
  .description("Render adapter-specific rules")
  .requiredOption("--adapter <name>", "cursor | claude | codex | windsurf | cline | kilo | antigravity | generic")
  .action(async (opts: { adapter: string }) => {
    await cmdRenderRules(processCwd(), opts);
  });

program
  .command("approve")
  .description("Approve the current plan")
  .action(async () => {
    await cmdApprove(processCwd());
  });

program
  .command("reject")
  .description("Reject the current plan and return to planning")
  .requiredOption("--reason <text>", "Reason for rejection")
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
  .description("Mark the current slice done")
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
  .command("off")
  .description("Disable Atelier")
  .action(async () => {
    await cmdOff(processCwd());
  });

program
  .command("install-adapter <name>")
  .description("Install or switch the active agent adapter")
  .action(async (name: string) => {
    await cmdInstallAdapter(processCwd(), name);
  });

await program.parseAsync(process.argv);
