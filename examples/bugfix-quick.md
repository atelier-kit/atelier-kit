# Example — Quick mode bugfix

> User: "The error toast shows the raw error code instead of the message. Fix it.
> Use Atelier."

The router picks **quick**: one file, low risk, no contract needed. The whole
work item is a single `.atelier/work/fix-error-toast.md`:

```markdown
# Work: Fix error toast message

## Mode

quick

## Objective

Show the human-readable `error.message` in the toast, not the numeric code.

## Change

`src/ui/toast.ts` rendered `error.code`. Changed it to `error.message`, falling
back to `error.code` only when the message is empty.

## Validation

- `pnpm test src/ui/toast.test.ts` — added a case asserting the message renders.
- Manually triggered a failing request; toast now reads "Network unavailable".
```

No slices, no `atelier validate` gate, no plan ceremony. `atelier review` (if run)
is advisory and exits 0. Quick mode keeps the process smaller than the task.
