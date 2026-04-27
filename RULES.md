# Rules

The canonical activation rule is **`kit/rules/core.md`**, copied to **`.atelier/rules/core.md`** on `atelier init`.

Summary:

- Atelier is **inactive by default** (`active.json` → `"active": false`).
- Do not create Atelier artifacts unless the user uses `/atelier`, asks for Atelier-Kit, or `active.json` shows active work.

Adapter-specific hints live under **`kit/rules/adapters/`** and install to **`.atelier/rules/adapters/`**.

Regenerate Cursor rules from the merged tree:

```bash
atelier render-rules --adapter cursor
```
