export function atelierCommandReference(): string {
  return `Atelier command mapping:

- \`/atelier quick <goal>\` -> \`atelier new "<goal>" --mode quick\`
- \`/atelier plan <goal>\` -> \`atelier new "<goal>" --mode standard\`
- \`/atelier deep <goal>\` -> \`atelier new "<goal>" --mode deep\`
- \`/atelier status\` -> \`atelier status\`
- \`/atelier validate\` -> \`atelier validate\`
- \`/atelier export-plan\` -> \`atelier export-plan --adapter claude-code\`
- \`/atelier review\` -> \`atelier review\`
- \`/atelier next\` -> \`atelier next\` (optional helper to focus the next planning task)
- \`/atelier done\` -> \`atelier done\` (optional helper to complete the focused planning/review task)
- \`/atelier off\` -> \`atelier off\``;
}

export function claudeAtelierCommand(): string {
  return `# Atelier-Kit

Parse the arguments after \`/atelier\` and run the matching command.

${atelierCommandReference()}

After any command or skill step that changes state, read \`.atelier/active.json\`, then read \`.atelier/epics/<active_epic>/state.json\`, then load only \`.atelier/skills/<active_skill>.md\`.

If the active epic has \`status=planned\`, use the exported native plan mirror to implement in Claude Code's native workflow. Keep \`.atelier/epics/<active_epic>/plan.md\` as canonical for review.

After implementation, run \`atelier review\` and compare the diff against \`.atelier/epics/<active_epic>/plan.md\`.
`;
}
