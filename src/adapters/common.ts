export function activationProtocol(): string {
  return [
    "Activation rules:",
    "- Atelier-Kit is inactive by default.",
    "- `/plan ...` stays in the host agent's native plan mode.",
    "- `/atelier quick ...`, `/atelier plan ...`, `/atelier deep ...`, or an explicit request to use Atelier-Kit activates the protocol.",
    "- When inactive, do not create Atelier artifacts, enforce Atelier gates, or load Atelier skills.",
  ].join("\n");
}

export function activeProtocol(): string {
  return [
    "When Atelier is active:",
    "1. Read `.atelier/atelier.json`.",
    "2. Read `.atelier/active.json`.",
    "3. Read `.atelier/epics/<active_epic>/state.json`.",
    "4. Load only the skill referenced by `active_skill`.",
    "5. If `allowed_actions.write_project_code` is false, do not edit project code.",
    "6. If `status` is `awaiting_approval`, present `plan.md` and stop.",
    "7. If `status` is `execution`, execute only `current_slice`.",
    "8. After each protocol step, update the relevant artifact and `state.json`.",
  ].join("\n");
}

export function commandReference(): string {
  return [
    "CLI helpers:",
    '- `atelier status`',
    '- `atelier validate`',
    '- `atelier new "Epic title" --mode quick|standard|deep`',
    '- `atelier approve` / `atelier reject --reason "..."`',
    '- `atelier execute` / `atelier next` / `atelier done`',
    '- `atelier pause` / `atelier off`',
  ].join("\n");
}
