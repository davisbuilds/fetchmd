# AGENTS.md

`fetchmd` is a TypeScript/Node CLI that fetches or ingests HTML and converts it
to clean, token-efficient markdown for AI workflows: parse input(s) → resolve
HTML → extract primary content → convert to markdown → output (plain or JSON).
`node dist/index.js --help` lists flags after `pnpm build`.

## Documentation Map

- `CONTRIBUTING.md` — contribution scope, review expectations, and delivery.
- `docs/system/ARCHITECTURE.md` — pipeline, module map, data flow, exit behavior, security boundaries.
- `docs/system/FEATURES.md` — CLI surface, JSON output schema, `--render` mode, limits, exit codes.
- `docs/system/OPERATIONS.md` — setup, commands, testing notes, releases, npm publication, troubleshooting.
- `CHANGELOG.md` — released changes, maintained by Release Please.
- `docs/project/ROADMAP.md`, `docs/project/BACKLOG.md`.
- `docs/project/GIT_HISTORY_POLICY.md` — merge strategy and release categories.
- `skills/fetchmd/SKILL.md` — operator reference for using fetchmd inside agent workflows.

## Implementation Guardrails

Policy, not facts; behavioral facts (limits, flags, boundaries) live in the docs above.

- **HTTPS-only is a security posture, not a default.** Don't broaden allowed
  protocols without explicit security review.
- **Resource limits (timeout, max bytes, redirect count) are part of the
  contract.** Don't relax them to make a request work; fix the input or caller.
- **Redirect targets must keep passing `validateUrl()`.** Don't bypass per-hop
  validation in `src/fetch.ts`.
- **The Readability fallback warning is intentional.** When `extractContent()`
  falls back to the full body it warns on stderr; don't silence it to keep
  multi-input output clean.
- **`--render` is asymmetric:** the initial URL is SSRF-validated, but
  browser-internal redirects and sub-resources are not. Treat `--render` URLs as
  trusted input only.

## Testing

- **Local gate** (matches the required `Lint & dead code`, `Build & test`,
  `Release commit categories`, and `check` checks):
  `pnpm install --frozen-lockfile && pnpm check && python3 scripts/check_publication_hygiene.py`.
  `pnpm check` runs lint, build, the Vitest suite (which includes the dead-code
  gate), and the release-commit validator tests. CI also requires every non-merge
  commit subject on the PR to be a Conventional Commit; there is no local command
  for that check.
- E2E tests (`test/**/*.test.ts`) execute `dist/index.js`; build first in a clean clone.
- **Dead-code gate** (`src/dead-code.test.ts`) owns cross-file dead code; biome
  `recommended` owns within-file unused code. For an intentionally unreferenced
  export (for example a public type the declaration build needs), add it to
  `EXPORT_EXCEPTIONS`/`FILE_EXCEPTIONS` with a reason rather than silencing the test.

## Working Agreement

- **Clarify before building** when a request is vague, contradictory, or skips a
  key decision; clear, well-scoped requests need no interview.
- **Fix small issues now; backlog the rest.** Fix simple, quick, or blocking
  issues in this repo as part of the current change and call them out. Record in
  `docs/project/BACKLOG.md` only what can't be finished now or needs the
  maintainer's decision; don't open a branch or PR just for a backlog entry.
- **Keep docs current** when a change makes a documented contract, boundary,
  procedure, or direction stale.
- **Plan and hand off work.** Reuse clear task context. Save planning docs when
  decisions, acceptance, or coordination need persistence, and leave a brief
  handoff only when needed to resume unfinished work. Commit shared docs and keep
  status current. `docs/archive/` is gitignored: before archiving a completed doc
  there, preserve lasting decisions and open work in maintained docs and repair
  links.
- **Commit and push.** Commit coherent chunks, staging by explicit path. Push
  your task branch and open a PR once the work is complete and the local gate
  passes; don't push directly to `main`.
- **Merge** only under the standing merge authority in the maintainer's workspace
  instructions, or when the maintainer asks. Without those instructions in
  context, leave the PR for the maintainer.
- **History and releases.** Squash is disabled: merge commit by default, rebase
  only when the branch's commits are already clean. Every non-merge commit uses a
  Conventional Commit subject (categories in `GIT_HISTORY_POLICY.md`). Merging the
  Release Please PR tags a GitHub Release; npm publication is a separate
  maintainer action. Leave both to the maintainer.
- **Re-ground after compaction** in source, this file, the owning docs, and
  recent commits. A summary and your own earlier proposals are not user approval.
