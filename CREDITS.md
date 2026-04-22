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

- Planner-first kit (`SKILL.md` with frontmatter) with a persistent planner runtime (epics, tasks, slices, approval gates) and multi-agent adapters (Claude Code, Cursor, Codex CLI, Windsurf, Cline, Kilo, Anti-GRAVITY, generic).
- Session state in `.atelier/context.md` and CLI commands (`planner`, `status`, `handoff`).
- Programmatic validators (`doctor`, `validate`).
