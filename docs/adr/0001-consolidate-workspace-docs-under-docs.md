# 1. Consolidate workspace docs and agent best-practices under a single `docs/` root

- Status: Accepted
- Date: 2026-07-06
- Ticket: [EUDPA-181](https://eaflood.atlassian.net/browse/EUDPA-181)
- Depends on: [EUDPA-179](https://eaflood.atlassian.net/browse/EUDPA-179) (skills moved to the agentskills.io layout)

## Context

Documentation in this workspace was split across two locations:

- `docs/` at the workspace root — human-readable project docs plus a
  `best-practices/` subtree (java, node, gds, doc-comments, k6, playwright,
  rest-api, docker-compose).
- `agents/skills/best-practices/` — a **symlink** to `../../docs/best-practices`.
  The content was single-sourced, but exposed under two paths, and
  `agents/CLAUDE.md` referenced it via `./skills/best-practices/...`.

EUDPA-179 restructured the skills to the [agentskills.io](https://agentskills.io/specification)
standard. Skills now live under `.claude/skills/<name>/` (auto-discovered by
Claude Code and Cursor); the old `agents/` tree no longer exists. That
restructure was the right moment to settle how shared best-practices are
surfaced, so we stop maintaining a symlink and give contributors and agents
one obvious place to look.

Three options were on the table:

- **(a)** Everything under `docs/`; skills reference
  `~/git/defra/trade-imports-workspace/docs/best-practices/...` by
  absolute path from their `SKILL.md`.
- **(b)** Everything under `docs/`; per-skill `references/` folders hold copies
  or symlinks of the relevant best-practices.
- **(c)** Split: human docs under `docs/`, agent-only content under the skills
  tree.

## Decision

Adopt **option (a)**. `docs/` is the single canonical root for all
documentation — both human-readable docs and agent-consumed best-practices.
Best-practices remain single-sourced under `docs/best-practices/`. Skills
reference them by the workspace absolute path
(`~/git/defra/trade-imports-workspace/docs/best-practices/<topic>/<file>`),
which is stable because the workspace is pinned to that canonical location
(see `docs/agent-onboarding.md`). The `agents/skills/best-practices` symlink is
gone, along with the whole `agents/` tree.

The agentskills.io `references/` folder is reserved for content that is
genuinely coupled to a single skill. Best-practices that apply across skills
(the common case here) stay shared under `docs/best-practices/` and are cited
by path.

## Consequences

- One canonical home for documentation; no second path to keep in sync.
- No symlinks to maintain — they broke on some filesystems and confused tools
  that follow or refuse to follow them.
- Skills cite best-practices by an absolute workspace path, so a citation
  resolves the same way from any repo subdirectory. This relies on the
  workspace living at `~/git/defra/trade-imports-workspace` (symlinked
  if cloned elsewhere), which is already a hard requirement of the `tools/`
  scripts.
- Adding or moving a best-practice is a single edit under `docs/best-practices/`;
  every skill citing it picks up the change with no copy to refresh.

## Alternatives considered

- **(b) Per-skill copies or symlinks in `references/`.** Rejected. Copies
  duplicate content and drift; symlinks reintroduce exactly the maintenance and
  cross-filesystem problem we are removing. Most best-practices (gds, node,
  java, doc-comments) apply to several skills, so pinning them to one skill's
  `references/` folder is the wrong home.
- **(c) Split human vs agent-only content across two roots.** Rejected. It
  recreates the two-places problem this ticket set out to remove, and the split
  is artificial — the best-practices docs are read by both people and agents.
