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
import {
  cmdWorkflow,
  cmdPlannerAutoplan,
  cmdPlannerStart,
  cmdPlannerNext,
  cmdPlannerDone,
  cmdPlannerGenerateSlices,
  cmdPlannerPresent,
  cmdPlannerApprove,
  cmdPlannerReject,
  cmdPlannerExecute,
  cmdPlannerSyncPhase,
  cmdPlannerValidate,
  cmdEpicAdd,
  cmdEpicFocus,
  cmdEpicUpdate,
  cmdTaskAdd,
  cmdTaskFocus,
  cmdTaskUpdate,
  cmdSliceAdd,
  cmdSliceFocus,
  cmdSliceUpdate,
} from "./commands/planner.js";

const program = new Command();
program
  .name("atelier-kit")
  .description("Planner-first CLI for AI agent workflows")
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
  .description("Advanced/internal runtime lens override")
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
  .description("Advanced/internal runtime rollback")
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
  .description("Run an advanced/internal validator")
  .action(async (phase: string) => {
    await cmdValidate(processCwd(), phase);
  });

program
  .command("install-adapter <name>")
  .description("claude | cursor | codex | windsurf | cline | kilo | antigravity | generic")
  .action(async (name: string) => {
    await cmdInstallAdapter(processCwd(), name);
  });

const planner = program
  .command("planner")
  .description("Manage planner workflow, epics, tasks, and slices");

planner
  .command("workflow <mode>")
  .description("Ensure planner workflow is active")
  .action(async (mode: string) => {
    await cmdWorkflow(processCwd(), mode);
  });

planner
  .command("autoplan <goal>")
  .description("Run planning through presentation and stop for approval")
  .action(async (goal: string) => {
    await cmdPlannerAutoplan(processCwd(), goal);
  });

planner
  .command("start <goal>")
  .description("Start a planner workflow from a goal")
  .action(async (goal: string) => {
    await cmdPlannerStart(processCwd(), goal);
  });

planner
  .command("next")
  .description("Advance planner focus to the next task or slice")
  .action(async () => {
    await cmdPlannerNext(processCwd());
  });

planner
  .command("done")
  .description("Mark the current planner task or slice as done and advance")
  .action(async () => {
    await cmdPlannerDone(processCwd());
  });

planner
  .command("generate-slices")
  .description("Generate initial slices from completed synthesis work")
  .action(async () => {
    await cmdPlannerGenerateSlices(processCwd());
  });

planner
  .command("present")
  .description("Render the planner proposal and stop for human approval")
  .action(async () => {
    await cmdPlannerPresent(processCwd());
  });

planner
  .command("approve")
  .description("Approve the current planner proposal for execution")
  .action(async () => {
    await cmdPlannerApprove(processCwd());
  });

planner
  .command("reject")
  .description("Reject the current planner proposal and return to planning")
  .requiredOption("-r, --reason <text>", "Reason for rejection")
  .action(async (opts: { reason: string }) => {
    await cmdPlannerReject(processCwd(), opts.reason);
  });

planner
  .command("execute")
  .description("Enter execution mode after approval and focus the next approved slice")
  .action(async () => {
    await cmdPlannerExecute(processCwd());
  });

planner
  .command("sync-phase")
  .description("Sync the internal execution lens")
  .action(async () => {
    await cmdPlannerSyncPhase(processCwd());
  });

planner
  .command("validate")
  .description("Report planner blockers and concrete next actions without presenting")
  .option("--repair", "Reconcile planner state from valid artifacts where safe")
  .action(async (opts: { repair?: boolean }) => {
    await cmdPlannerValidate(processCwd(), opts);
  });

const epic = planner
  .command("epic")
  .description("Manage planner epics");

epic
  .command("add")
  .description("Add an epic to planner state")
  .requiredOption("--id <id>", "Epic identifier")
  .requiredOption("--title <title>", "Epic title")
  .option("--goal <goal>", "Epic goal")
  .option("--summary <summary>", "Epic summary")
  .option("--status <status>", "draft|researching|blocked|ready|executing|done|cancelled")
  .option("--sprint-id <id>", "Optional sprint identifier")
  .option("--labels <labels>", "Comma-separated labels")
  .action(async (opts) => {
    await cmdEpicAdd(processCwd(), opts.id, {
      title: opts.title,
      goal: opts.goal,
      summary: opts.summary,
      status: opts.status,
      sprint: opts.sprintId,
      labels: opts.labels,
    });
  });

epic
  .command("update <id>")
  .description("Update an existing epic")
  .option("--title <title>", "Epic title")
  .option("--goal <goal>", "Epic goal")
  .option("--summary <summary>", "Epic summary")
  .option("--status <status>", "draft|researching|blocked|ready|executing|done|cancelled")
  .option("--sprint-id <id>", "Optional sprint identifier")
  .option("--labels <labels>", "Comma-separated labels")
  .action(async (id: string, opts) => {
    await cmdEpicUpdate(processCwd(), id, {
      title: opts.title,
      goal: opts.goal,
      summary: opts.summary,
      status: opts.status,
      sprint: opts.sprintId,
      labels: opts.labels,
    });
  });

