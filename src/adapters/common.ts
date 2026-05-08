export function atelierCommandProtocol(): string {
  return `Atelier protocol:

- \`/plan ...\` remains native host-agent planning.
- \`/atelier quick ...\`, \`/atelier plan ...\`, and \`/atelier deep ...\` activate Atelier.
- Use \`atelier new "<goal>" --mode quick|standard|deep\` to create an epic ledger.
- Read \`.atelier/active.json\` and \`.atelier/epics/<active_epic>/state.json\` when active.
- Use \`atelier next\` and \`atelier done\` to advance discovery/design/planning tasks.
- At \`planned\`, use the exported native plan mirror for implementation in the host agent.
- After native implementation, run \`atelier review\` to compare changes against the Atelier plan.`;
}

export function atelierStateReminder(): string {
  return "Use `active`, `active_epic`, `active_phase`, `active_skill`, and `status` as the protocol state.";
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

When Atelier is active, load only the skill named by \`active_skill\`. Once status is \`planned\`, implementation belongs to the host agent's native workflow.`;
}
