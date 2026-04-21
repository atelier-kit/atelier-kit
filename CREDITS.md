# Credits & prior art

atelier-kit implements the **Research–Plan–Implement (RPI)** methodology and its expanded form **QRSPI**, originally developed by **Dexter Horthy** and **HumanLayer**.

This project is an **independent, clean-room implementation** and is **not affiliated with, endorsed by, or a product of HumanLayer**.

## Primary references

- HumanLayer — Advanced Context Engineering for Coding Agents: https://github.com/humanlayer/advanced-context-engineering-for-coding-agents
- HumanLayer — 12-Factor Agents manifesto: https://github.com/humanlayer/12-factor-agents
- HumanLayer — humanlayer / CodeLayer: https://github.com/humanlayer/humanlayer

## Community prior art

- bostonaholic/rpikit — Claude Code plugin for RPI (MIT): https://github.com/bostonaholic/rpikit

## What atelier-kit adds

- Skills-first kit (`SKILL.md` with frontmatter) plus multi-agent adapters (Claude Code, Cursor, Codex CLI, Windsurf, generic).
- Session state in `.atelier/context.md` and CLI commands (`phase`, `status`, `return`, `handoff`).
- Programmatic validators (`doctor`, `validate`).
