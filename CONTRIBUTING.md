# Contributing

Bug reports, focused fixes, documentation improvements, and supported proposals
are welcome. Discuss substantial new modes, dependencies, or public CLI/JSON
changes before investing in implementation. This is a solo-maintained project;
contributions do not imply a support or response-time promise.

Agent-assisted work is welcome. Submitters should understand the change's intent,
important behavior, security tradeoffs, and verification, and explain limitations
in the PR. No prompt transcript or manual rewrite is required. A clear
[Backlog](docs/project/BACKLOG.md) entry can go directly to a PR; use an issue
when persistent discussion or coordination helps.

Work on a focused branch from `main`. [Operations](docs/system/OPERATIONS.md)
explains setup and `pnpm check`; [Git policy](docs/project/GIT_HISTORY_POLICY.md)
explains retained Conventional Commits, merge strategy, and release categories.
Call out incompatible behavior with `!` or a `BREAKING CHANGE:` footer and
describe migration. Review generated consumer notes and the PR body in the
Release Please PR; npm publication remains a separate maintainer action.
