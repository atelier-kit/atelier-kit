# Atelier-Kit v2 — CLI Reference

The CLI binary is `atelier` (also aliased as `atelier-kit`).

---

## `atelier init`

Install `.atelier/` planning protocol, rules, skills and schemas.

```bash
atelier init
atelier init --yes                         # skip prompts
atelier init --yes --adapter cursor --mode quick
```

**Options:**
- `-y, --yes` — skip interactive prompts
- `--adapter <name>` — `cursor | claude-code | codex | cline | windsurf | generic`
- `--mode <mode>` — `quick | standard | deep`

**Creates:**
- `.atelier/atelier.json`
- `.atelier/active.json` (`active=false`)
- `.atelier/protocol/`
- `.atelier/rules/`
- `.atelier/skills/`
- `.atelier/schemas/`
- `.atelier/epics/`

---

## `atelier status`

Show active mode, active epic, phase, skill and approval state.

```bash
atelier status
```

---

## `atelier new`

Create a new epic ledger and activate Atelier.

```bash
atelier new "Add payment endpoint"
atelier new "Add payment endpoint" --mode quick
atelier new "Migrate auth to SSO" --mode deep
```

**Options:**
- `--mode <mode>` — `quick | standard | deep` (defaults to `default_atelier_mode` in `atelier.json`)

**Effect:**
- Creates `.atelier/epics/<slug>/state.json`
- Sets `active.json` to `active=true`
- Sets `status=discovery`
- Sets `allowed_actions.write_project_code=false`

---

## `atelier validate`

Validate schemas, gates and protocol violations.

```bash
atelier validate
```

Checks:
- `atelier.json` is valid
- `active.json` is valid
- `state.json` is valid (if active)
- Required artifacts exist
- Slices have acceptance criteria and validation
- No premature code changes (git diff)

---

## `atelier doctor`

Diagnose installation and broken state.

```bash
atelier doctor
```

Checks presence of all required files in `.atelier/`.

---

## `atelier render-rules`

Generate rules for your agent environment.

```bash
atelier render-rules --adapter cursor
atelier render-rules --adapter claude-code
atelier render-rules --adapter codex
atelier render-rules --adapter cline
atelier render-rules --adapter windsurf
atelier render-rules --adapter generic
```

**Output files:**

| Adapter | File |
|---|---|
| `cursor` | `.cursor/rules/atelier-core.mdc` |
| `claude-code` | `.claude/CLAUDE.md` |
| `codex` | `AGENTS.md` |
| `cline` | `.clinerules/atelier-core.md` |
| `windsurf` | `.windsurfrules` |
| `generic` | `atelier-system-prompt.txt` |

---

## `atelier approve`

Mark pending plan as approved.

```bash
atelier approve
```

Requires `status=awaiting_approval`. Sets `approval.status=approved` and `status=approved`.

---

## `atelier reject`

Reject plan and return to planning.

```bash
atelier reject --reason "Need smaller slices"
```

Sets `approval.status=rejected`, `status=planning`.

---

## `atelier execute`

Start execution after approval. Finds first ready slice.

```bash
atelier execute
```

Requires `approval.status=approved`. Sets `status=execution`, `write_project_code=true`, `current_slice=<first-ready>`.

---

## `atelier next`

Move to the next slice (or to review if none remain).

```bash
atelier next
```

---

## `atelier done`

Mark the current slice as done.

```bash
atelier done
```

---

## `atelier pause`

Pause Atelier without deleting the active epic.

```bash
atelier pause
```

---

## `atelier off`

Disable Atelier. Returns to native agent mode.

```bash
atelier off
```

Epic data is preserved in `.atelier/epics/`.
