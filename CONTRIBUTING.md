# Contributing

## Clean-room rule

Contributions must be **original work** by the contributor. Do **not** copy prompts, code, or long passages from third-party repositories unless you comply fully with their licenses (NOTICE, attribution, etc.).

If you are unsure whether something is sufficiently transformed, open an issue first.

## Development

```bash
pnpm install
pnpm run build
pnpm test
```

## Code style

- TypeScript, ESM, strict mode.
- Prefer small modules and explicit file IO boundaries.

## Repo-local dev infra (not part of the product)

The following entries exist for this repo's own development tooling and are
**not** part of the atelier-kit package:

- `.picklejar/` — transcript / snapshot store for the [picklejar](https://github.com/anthropic-experimental/picklejar) dev tool. Only `config.json` and a thin local-machine hook wrapper are tracked; `snapshots/`, `transcripts/`, and lock files are gitignored.
- `.claude/settings.json`, `.cursor/hooks.json` — hook configurations consumed by Claude Code and Cursor when contributors edit this repo. They invoke the picklejar wrapper above.
- `dev/refactor-plan.md` — the multi-phase refactor plan that produced the current shape of this repo.
- `graphify-out/` — output of the `graphify` knowledge-graph tool when used locally.

The npm package only ships the entries listed in `package.json` `files` (currently `dist`, `kit`, and a handful of root `.md` docs); none of the directories above are published.
