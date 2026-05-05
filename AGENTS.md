# AGENTS.md

`fetchmd` is a TypeScript/Node CLI that fetches or ingests HTML and converts it to clean, token-efficient markdown for AI workflows.

Pipeline: parse input(s) → resolve HTML → extract primary content → convert to markdown → output (plain or JSON).

## Documentation Map

- `docs/system/ARCHITECTURE.md` — pipeline stages, runtime shape, module map, data flow (URL/render/file/stdin), error/exit behavior, security boundaries.
- `docs/system/FEATURES.md` — full CLI surface and flags, input rules, JSON output schema, multi-input error handling, `--render` mode (Puppeteer behavior + security caveats), conversion behavior, operational limits, exit codes.
- `docs/system/OPERATIONS.md` — prerequisites, install, daily commands, local CLI usage, testing notes (build-first for e2e), `prepublishOnly` flow, troubleshooting matrix.
- `docs/project/ROADMAP.md` — shipped highlights and open items (perf benchmarks, npm publish).
- `docs/project/GIT_HISTORY_POLICY.md` — squash-merge-only policy.
- `docs/plans/` — historical brainstorm and implementation plans.
- `skills/SKILL.md` — operator reference for using fetchmd as a tool inside agent workflows (install, invoke, parse output).

## Quickstart

```bash
pnpm install
pnpm check          # lint + test + build (matches prepublishOnly)
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

- **Pre-push**: `pnpm check` (lint + test + build).
- **TDD**: red/green for new features and major changes.
- **E2E** (`test/**/*.test.ts`) executes `dist/index.js` — run `pnpm build` first in clean clones.
