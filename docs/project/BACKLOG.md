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
