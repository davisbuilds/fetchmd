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

#### Deduplicate the `InputMode` type
Status: noted
- **What**: `InputMode` is declared twice — `src/cli.ts` and `src/input.ts` —
  with a cosmetic divergence (cli's stdin arm has `value?: undefined`, input's
  doesn't). `pipeline.ts` imports it from `cli.js`.
- **Why it matters**: Two sources of truth for a core discriminated union invite
  drift as input modes are added.
- **Sketch**: Move the canonical definition to `input.ts` (or a small
  `types.ts`) and import it in `cli.ts` and `pipeline.ts`.

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
