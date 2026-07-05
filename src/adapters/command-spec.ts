export function atelierCommandReference(_adapter = "claude-code"): string {
  return `Atelier command mapping (file-based — no CLI required):

- \`/atelier quick <goal>\` -> bootstrap a quick epic by following \`.atelier/skills/bootstrap.md\`.
- \`/atelier plan <goal>\` -> bootstrap a standard epic by following \`.atelier/skills/bootstrap.md\`.
- \`/atelier deep <goal>\` -> bootstrap a deep epic by following \`.atelier/skills/bootstrap.md\`.
- \`/atelier status\` -> read \`.atelier/active.json\` and \`.atelier/epics/<active_epic>/state.json\`.
- \`/atelier validate\` -> run each skill's self-check gate against its artifact.
- \`/atelier export-plan\` -> optionally copy \`.atelier/epics/<active_epic>/plan.md\` to the host's plan location.
- \`/atelier review\` -> follow \`.atelier/skills/reviewer.md\`: compute changed-files × allowed_files and write \`review.md\`.
- \`/atelier next\` / \`/atelier done\` -> advance \`.atelier/epics/<active_epic>/state.json\` to the next task.
- \`/atelier off\` -> set \`.atelier/active.json\` to \`{ "active": false, "mode": "native", "active_epic": null, "active_phase": null, "active_skill": null, "updated_at": null }\`.

The \`atelier\` CLI can perform any of these steps as an optional convenience, but the protocol runs entirely from files and never requires it.`;
}

export function claudeAtelierCommand(): string {
  return `# Atelier-Kit

Atelier runs entirely from files under \`.atelier/\`. Act by reading and writing
those files directly; the \`atelier\` CLI is optional and never required.

Parse the arguments after \`/atelier\`:

- \`quick|plan|deep <goal>\`: bootstrap an epic by following \`.atelier/skills/bootstrap.md\` (creates the ledger + stubs and sets \`.atelier/active.json\`).
- \`off\`: set \`.atelier/active.json\` to \`{ "active": false, "mode": "native", "active_epic": null, "active_phase": null, "active_skill": null, "updated_at": null }\`.
- otherwise: read \`.atelier/active.json\`, then \`.atelier/epics/<active_epic>/state.json\`, then load only \`.atelier/skills/<active_skill>.md\`. Work only on the active task; do not fill later artifacts early.

${atelierCommandReference()}

After any step that changes state, update \`.atelier/epics/<active_epic>/state.json\` and keep \`.atelier/active.json\` in sync. Each skill ends with a self-check gate; advance only when it passes.

Before marking a task done, run \`command -v plannotator\`. If it exists, open the focused task's artifact with \`plannotator annotate <artifact-path>\` and fold any notes back into the artifact. (\`command -v\` is a host shell check, not the Atelier CLI.)

If the active epic has \`status=planned\`, implement in Claude Code's native workflow; \`.atelier/epics/<active_epic>/plan.md\` stays canonical. After implementation, follow \`.atelier/skills/reviewer.md\` to write \`review.md\` (compute the diff × allowed_files Scope Check yourself).
`;
}
