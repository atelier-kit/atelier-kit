export function plannerCommandProtocol(): string {
  return `Planner protocol:

- When the user says \`/planner <goal>\`, run \`atelier-kit planner start "<goal>"\`, then read \`.atelier/context.md\` again and continue with the active skill.
- When the user says \`/planner next\`, run \`atelier-kit planner next\`, then re-read \`.atelier/context.md\`.
- When the user says \`/planner done\`, run \`atelier-kit planner done\`, then re-read \`.atelier/context.md\`.
- When the user says \`/planner status\`, run \`atelier-kit status\`.
- When the user says \`/planner focus <id>\`, choose \`atelier-kit planner task focus <id>\` or \`atelier-kit planner slice focus <id>\` based on the current planner state, then re-read \`.atelier/context.md\`.
- When the user says \`/slice start\`, focus the next ready slice with \`atelier-kit planner next\` and continue in implementer mode if a slice becomes active.
- After every planner command that mutates state, re-read \`.atelier/context.md\` before taking further action.`;
}

export function plannerStateReminder(): string {
  return "Use `workflow`, `phase`, `current_task`, and `current_slice` together as the state machine.";
}
