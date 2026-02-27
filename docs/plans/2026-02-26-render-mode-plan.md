---
date: 2026-02-26
topic: render-mode
stage: brainstorm
---

# --render Mode: JS-Rendered Page Support

## What We Are Building

A `--render` flag that uses a headless browser (Puppeteer) to load and render JavaScript-heavy pages before extracting content. This enables fetchmd to handle SPAs (React, Vue, Angular) where initial HTML is empty, and as a side benefit, pages behind basic bot protection.

When `--render` is active, the browser replaces the normal HTTP fetch for URL inputs. The rest of the pipeline (extraction, conversion, output) remains unchanged.

## Why This Direction

- **Approach A (render as alternative fetch)** was chosen over middleware auto-detection (unreliable heuristics, double-fetches) and subcommand separation (breaks existing CLI pattern).
- **Puppeteer** chosen over Playwright: simpler API for our use case, lighter install (~170MB Chrome vs ~400MB multi-browser), no cross-browser need for content extraction.
- **Optional peer dependency** keeps fetchmd lightweight for users who don't need rendering. Clear error message guides installation when --render is used without Puppeteer.

## Key Decisions

- **Puppeteer as optional peer dep**: Not bundled. Users install separately. `--render` without Puppeteer gives a helpful install message.
- **URLs only**: `--render` is ignored for `--file` and stdin inputs (they already have full HTML).
- **Minimal scope**: Navigate, wait for network idle, grab rendered HTML. No `--wait-for`, no scrolling, no screenshots in v1.
- **Browser reuse in multi-input**: Launch one browser instance, open pages in sequence, close browser at end. Avoids repeated launch overhead.
- **Same security model**: SSRF validation still applies to the initial URL. Browser navigation to validated URLs only.
- **Same resource limits**: Render timeout (default 30s, longer than fetch's 15s to account for JS execution). Response size limit still applies to extracted HTML.

## Constraints

- Puppeteer is optional — core fetchmd must work without it installed
- Must not break existing tests or behavior when --render is not used
- Browser process must be reliably cleaned up (even on errors/signals)
- Cannot validate redirect targets the same way as manual redirect handling (browser handles redirects internally)

## Success Criteria

- `fetchmd --render <spa-url>` returns meaningful markdown from JS-rendered pages
- `fetchmd --render` without Puppeteer installed prints a clear install instruction and exits 1
- `--render` composes with all existing flags (`--raw`, `--stats`, `--json`)
- Multi-input with `--render` reuses a single browser instance
- `--render` is ignored (with no error) for file/stdin inputs
- All existing tests continue to pass unchanged
- New unit tests for render module and E2E tests for the flag

## Open Questions

- Should we warn to stderr when `--render` is used with file/stdin inputs, or silently ignore?
- Render timeout: 30s default, or match the existing 15s fetch timeout?

## Next Step

Proceed to first-principles analysis, then implementation planning.
