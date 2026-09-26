# Git History and Branch Hygiene

Last updated: September 26, 2026

## Repository Merge Settings

Configured on GitHub repository `davisbuilds/fetchmd`:

- `allow_squash_merge`: `false`
- `allow_merge_commit`: `true`
- `allow_rebase_merge`: `true`
- `delete_branch_on_merge`: `true`
- `merge_commit_title`: `PR_TITLE`
- `merge_commit_message`: `PR_BODY`

Result:

- PR branches retain their full commit history when merged.
- `main` receives either a merge commit (preserving the PR boundary) or rebased commits (linear history), depending on which strategy the merger picks for that PR.
- Squash merging is disabled — full per-commit history is preserved.
- Merged remote branches are auto-deleted.

## Merge Strategy

Merge commits and rebase merges are both allowed; squash merges are disabled.

- **Default — merge commit.** Preserves the PR as a discoverable boundary in `main`'s history. Best when the PR contains multiple meaningful commits worth keeping addressable individually.
- **Rebase merge.** Use when the PR's commits are clean and the linear history reads better without an extra merge node. Avoid if the PR's commits are noisy (WIP, fixups) — clean them up locally first.
- **Authoring expectation.** Because squash is gone, individual PR commits land in `main`. Keep PR commit messages tidy: meaningful subjects, no WIP markers, no fixup chains. Squash or reword locally before opening the PR if needed.

## Branch Protection Status

`main` branch protection is currently not enabled on GitHub, so required checks/reviews are enforced by team convention rather than branch rules.

## Branch Workflow

1. Branch from `main` with a focused name (`feat/*`, `fix/*`, `docs/*`, `chore/*`).
2. Keep changes scoped to one intent per branch.
3. Open a PR with test evidence (`pnpm check`).
4. Tidy your PR commit history *before* merging — reword/squash locally so what lands on `main` reads cleanly.
5. Pick **Create a merge commit** by default; pick **Rebase and merge** when linear history is materially better.
6. Merged remote branches are auto-deleted by GitHub.

## Commit Hygiene

- Use concise, imperative Conventional Commit subjects, including bot commits.
- Keep commits coherent and reviewable (avoid mixed refactor + behavior + docs when possible).
- Because squash is disabled, individual commits land in `main` — no WIP markers, no fixup chains.
- Avoid force-pushing shared branches unless explicitly coordinated.

## Release Classification

CI checks the subjects of every non-merge PR commit, rather than only the PR
title, because individual commits are preserved. Use `type(scope): description`
(scope optional). Reword Git-generated revert subjects to `revert: ...`. The
guard checks formatting, not whether the category truthfully describes the diff;
reviewers still own that judgment. PRs above 250 commits must be split because
GitHub's PR commit endpoint is capped at 250.

| Commit | Release effect |
| --- | --- |
| `fix:` or `perf:` | Patch |
| `feat:` | Minor |
| Any category with `!` or a `BREAKING CHANGE:` footer | Minor before 1.0; major from 1.0 onward |
| `docs:`, `test:`, `chore:`, `build:`, `ci:`, `style:`, `refactor:` without a breaking marker | No release by themselves |
| `revert:` | Patch, with a Reverts changelog section; use `revert!:` if incompatible |

Feature commits remain minor bumps before 1.0; breaking changes do not silently
promote a 0.x release to 1.0. A deliberate 1.0 promotion requires a reviewed
release decision. Plain commit subjects are rejected rather than silently omitted
from release consideration. Neither squash merging nor conventional merge-node
subjects are required.

Use `fix(deps):` for runtime dependency fixes, including security updates, that
consumers need in a release. Reserve `chore(deps):` for maintenance without a
consumer-facing fix, such as development tooling updates. CI checks subject
syntax; reviewers must verify that dependency changes receive the right category.

Release Please owns version/changelog updates in a dedicated PR. Review its
version and consumer-facing notes, run the normal checks, then merge using the
existing merge-commit or rebase policy. Successful CI on that exact main revision
permits the GitHub release. See the
[operations guide](../system/OPERATIONS.md#releases) for App activation and the
npm publication boundary.

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
