# CLI Reference

## Initialize

```bash
atelier init
```

Installs `.atelier/`, protocol files, bundled rules, skills, schemas, and adapter rules.

## Inspect state

```bash
atelier status
atelier validate
atelier doctor
```

## Create and activate an epic

```bash
atelier new "Add payment endpoint" --mode quick
```

## Approval and execution

```bash
atelier approve
atelier reject --reason "Need smaller slices"
atelier execute
atelier next
atelier done
```

## Session control

```bash
atelier pause
atelier off
```

## Adapter rule rendering

```bash
atelier render-rules --adapter cursor
```
