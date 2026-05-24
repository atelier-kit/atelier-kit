export function atelierCommandReference(): string {
  return `Atelier command mapping:

- \`/atelier quick <goal>\` -> \`atelier new "<goal>" --mode quick\`
- \`/atelier plan <goal>\` -> \`atelier new "<goal>" --mode standard\`
- \`/atelier deep <goal>\` -> \`atelier new "<goal>" --mode deep\`
- \`/atelier status\` -> \`atelier status\`
- \`/atelier validate\` -> \`atelier validate\` (add \`--verbose\` for installation checks, or \`--gate plan-ready\`)
- \`/atelier export-plan\` -> \`atelier export-plan --adapter claude-code\`
- \`/atelier review\` -> \`atelier review\`
- \`/atelier off\` -> \`atelier off\``;
}

export function claudeAtelierCommand(): string {
  return `# Atelier-Kit

Parse the arguments after \`/atelier\` and run the matching command.

${atelierCommandReference()}

After any command or skill step that changes state, read \`.atelier/active.json\`, then read \`.atelier/epics/<active_epic>/state.json\`, then load only \`.atelier/skills/<active_skill>.md\`. Work only on the active task; do not fill later artifacts early. Advance \`state.json\` directly when a phase is complete.

Before marking a planning task done in \`state.json\`, run \`command -v plannotator\`. If it exists, open the focused task's artifact with \`plannotator annotate <artifact-path>\` and fold any notes back into the artifact. Do not use \`atelier status\` or a chat review request as a substitute for that step.

If the active epic has \`status=planned\`, use the exported native plan mirror to implement in Claude Code's native workflow. Keep \`.atelier/epics/<active_epic>/plan.md\` as canonical for review.

After implementation, run \`atelier review\` and compare the diff against \`.atelier/epics/<active_epic>/plan.md\`.
`;
}
