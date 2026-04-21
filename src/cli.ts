#!/usr/bin/env node
import { Command } from "commander";
import { cwd as processCwd } from "node:process";
import { cmdInit } from "./commands/init.js";
import { cmdPhase } from "./commands/phase.js";
import { cmdStatus } from "./commands/status.js";
import { cmdReturn } from "./commands/return-cmd.js";
import { cmdMode } from "./commands/mode.js";
import { cmdHandoff } from "./commands/handoff.js";
import { cmdDoctor } from "./commands/doctor.js";
import { cmdValidate } from "./commands/validate.js";
import { cmdInstallAdapter } from "./commands/install-adapter.js";

const program = new Command();
program
  .name("atelier-kit")
  .description("Skills-first CLI for RPI/QRSPI-style agent workflows")
  .version("0.1.0");

program
  .command("init")
  .description("Install .atelier/ kit and agent adapter")
  .option("-y, --yes", "Skip prompts (default: generic, standard)")
  .action(async (opts: { yes?: boolean }) => {
    await cmdInit(processCwd(), opts);
  });

program
  .command("phase <name>")
  .description("Set session phase in .atelier/context.md")
  .action(async (name: string) => {
    await cmdPhase(processCwd(), name);
  });

program
  .command("status")
  .description("Print .atelier/context.md")
  .action(async () => {
    await cmdStatus(processCwd());
  });

program
  .command("return <phase>")
  .description("Go back to a phase with a recorded reason")
  .requiredOption("-r, --reason <text>", "Reason for the return")
  .action(async (phase: string, opts: { reason: string }) => {
    await cmdReturn(processCwd(), phase, opts.reason);
  });

program
  .command("mode <quick|standard|deep>")
  .description("Set default mode in .atelierrc")
  .action(async (mode: string) => {
    await cmdMode(processCwd(), mode);
  });

program
  .command("handoff")
  .description("Dump context + artifact excerpts for another session")
  .action(async () => {
    await cmdHandoff(processCwd());
  });

program
  .command("doctor")
  .description("Run all validators (skills + artifacts)")
  .action(async () => {
    await cmdDoctor(processCwd());
  });

program
  .command("validate <phase>")
  .description("Run validators for a phase name")
  .action(async (phase: string) => {
    await cmdValidate(processCwd(), phase);
  });

program
  .command("install-adapter <name>")
  .description("claude | cursor | codex | windsurf | generic")
  .action(async (name: string) => {
    await cmdInstallAdapter(processCwd(), name);
  });

await program.parseAsync(process.argv);
