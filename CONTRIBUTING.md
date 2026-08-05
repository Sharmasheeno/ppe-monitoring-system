# Contributing to Sentinel

Thanks for wanting to improve the system! This guide covers the practical steps.

## Setup

1. Fork and clone the repo.
2. Read the top-level `README.md` for the quick-start commands.
3. Copy the `.env.example` files inside `server/` and `ai-engine/` to `.env` and fill in the values.

## Branching

- Cut a feature branch from `main`: `git checkout -b feat/short-name`
- Bug fixes: `fix/short-name`
- Docs only: `docs/short-name`

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) — the project already does this.

```
feat(client): add violation timeline to dashboard
fix(ai-engine): raise helmet threshold to 0.35 to cut false positives
docs: add MQTT topic reference
```

## Pull requests

Open a PR against `main`. Fill in the PR template — the CI will run automatically.
A reviewer will look at:

- Code quality (readable, no dead code, existing style)
- Test coverage where relevant
- Docs updated when behaviour changes
- No secrets or model weights committed

## Reporting bugs

Open an issue with the bug-report template. Include logs and reproduction steps.

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
