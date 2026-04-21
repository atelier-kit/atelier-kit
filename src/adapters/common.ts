export function plannerCommandProtocol(): string {
  return `Planner protocol:

- When the user says \`/planner <goal>\`, prefer \`atelier-kit planner autoplan "<goal>"\`, then read \`.atelier/context.md\` again and continue until the planner reaches approval presentation.
- When the user says \`/planner next\`, run \`atelier-kit planner next\`, then re-read \`.atelier/context.md\`.
- When the user says \`/planner done\`, run \`atelier-kit planner done\`, then re-read \`.atelier/context.md\`.
- When the user says \`/planner present\`, run \`atelier-kit planner present\`.
- When the user says \`/planner approve\`, run \`atelier-kit planner approve\`, then re-read \`.atelier/context.md\`.
- When the user says \`/planner reject\`, run \`atelier-kit planner reject --reason "<reason>"\`, then re-read \`.atelier/context.md\`.
- When the user says \`/planner execute\`, run \`atelier-kit planner execute\`, then re-read \`.atelier/context.md\`.
- When the user says \`/planner status\`, run \`atelier-kit status\`.
- When the user says \`/planner focus <id>\`, choose \`atelier-kit planner task focus <id>\` or \`atelier-kit planner slice focus <id>\` based on the current planner state, then re-read \`.atelier/context.md\`.
- When the user says \`/slice start\`, focus the next ready slice with \`atelier-kit planner next\` and continue in implementer mode if a slice becomes active.
- After every planner command that mutates state, re-read \`.atelier/context.md\` before taking further action.`;
}

export function plannerStateReminder(): string {
  return "Use `workflow`, `planner_mode`, `planner_state`, `approval_status`, `current_task`, and `current_slice` together as the state machine.";
}
