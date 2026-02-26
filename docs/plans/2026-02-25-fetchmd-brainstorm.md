---
date: 2026-02-25
topic: fetchmd-design
stage: brainstorm
---

# fetchmd — HTML-to-Markdown CLI for AI Agents

## What We Are Building

A fast, local-first CLI tool that converts any webpage into clean, token-efficient markdown optimized for AI agent consumption. It fills the gap between cloud APIs (Jina Reader, Firecrawl, Cloudflare) and bare libraries by providing a zero-config, Unix-composable command that works offline and pipes cleanly into AI workflows.

## Why This Direction

- **Local-first over cloud APIs**: No API keys, no rate limits, no network dependency for processing. Just fetch and convert.
- **Smart extraction over naive conversion**: Most token waste comes from navigation, ads, and boilerplate — not from HTML tag overhead. Readability-based extraction is where the real 80%+ token savings come from.
- **Unix composability**: `curl | fetchmd | llm` — the tool should be one link in a chain, not a monolith.
- **TypeScript + Node**: Richest HTML/markdown ecosystem (Mozilla Readability, Turndown, JSDOM). Battle-tested libraries. Distribute via npm for zero-friction install.

## Key Decisions

- **Name**: `fetchmd` — clear action word, no brand conflicts, describes input (fetch) and output (md)
- **Runtime**: TypeScript + Node.js, pnpm for package management
- **Primary user**: AI agents and agent developers; CLI power users are secondary
- **Extraction**: Mozilla Readability for content extraction + Turndown for markdown conversion
- **JS rendering**: Static HTML only for v1; pluggable architecture so `--render` can be added later
- **Output**: Clean markdown to stdout only. No JSON mode, no token counting in v1. Keep it simple.
- **Input modes**: URL argument (primary), stdin pipe, local file via `--file`

## Constraints

- v1 is static HTML only — no headless browser, no Playwright dependency
- Zero configuration required for the common case
- Must reject private/internal URLs before any fetch (SSRF prevention)
- Must handle malformed HTML gracefully (no crashes on bad input)
- Protocol allowlist: HTTPS only by default
- Response size limits and timeouts to prevent resource exhaustion

## Success Criteria

- `fetchmd <url>` produces clean markdown in < 2 seconds for a typical article
- Output token count is 70-85% lower than raw HTML
- Tables, code blocks, and nested lists render correctly
- Private/internal URLs are rejected before any fetch
- Piping works: `curl ... | fetchmd | llm "summarize this"`
- `npm install -g fetchmd` and it just works

## Open Questions

- Should `--raw` mode (skip readability, convert all HTML) be in v1 or deferred?
- Token estimation: worth adding as a stderr info line even if not a formal output mode?
- Should we support multiple URLs as arguments for batch processing?
- License choice (MIT vs ISC vs Apache 2.0)

## Next Step

Proceed to implementation planning via `writing-plans`.
