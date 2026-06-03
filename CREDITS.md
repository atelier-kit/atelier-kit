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

- A skill-first, opt-in layer that stores intent in one Markdown file per task (`.atelier/work/<slug>.md`) instead of burying it in chat logs.
- A verifiable plan contract — slices with allowed files, observable acceptance criteria, and runnable validation — checked by `atelier validate` and `atelier review`.
- Mode-scaled depth (quick / standard / deep), distributed as standard Agent Skills via `npx skills`.
