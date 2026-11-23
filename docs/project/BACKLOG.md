# Backlog

Future-only gaps and opportunities worth revisiting. Capture recurring friction,
meaningful risk or cost, unresolved decisions, or concrete revisit triggers.
Fix simple, quick, or blocking issues inline when within the active task's scope.

## Conventions

- **Entry:** state **What** and **Why or evidence**. Add **Next** (a useful first
  action) or **Revisit when** (a concrete gate) where helpful; no fixed template
  is required.
- **Evidence:** date and source volatile claims. Support causal or performance
  claims with measurements, or label them **hypothesis, unmeasured**.
- **Delegation:** agents can execute entries directly. Recording a candidate does
  not expand the active task or select a roadmap priority. Use an issue when
  persistent discussion or coordination helps; no mandatory graduation step.
- **Ownership:** keep cross-repository work with the capability-owning repository.
  If an issue owns the details, retain only a useful linked summary here; avoid
  parallel checklists. Keep private evidence out of public entries and issues.
- **Closure:** reconcile affected entries as work lands. Remove resolved concerns,
  retain unresolved remainders, and preserve durable rationale in its owning
  reference. Roadmap records selected direction; Git and PRs hold routine shipped
  history. Revisit the broader list during prioritization or when stale entries
  impede work.

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

### IPv6 SSRF ranges the private-IP check misses
- **What**: `isPrivateIPv6` in `src/security.ts` checks `startsWith("fe80")`
  for link-local, which covers only `fe80::/16` of `fe80::/10`. It has no case for
  the unspecified address `::`. On 2026-11-21, `validateUrl()` accepted
  `https://[fe90::1]/`, `https://[febf::1]/`, and `https://[::]/`. Connecting to
  `::` reaches the local host on common stacks. Deprecated site-local
  `fec0::/10` and NAT64 `64:ff9b::/96` (which embeds an IPv4 address) also pass.
  On the IPv4 side, `isPrivateIPv4` does not block shared address space
  `100.64.0.0/10`.
- **Why it matters**: `docs/system/ARCHITECTURE.md` says link-local and IPv6
  local ranges are blocked. The `fe80::/10` comment next to the check states the
  intended range; the code drifted from it.
- **Next**: match `fe8`–`feb` (e.g. `/^fe[89ab]/`), block `::` and its
  expanded form, decide on `fec0::/10`, NAT64, and `100.64.0.0/10`, and add
  `security.test.ts` cases for each boundary.

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
