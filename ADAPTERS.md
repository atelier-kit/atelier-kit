# Atelier-Kit v2 — Adapters

Adapters install Atelier-Kit rules into the host agent's rules system.

---

## Install

```bash
atelier init                            # prompts for adapter
atelier render-rules --adapter cursor   # render rules for Cursor
```

---

## Adapter: `cursor`

- **File:** `.cursor/rules/atelier-core.mdc`
- **Format:** MDC with `alwaysApply: true` front matter

Activates when the user uses `/atelier` in Cursor's chat.

Native Plan Mode (`/plan`) is not affected.

---

## Adapter: `claude-code`

- **File:** `.claude/CLAUDE.md`
- **Format:** Markdown

Activates when the user uses `/atelier` or asks to use Atelier-Kit.

---

## Adapter: `codex`

- **File:** `AGENTS.md`
- **Format:** Markdown

Activates when the user uses `/atelier` with Codex CLI.

---

## Adapter: `cline`

- **File:** `.clinerules/atelier-core.md`
- **Format:** Markdown

---

## Adapter: `windsurf`

- **File:** `.windsurfrules`
- **Format:** Markdown

---

## Adapter: `generic`

- **File:** `atelier-system-prompt.txt`
- **Format:** Plain text

For any agent that supports a system prompt or instruction file.

---

## Command Mapping

All adapters teach the agent to map `/atelier` commands to the CLI:

| User says | CLI command |
|---|---|
| `/atelier quick <goal>` | `atelier new "<goal>" --mode quick` |
| `/atelier plan <goal>` | `atelier new "<goal>" --mode standard` |
| `/atelier deep <goal>` | `atelier new "<goal>" --mode deep` |
| `/atelier status` | `atelier status` |
| `/atelier approve` | `atelier approve` |
| `/atelier reject` | `atelier reject --reason "..."` |
| `/atelier execute` | `atelier execute` |
| `/atelier next` | `atelier next` |
| `/atelier done` | `atelier done` |
| `/atelier off` | `atelier off` |
