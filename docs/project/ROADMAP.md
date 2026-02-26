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

## Planned / Open Areas

- Optional `--raw` mode (skip Readability and convert full HTML)
- Optional `--render` mode for JS-rendered pages (headless browser)
- Optional structured output mode (metadata + markdown)
- Multi-URL batch processing mode
- Performance benchmark suite and regression thresholds

## Active Planning Docs

- `docs/plans/2026-02-25-fetchmd-brainstorm.md`
- `docs/plans/2026-02-25-fetchmd-implementation.md`
