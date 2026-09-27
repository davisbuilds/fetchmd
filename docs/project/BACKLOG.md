# Backlog

Future-only gaps and opportunities worth revisiting. Agents can work directly
from an entry; use an issue when discussion or coordination helps. Keep one
detailed owner and reconcile affected entries when work lands. Date/source
volatile claims or label hypotheses; keep cross-repository detail with the
capability owner.

## Open

### DNS-rebinding TOCTOU in SSRF validation
- **What**: `validateUrl()` resolves the hostname and checks the IP, but the
  subsequent `fetch()` re-resolves independently at connect time
  (`src/fetch.ts`). A host returning a public IP at validation and a private IP
  milliseconds later at fetch reaches internal services.
- **Why it matters**: The documented SSRF posture implies per-hop validation is
  sufficient; against an active DNS-rebinding attacker it is not. Inherent to
  Node's `fetch`, so this is a "known gap," not a quick patch.
- **Next**: Decide whether to pin the connection to the validated IP (for
  example, with a custom dispatcher), then test that connection against a DNS
  change. The limitation is already documented in
  `docs/system/ARCHITECTURE.md`.

### Lazy stats computation
- **What**: `processOne` always calls `computeStats(markdown)`, re-splitting and
  re-measuring the whole output even when neither `--stats` nor `--json` is set.
- **Why it matters**: Minor wasted work on every plain-output run, proportional
  to output size.
- **Next**: Compute stats lazily only when `stats || json`. Low priority.

### Size cap on `--render` output
- **What**: The `MAX_RESPONSE_BYTES` / `MAX_INPUT_BYTES` limits don't apply to
  `page.content()` in the render path.
- **Why it matters**: Consistent with the "render = trusted input" posture, but
  currently an implicit omission rather than a recorded decision.
- **Next**: Either enforce a cap on rendered HTML length or add an explicit
  note to the security caveats in `docs/system/FEATURES.md` so it's a choice.

### Performance baselines

- **What**: establish a repeatable benchmark and useful regression thresholds for
  the fetch/convert pipeline.
- **Why or evidence**: the earlier Roadmap named this as planned work, but no
  benchmark contract or threshold is selected here.
- **Next**: choose representative local HTML and network cases, measure current
  behavior, then set thresholds only where variance supports them.
