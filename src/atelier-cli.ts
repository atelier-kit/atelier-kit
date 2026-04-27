#!/usr/bin/env node
import { Command } from "commander";
import { cwd as processCwd } from "node:process";
import pc from "picocolors";
import { cmdInit } from "./commands/init.js";
import { cmdAtelierNew } from "./commands/atelier-new.js";
import {
  cmdAtelierApprove,
  cmdAtelierReject,
  cmdAtelierExecute,
  cmdAtelierNext,
  cmdAtelierDone,
  cmdAtelierPause,
  cmdAtelierOff,
} from "./commands/atelier-lifecycle.js";
import { cmdAtelierStatus } from "./commands/atelier-status.js";
import { cmdAtelierValidate } from "./commands/atelier-validate.js";
import { cmdAtelierDoctorV2 } from "./commands/atelier-doctor-v2.js";
import { cmdRenderRules } from "./commands/render-rules.js";
import { ModeSchema } from "./state/schema.js";

const program = new Command();
program
  .name("atelier")
  .description("Atelier-Kit v2 — filesystem planning protocol")
  .version("0.2.0");

program
  .command("init")
  .description("Install .atelier/ protocol, rules, skills, schemas")
  .option("-y, --yes", "Skip prompts")
  .action(async (opts: { yes?: boolean }) => {
    await cmdInit(processCwd(), opts);
  });

program
  .command("status")
  .description("Show active mode, epic, phase, skill, approval")
  .action(async () => {
    await cmdAtelierStatus(processCwd());
  });

program
  .command("new")
  .description("Create a new epic and activate Atelier")
  .argument("<title>", "Epic title")
  .requiredOption("--mode <mode>", "quick | standard | deep")
  .action(async (title: string, opts: { mode: string }) => {
    const m = ModeSchema.safeParse(opts.mode);
    if (!m.success) {
      console.error(pc.red("Invalid --mode"));
      process.exit(1);
    }
    await cmdAtelierNew(processCwd(), title, m.data);
  });

program
  .command("validate")
  .description("Validate schemas, gates, and git guard")
  .action(async () => {
    await cmdAtelierValidate(processCwd());
  });

program
  .command("doctor")
  .description("Diagnose installation and protocol state")
  .action(async () => {
    await cmdAtelierDoctorV2(processCwd());
  });

program
  .command("render-rules")
  .description("Render merged rules for an adapter")
  .requiredOption("--adapter <name>", "cursor | claude-code | codex | cline | windsurf | generic")
  .option("-o, --output <path>", "Output file path")
  .action(async (opts: { adapter: string; output?: string }) => {
    await cmdRenderRules(processCwd(), opts.adapter, opts.output);
  });

program
  .command("approve")
  .description("Approve pending plan")
  .action(async () => {
    await cmdAtelierApprove(processCwd());
  });

program
  .command("reject")
  .description("Reject plan and return to planning")
  .requiredOption("-r, --reason <text>", "Reason")
  .action(async (opts: { reason: string }) => {
    await cmdAtelierReject(processCwd(), opts.reason);
  });

program
  .command("execute")
  .description("Start execution after approval")
  .action(async () => {
    await cmdAtelierExecute(processCwd());
  });

program
  .command("next")
  .description("Move to next ready slice")
  .action(async () => {
    await cmdAtelierNext(processCwd());
  });

program
  .command("done")
  .description("Mark current slice done")
  .action(async () => {
    await cmdAtelierDone(processCwd());
  });

program
  .command("pause")
  .description("Pause Atelier (keeps active_epic)")
  .action(async () => {
    await cmdAtelierPause(processCwd());
  });

program
  .command("off")
  .description("Disable Atelier")
  .action(async () => {
    await cmdAtelierOff(processCwd());
  });

await program.parseAsync(process.argv);
