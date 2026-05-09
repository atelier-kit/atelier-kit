# Atelier-Kit Planning Protocol

Atelier-Kit is inactive by default. Treat Atelier as **off** unless one of
these is true:

1. The user explicitly uses `/atelier`.
2. The user asks to use Atelier-Kit.
3. `.atelier/active.json` has `"active": true`.
4. The current task belongs to an active Atelier epic.

When Atelier-Kit is inactive:

- Do not create Atelier artifacts.
- Do not enforce Atelier gates.
- Do not block normal agent behavior.
- Do not load Atelier skills.

When Atelier-Kit is active:

1. Read `.atelier/atelier.json`.
2. Read `.atelier/active.json`.
3. Read `.atelier/epics/<active_epic>/state.json`.
4. Load only the skill required by `active_skill`.
5. If `status` is `planned`, use the exported native plan mirror for implementation.
6. If `status` is `review`, compare the native implementation diff against `plan.md`.
7. After each protocol step, update the corresponding artifact and `state.json`.

If anything in `.atelier/` disagrees with reality, pause and fix it with `atelier validate` or `atelier doctor` instead of guessing.

The ledger file is `.atelier/epics/<active_epic>/state.json`. Ignore `.atelier/context.md` for v2 authority—it is not the source of truth.
