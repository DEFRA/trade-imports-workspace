# Overview

A one-page orientation to the topics this directory covers. Use this before
drilling into a specific domain leaf — it sets out the production scenarios
the material is framed around and the hard scope boundaries that decide
whether a topic belongs here at all.

---

## Scope

This directory covers the **Claude Code (and exploratory MCP) layer only** —
the surface the team actually works at day-to-day. That means CLAUDE.md
hierarchies, `.claude/skills/`, slash commands, sub-agents spawned via the
Task tool, MCP servers wired into Claude Code, and CI/CD usage of the
`claude` CLI.

Pure Anthropic-API material (Agent SDK loops written from scratch, Message
Batches, raw `tool_use` request/response wiring) is **not** the team's
current surface. Where it appears here it is informational only — the
canonical home for that material is [`api-reference/`](api-reference/).

---

## Domains

Five content domains, organised by topical focus.

| # | Domain | Focus | Leaf |
|---|--------|-------|------|
| 1 | Agentic Architecture & Orchestration | Coordinator–subagent decomposition via the Task tool, session state, and workflow gating in Claude Code. Raw Agent-SDK loop control is informational — see `api-reference/`. | [domain-1-agentic-orchestration/](domain-1-agentic-orchestration/README.md) |
| 2 | Tool Design & MCP Integration | Writing MCP tool interfaces that Claude Code can select reliably under ambiguity, and propagating errors cleanly. | [domain-2-tools-mcp/](domain-2-tools-mcp/README.md) |
| 3 | Claude Code Configuration & Workflows | `CLAUDE.md` hierarchy, `.claude/rules/`, custom slash commands and skills, plan mode, and CI/CD integration. **Primary domain for this workspace.** | [domain-3-claude-code/](domain-3-claude-code/README.md) |
| 4 | Prompt Engineering & Structured Output | Few-shot patterns, validation–retry loops, multi-pass review as expressed through Claude Code skills. Raw `tool_use` schemas and Message Batches are informational — see `api-reference/`. | [domain-4-prompt-engineering/](domain-4-prompt-engineering/README.md) |
| 5 | Context Management & Reliability | Context-window discipline, escalation criteria, provenance tracking, and human-review calibration. | [domain-5-context-reliability/](domain-5-context-reliability/README.md) |

---

## Scenarios

The material is framed around production scenarios. Workspace-relevant ones
take centre stage; API-only ones are kept for context but flagged.

**Workspace-relevant (centre stage):**

- **Claude Code for Continuous Integration** — Claude Code in the CI/CD
  pipeline doing automated review, test generation, and PR feedback.
  Exercises false-positive reduction, explicit review criteria, and
  structured output for downstream tooling.
- **Code Generation with Claude Code** — Claude Code as part of the
  engineering workflow. Exercises `CLAUDE.md` hierarchy, custom slash
  commands and skills, and the plan-mode vs direct-execution decision.
- **Codebase Exploration & Review** — Claude Code over the built-in tools
  (Read, Grep, Glob, Bash) plus MCP for large-codebase navigation,
  cross-repo review, and refactor planning. Exercises scratchpads,
  `/compact`, and recovery-manifest patterns.

**Informational — not the team's current surface:**

- **Customer Support Resolution Agent** — backend Agent-SDK agent over MCP
  tools. Useful for tool-selection and escalation patterns, but the team
  does not run agentic loops directly against the API.
- **Multi-Agent Research System** — coordinator plus specialised subagents
  built on the Agent SDK. The workspace's fan-out happens via Claude Code
  `Task` subagents instead; raw-API multi-agent pipelines belong under
  `api-reference/`.
- **Structured Data Extraction** — JSON extraction with schema validation
  via raw `tool_use`. Relevant as background reading; production
  extraction pipelines live outside Claude Code.

---

## In scope / Out of scope

The scope list is explicit and short — anything not in either column is a
judgement call, but the boundaries below are firm.

**In scope** (sample, full list per domain leaf):

- `CLAUDE.md` hierarchy, `@import` patterns, `.claude/rules/` with glob
  patterns, custom commands and skills frontmatter (`context: fork`,
  `allowed-tools`, `argument-hint`).
- Coordinator–subagent patterns via the Task tool, parallel subagent
  execution, iterative refinement loops inside Claude Code.
- Tool description quality, splitting vs consolidating MCP tools, tool
  naming to reduce ambiguity.
- MCP resources vs tools; project vs user scope; env var expansion.
- Plan mode vs direct execution vs Explore subagent.
- Claude Code in CI/CD (non-interactive `claude` CLI usage).
- Context-window optimisation (trimming verbose tool output, structured
  fact extraction, position-aware ordering).
- Human-review workflows: confidence calibration, stratified sampling,
  accuracy segmentation; provenance with claim–source mappings.

**Out of scope**:

- Fine-tuning, model training, model internals, Constitutional AI, RLHF.
- API authentication, billing, account management, OAuth, key rotation.
- MCP server *deployment* — networking, container orchestration, hosting.
- Embedding models and vector-database internals.
- Computer use, vision/image analysis, streaming API mechanics.
- Cloud-provider-specific config (AWS, GCP, Azure), performance
  benchmarking, prompt-caching internals, token-counting algorithms.
- Raw Agent-SDK loop wiring and Message Batches — covered under
  [`api-reference/`](api-reference/), not here.

---

## How to use this directory

Read this overview first, then pick the domain leaf that matches the
scenarios you find least familiar. Domain 3 (Claude Code) is the primary
domain for this workspace and the best starting point. Each domain
`README.md` lists its numbered sub-topics.
