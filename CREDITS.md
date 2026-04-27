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

- An opt-in, filesystem-native Planning Protocol for coding agents.
- Explicit active state in `.atelier/active.json` and per-epic source of truth in `.atelier/epics/<epic>/state.json`.
- Programmatic validators (`doctor`, `validate`), approval gates, on-demand skills, and multi-agent adapter rules.
