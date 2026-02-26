# Git History and Branch Hygiene

Last updated: February 26, 2026

## Merge Strategy

Preferred strategy: squash merge to keep `main` history concise and review-oriented.

## Branch Workflow

1. Branch from `main` with a focused name (`feat/*`, `fix/*`, `docs/*`, `chore/*`).
2. Keep changes scoped to one intent per branch.
3. Open a PR with test evidence (`pnpm lint`, `pnpm test`, `pnpm build`).
4. Squash merge after review and green checks.
5. Delete merged branches on remote.

## Commit Hygiene

- Use concise, imperative commit messages.
- Keep commits coherent and reviewable (avoid mixed refactor + behavior + docs when possible).
- Avoid force-pushing shared branches unless explicitly coordinated.

## Validation Gate

Run before opening/merging PRs:

```bash
pnpm check
```

## Local Cleanup

```bash
git fetch --prune
git branch --merged main | grep -v ' main$' | xargs -n 1 git branch -d
```
