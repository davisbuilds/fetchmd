# Git History and Branch Hygiene

Last updated: February 26, 2026

## Repository Merge Settings

Configured on GitHub repository `davisbuilds/fetchmd`:

- `allow_squash_merge`: `true`
- `allow_merge_commit`: `false`
- `allow_rebase_merge`: `false`
- `delete_branch_on_merge`: `true`
- `squash_merge_commit_title`: `PR_TITLE`
- `squash_merge_commit_message`: `PR_BODY`

Result:

- PR branches can contain multiple commits.
- `main` receives one squashed commit per merged PR.
- Merged remote branches are auto-deleted.

## Merge Strategy

Squash-merge only. Merge commits and rebase merges are disabled at the repository level.

## Branch Protection Status

`main` branch protection is currently not enabled on GitHub, so required checks/reviews are enforced by team convention rather than branch rules.

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
