# Roadmap

fetchmd converts HTTPS pages or local HTML into Markdown for agent workflows.
The current direction is a predictable CLI with bounded fetching, clear warnings,
and stable plain/JSON output. [Features](../system/FEATURES.md) owns observable
behavior; [Architecture](../system/ARCHITECTURE.md#security-boundaries) owns the
security limits of ordinary fetch and trusted-input `--render`.

## Current Direction

Keep fetch and conversion behavior portable for CLI and agent consumers. Preserve
HTTPS validation, redirect checks, resource limits, and ordered multi-input results
when changing the pipeline. Resource and SSRF limitations that remain unresolved
are recorded in the [Backlog](BACKLOG.md), where work can be selected directly.

The npm package and GitHub source releases have separate publication paths; see
[Operations](../system/OPERATIONS.md#releases). Released consumer changes belong
in [CHANGELOG.md](../../CHANGELOG.md), with routine implementation detail in Git.
No next feature or release date is committed here.
