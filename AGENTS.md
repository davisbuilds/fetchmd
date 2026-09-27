# AGENTS.md

`fetchmd` is a TypeScript/Node CLI that fetches or ingests HTML and converts it to clean, token-efficient markdown for AI workflows.

Pipeline: parse input(s) → resolve HTML → extract primary content → convert to markdown → output (plain or JSON).

## Documentation Map

- `CONTRIBUTING.md` — contribution scope, review expectations, and delivery policy.
- `docs/system/ARCHITECTURE.md` — pipeline stages, runtime shape, module map, data flow (URL/render/file/stdin), error/exit behavior, security boundaries.
- `docs/system/FEATURES.md` — full CLI surface and flags, input rules, JSON output schema, multi-input error handling, `--render` mode (Puppeteer behavior + security caveats), conversion behavior, operational limits, exit codes.
- `docs/system/OPERATIONS.md` — prerequisites, install, daily commands, local CLI usage, testing notes (build-first for e2e), releases, `prepublishOnly` flow, troubleshooting matrix.
- `CHANGELOG.md` — released consumer-facing changes, maintained by Release Please.
- `docs/project/ROADMAP.md` — current direction and product boundaries.
- `docs/project/GIT_HISTORY_POLICY.md` — merge-commit/rebase policy (squash disabled) and branch hygiene.
- `docs/project/BACKLOG.md` — unresolved gaps and revisit conditions.
- `skills/fetchmd/SKILL.md` — operator reference for using fetchmd as a tool inside agent workflows (install, invoke, parse output).

## Command Quickstart

```bash
pnpm install
pnpm check          # lint + build + test (matches prepublishOnly)
node dist/index.js --help              # list all available commands/flags
node dist/index.js https://example.com
```

## Implementation Guardrails

These are policy/steering, not facts. Behavioral facts (limits, flags, security boundaries) live in the docs above.

- **HTTPS-only is a security posture, not a default.** Don't broaden allowed protocols without explicit security review.
- **Resource limits (timeout, max bytes, redirect count) are part of the contract**, not optional tuning. Don't relax them to "make a request work" — fix the input or the caller.
- **Redirect targets must keep passing `validateUrl()`.** Don't bypass per-hop validation in `src/fetch.ts`.
- **Readability fallback warning is intentional.** When `extractContent()` falls back to full body, it warns to stderr — don't silence that warning to keep multi-input output clean.
- **`--render` security model is asymmetric**: initial URL is SSRF-validated, but browser-internal redirects and sub-resources are not intercepted. Treat `--render` URLs as trusted input only.

## Testing

- **Pre-push**: `pnpm check` (lint + build + test).
- **TDD**: red/green for new features, major refactors, and large changes. The red step must fail for the behavior you're about to fix — a test that fails only because the symbol doesn't exist yet is a stub, not a red test; write the signature first, then a test that fails on the behavior. Skip the red step for code with no behavior to assert, and cover it after. For smaller edits, still run the relevant existing tests before wrapping up.
- **E2E** (`test/**/*.test.ts`) executes `dist/index.js` — run `pnpm build` first in clean clones.
- **Dead-code gate** (`src/dead-code.test.ts`): static checks for unreferenced exports and orphaned source files. It owns cross-file dead code; biome `recommended` owns within-file unused vars/imports and unreachable code. When an export is intentionally unreferenced (e.g. a public type required by the declaration-emitting build), add it to `EXPORT_EXCEPTIONS`/`FILE_EXCEPTIONS` with a reason rather than silencing the test.

## Working Agreement

- **Push back before building.** If a request is incoherent or self-contradictory, or a spec/plan is vague or skips key decisions, stop and interview me — ask clarifying questions and confirm intent before writing code or changing files. Don't guess at scope or comply silently. (Clear, well-scoped requests don't need this.)
- **Keep docs current.** Update the owning reference when a change makes its contract, boundary, procedure, or direction inaccurate. Routine internal changes need no ceremonial doc edit.
- **Commit logically.** Commit completed work in coherent chunks as you proceed. Push only when explicitly asked.
- **Classify commits for releases.** Every non-merge commit uses a Conventional Commit subject; CI checks PR commits and the complete unreleased history on main pushes. See `docs/project/GIT_HISTORY_POLICY.md` for release categories and the pre-1.0 policy. Keep release notes in `CHANGELOG.md`, upcoming direction in the Roadmap, and actionable unresolved gaps in the Backlog.
- **Log durable follow-ups in `BACKLOG.md`.** Capture consequential design gaps,
  tech debt, and better approaches in `docs/project/BACKLOG.md`; fix small or
  blocking issues inline. Keep entries future-only, with evidence and a next step
  or revisit trigger; date/source volatile claims or label hypotheses. The
  capability-owning repo holds cross-repo detail. Agents can work directly from
  entries; use issues for discussion or coordination with one detailed owner.
  Reconcile affected entries as work lands; update `ROADMAP.md` when selected
  direction changes, not as a shipment log.
- **Re-ground after compaction.** A compaction summary loses precise paths, context, and verification state — before continuing, re-read this project's `AGENTS.md`, its reference docs, and recent commits.
