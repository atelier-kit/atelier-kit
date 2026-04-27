export function atelierCommandProtocol(): string {
  return `Atelier protocol:

- \`/plan ...\` remains native host-agent planning.
- \`/atelier quick ...\`, \`/atelier plan ...\`, and \`/atelier deep ...\` activate Atelier.
- Use \`atelier new "<goal>" --mode quick|standard|deep\` to create an epic ledger.
- Read \`.atelier/active.json\` and \`.atelier/epics/<active_epic>/state.json\` when active.
- Stop at \`awaiting_approval\`; use \`atelier approve\` only after the before_approval gate passes.
- Use \`atelier execute\`, \`atelier done\`, and \`atelier next\` to execute approved slices one at a time.`;
}

export function atelierStateReminder(): string {
  return "Use `active`, `active_epic`, `active_phase`, `active_skill`, `status`, `approval`, and `current_slice` as the protocol state.";
}

export function activationReminder(): string {
  return `Atelier-Kit is inactive by default.

- \`/plan ...\` remains native host-agent planning.
- \`/atelier quick ...\`, \`/atelier plan ...\`, and \`/atelier deep ...\` activate Atelier.
- When inactive, do not create Atelier artifacts or enforce Atelier gates.`;
}

export function adapterInstruction(): string {
  return `${atelierCommandProtocol()}

${atelierStateReminder()}

When Atelier is active, load only the skill named by \`active_skill\` and do not edit project code unless the active epic is in \`execution\` with approved approval status.`;
}

