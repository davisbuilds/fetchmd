# Roadmap

This roadmap records direction and upcoming milestones, with selected highlights
for orientation. Released consumer-facing changes live in `CHANGELOG.md`;
actionable unresolved gaps live in `BACKLOG.md`. This is not a release contract.

## Completed Highlights

- CLI input modes: URL, `--file`, and stdin
- Secure URL validation with HTTPS-only + private-network SSRF blocking
- Manual redirect handling with re-validation per hop
- Resource controls: timeout, max response size, max redirects
- Content extraction with Readability and fallback strategy
- Markdown conversion with GFM support and cleanup rules
- Unit and end-to-end test coverage across parsing, security, fetching, extraction, and conversion
- `--raw` mode (skip Readability and convert full HTML)
- `--stats` flag (word count, token estimate, output size to stderr)
- `--json` structured output (metadata + markdown + stats)
- Multi-input support (multiple URLs and `--file` flags)
- `--render` mode for JS-rendered pages (headless browser via optional Puppeteer)
- SSRF hardening: IPv4-mapped IPv6 literals decoded and re-checked against private-IP rules
- Charset-aware response decoding (Content-Type → `<meta charset>` → UTF-8) so non-UTF-8 pages aren't mangled
- Bounded-concurrency multi-input processing (up to 5 in parallel, output preserved in input order)
- Warnings routed through the pipeline's stderr seam (source-labelled in multi-input, testable, deterministic under concurrency)
- Robust render-timeout detection keyed off Puppeteer's `TimeoutError` name rather than fragile message matching
- Single canonical `InputMode` discriminated union in `input.ts`, imported by `cli.ts` and `pipeline.ts` (removed the duplicate declaration and its cosmetic divergence)
- npm package `@davisbuilds/fetchmd` available at `0.1.0` (registry verified 2026-09-26)
- Release Please automation for version/changelog PRs and GitHub releases after validated main CI; activation requires the release GitHub App

## Planned / Open Areas

- Performance benchmark suite and regression thresholds

## Active Planning Docs

- `docs/plans/2026-02-25-fetchmd-brainstorm.md`
- `docs/plans/2026-02-25-fetchmd-implementation.md`
- `docs/plans/2026-02-26-json-and-multi-url-plan.md`