epic
  .command("focus <id>")
  .description("Focus an epic in planner state")
  .action(async (id: string) => {
    await cmdEpicFocus(processCwd(), id);
  });

const task = planner
  .command("task")
  .description("Manage planner tasks");

task
  .command("add")
  .description("Add a task to planner state")
  .requiredOption("--id <id>", "Task identifier")
  .requiredOption("--epic <epicId>", "Epic identifier")
  .requiredOption("--title <title>", "Task title")
  .requiredOption("--type <type>", "repo|tech|business|synthesis|implementation|decision")
  .option("--summary <summary>", "Task summary")
  .option("--status <status>", "draft|researching|blocked|ready|executing|done|cancelled")
  .option("--depends-on <ids>", "Comma-separated task dependencies")
  .option("--acceptance <items>", "Pipe-separated acceptance criteria")
  .option("--open-questions <items>", "Pipe-separated open questions")
  .option("--evidence-refs <items>", "Pipe-separated evidence references")
  .option("--slice <sliceId>", "Associated slice identifier")
  .action(async (opts) => {
    await cmdTaskAdd(processCwd(), opts.id, {
      epic: opts.epic,
      title: opts.title,
      type: opts.type,
      summary: opts.summary,
      status: opts.status,
      dependsOn: opts.dependsOn,
      acceptance: opts.acceptance,
      openQuestions: opts.openQuestions,
      evidenceRefs: opts.evidenceRefs,
      slice: opts.slice,
    });
  });

task
  .command("update <id>")
  .description("Update an existing task")
  .option("--title <title>", "Task title")
  .option("--type <type>", "repo|tech|business|synthesis|implementation|decision")
  .option("--summary <summary>", "Task summary")
  .option("--status <status>", "draft|researching|blocked|ready|executing|done|cancelled")
  .option("--depends-on <ids>", "Comma-separated task dependencies")
  .option("--acceptance <items>", "Pipe-separated acceptance criteria")
  .option("--open-questions <items>", "Pipe-separated open questions")
  .option("--evidence-refs <items>", "Pipe-separated evidence references")
  .option("--slice <sliceId>", "Associated slice identifier")
  .action(async (id: string, opts) => {
    await cmdTaskUpdate(processCwd(), id, {
      epic: opts.epic,
      title: opts.title,
      type: opts.type,
      summary: opts.summary,
      status: opts.status,
      dependsOn: opts.dependsOn,
      acceptance: opts.acceptance,
      openQuestions: opts.openQuestions,
      evidenceRefs: opts.evidenceRefs,
      slice: opts.slice,
    });
  });

task
  .command("focus <id>")
  .description("Focus a task in planner state")
  .action(async (id: string) => {
    await cmdTaskFocus(processCwd(), id);
  });

const slice = planner
  .command("slice")
  .description("Manage planner slices");

slice
  .command("add")
  .description("Add a slice to planner state")
  .requiredOption("--id <id>", "Slice identifier")
  .requiredOption("--epic <epicId>", "Epic identifier")
  .requiredOption("--title <title>", "Slice title")
  .requiredOption("--goal <goal>", "Slice goal")
  .option("--kind <kind>", "discovery|delivery")
  .option("--summary <summary>", "Slice summary")
  .option("--status <status>", "draft|researching|blocked|ready|executing|done|cancelled")
  .option("--depends-on <ids>", "Comma-separated task or slice dependencies")
  .option("--source-tasks <ids>", "Comma-separated source task identifiers")
  .option("--acceptance <items>", "Pipe-separated acceptance criteria")
  .option("--risks <items>", "Pipe-separated risks")
  .action(async (opts) => {
    await cmdSliceAdd(processCwd(), opts.id, {
      epic: opts.epic,
      title: opts.title,
      goal: opts.goal,
      kind: opts.kind,
      summary: opts.summary,
      status: opts.status,
      dependsOn: opts.dependsOn,
      sourceTasks: opts.sourceTasks,
      acceptance: opts.acceptance,
      risks: opts.risks,
    });
  });

slice
  .command("update <id>")
  .description("Update an existing slice")
  .option("--title <title>", "Slice title")
  .option("--goal <goal>", "Slice goal")
  .option("--kind <kind>", "discovery|delivery")
  .option("--summary <summary>", "Slice summary")
  .option("--status <status>", "draft|researching|blocked|ready|executing|done|cancelled")
  .option("--depends-on <ids>", "Comma-separated task or slice dependencies")
  .option("--source-tasks <ids>", "Comma-separated source task identifiers")
  .option("--acceptance <items>", "Pipe-separated acceptance criteria")
  .option("--risks <items>", "Pipe-separated risks")
  .action(async (id: string, opts) => {
    await cmdSliceUpdate(processCwd(), id, {
      epic: opts.epic,
      title: opts.title,
      goal: opts.goal,
      kind: opts.kind,
      summary: opts.summary,
      status: opts.status,
      dependsOn: opts.dependsOn,
      sourceTasks: opts.sourceTasks,
      acceptance: opts.acceptance,
      risks: opts.risks,
    });
  });

slice
  .command("focus <id>")
  .description("Focus a slice in planner state")
  .action(async (id: string) => {
    await cmdSliceFocus(processCwd(), id);
  });

await program.parseAsync(process.argv);
