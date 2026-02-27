# Roadmap

This roadmap is a lightweight planning snapshot, not a release contract.

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

## Planned / Open Areas

- Optional `--render` mode for JS-rendered pages (headless browser)
- Performance benchmark suite and regression thresholds
- npm publish

## Active Planning Docs

- `docs/plans/2026-02-25-fetchmd-brainstorm.md`
- `docs/plans/2026-02-25-fetchmd-implementation.md`
- `docs/plans/2026-02-26-json-and-multi-url-plan.md`
