export function atelierCommandReference(): string {
  return `Atelier command mapping:

- \`/atelier quick <goal>\` -> \`atelier new "<goal>" --mode quick\`
- \`/atelier plan <goal>\` -> \`atelier new "<goal>" --mode standard\`
- \`/atelier deep <goal>\` -> \`atelier new "<goal>" --mode deep\`
- \`/atelier status\` -> \`atelier status\`
- \`/atelier validate\` -> \`atelier validate\`
- \`/atelier approve\` -> \`atelier approve\`
- \`/atelier execute\` -> \`atelier execute\`
- \`/atelier next\` -> \`atelier next\` (focus the next planning task, or next execution slice)
- \`/atelier done\` -> \`atelier done\` (complete the focused planning task, or current execution slice)
- \`/atelier pause\` -> \`atelier pause\`
- \`/atelier off\` -> \`atelier off\``;
}

export function claudeAtelierCommand(): string {
  return `# Atelier-Kit

Parse the arguments after \`/atelier\` and run the matching command.

${atelierCommandReference()}

After any command that changes state, read \`.atelier/active.json\`, then read \`.atelier/epics/<active_epic>/state.json\`, then load only \`.atelier/skills/<active_skill>.md\`.

If the active epic has \`status=awaiting_approval\`, read \`.atelier/epics/<active_epic>/plan.md\`, present that Atelier plan in chat for human approval, and stop. Do not use or write Claude native plan files under \`~/.claude/plans/\` unless the user explicitly asks for a Claude-native mirror.

Never edit project code unless the active epic has \`status=execution\`, \`approval.status=approved\`, and \`allowed_actions.write_project_code=true\`.
`;
}
