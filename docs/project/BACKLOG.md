# Improvement Backlog

Living list of future friction points, design gaps, and follow-up actions noticed
during normal repo work. Lightweight: items get added when they bite, removed
when they ship or prove not worth doing. This is not a release contract;
`docs/project/ROADMAP.md` is the higher-bar shipped/in-progress view.

Convention: each item has **What** (the friction), **Why it matters**, and
optionally **Sketch** (a one-line implementation thought). Status values:
`noted` / `in-progress` / `dropped`.

When an item ships, remove it from this doc and record it as a concise completed
highlight in `docs/project/ROADMAP.md` instead of keeping a shipped note here.
This file stays future-only.

---

## Open

#### Charset-aware decoding of fetched HTML
Status: noted
- **What**: `fetchHtml()` decodes every response with a default UTF-8
  `TextDecoder` (`src/fetch.ts`). Pages served as `charset=ISO-8859-1`,
  `Shift_JIS`, etc. are silently corrupted into mojibake.
- **Why it matters**: Faithful text extraction is the tool's entire job;
  non-UTF-8 pages (common outside English-language sites) come out garbled with
  no warning.
- **Sketch**: Parse `charset=` from the already-read `Content-Type` header
  (`src/fetch.ts:88`) and pass it to `new TextDecoder(charset)`; fall back to a
  `<meta charset>` sniff of the first chunk when the header is absent.

#### Concurrent multi-input processing
Status: noted
- **What**: `pipeline.run()` awaits each input sequentially in a `for...of`
  (`src/pipeline.ts`). Multiple URLs fetch back-to-back.
- **Why it matters**: `fetchmd url1 url2 url3` — a documented headline use case —
  pays the sum of all network round-trips instead of the max. Wall-clock time
  scales linearly with input count.
- **Sketch**: Bounded concurrency pool (e.g. 3–5) over `processOne`. The
  `--render` path shares one browser but `render.ts` already opens a fresh
  `browser.newPage()` per call, so per-page parallelism is safe there too.
  Preserve input order in the results array.

#### DNS-rebinding TOCTOU in SSRF validation
Status: noted
- **What**: `validateUrl()` resolves the hostname and checks the IP, but the
  subsequent `fetch()` re-resolves independently at connect time
  (`src/fetch.ts`). A host returning a public IP at validation and a private IP
  milliseconds later at fetch reaches internal services.
- **Why it matters**: The documented SSRF posture implies per-hop validation is
  sufficient; against an active DNS-rebinding attacker it is not. Inherent to
  Node's `fetch`, so this is a "known gap," not a quick patch.
- **Sketch**: Either document the limitation explicitly in
  `docs/system/ARCHITECTURE.md` security boundaries, or pin the connection to the
  validated IP (custom `undici` dispatcher / `lookup` that returns the
  already-validated address).

#### Warnings bypass the injectable stderr seam
Status: noted
- **What**: `extract.ts` (readability-fallback warning) and `render.ts`
  (partial-content warning) write directly to `process.stderr`, while
  `pipeline.run()` accepts an injectable `options.stderr` used everywhere else.
- **Why it matters**: Those warnings are untestable via the pipeline's stderr
  seam and can't be routed/labelled in multi-input contexts, unlike the
  per-input error messages the pipeline already prefixes with the source.
- **Sketch**: Thread a stderr writer (or a warnings callback) through
  `extractContent`/`renderHtml`, or return warnings to the caller for the
  pipeline to emit.

#### Deduplicate the `InputMode` type
Status: noted
- **What**: `InputMode` is declared twice — `src/cli.ts` and `src/input.ts` —
  with a cosmetic divergence (cli's stdin arm has `value?: undefined`, input's
  doesn't). `pipeline.ts` imports it from `cli.js`.
- **Why it matters**: Two sources of truth for a core discriminated union invite
  drift as input modes are added.
- **Sketch**: Move the canonical definition to `input.ts` (or a small
  `types.ts`) and import it in `cli.ts` and `pipeline.ts`.

#### Robust render-timeout detection
Status: noted
- **What**: `render.ts` decides "did the navigation time out?" via
  `err.message.includes("timeout")`.
- **Why it matters**: Puppeteer throws a named `TimeoutError`; substring-matching
  a message is fragile across Puppeteer versions and locales, and could
  misclassify unrelated errors as timeouts (silently returning partial content).
- **Sketch**: Check `err.name === "TimeoutError"` (or `instanceof TimeoutError`)
  instead of the message text.

#### Lazy stats computation
Status: noted
- **What**: `processOne` always calls `computeStats(markdown)`, re-splitting and
  re-measuring the whole output even when neither `--stats` nor `--json` is set.
- **Why it matters**: Minor wasted work on every plain-output run, proportional
  to output size.
- **Sketch**: Compute stats lazily only when `stats || json`. Low priority.

#### Size cap on `--render` output
Status: noted
- **What**: The `MAX_RESPONSE_BYTES` / `MAX_INPUT_BYTES` limits don't apply to
  `page.content()` in the render path.
- **Why it matters**: Consistent with the "render = trusted input" posture, but
  currently an implicit omission rather than a recorded decision.
- **Sketch**: Either enforce a cap on rendered HTML length or add an explicit
  note to the security caveats in `docs/system/FEATURES.md` so it's a choice.
