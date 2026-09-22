# Probe: rules, skills and hooks inside Workflow agents (2026-09-18)

Probe workflow `wf_5d04c5ce-856`, with a default workflow agent and a `general-purpose` workflow
agent, plus one `Agent`-tool subagent as a control. Each read a `.js` file, a `.java` file and a
`.njk` file, then quoted whatever arrived that was not the file itself. None of them was told what
the rules contain.

| File read | What arrived (all three agent shapes agree) |
|---|---|
| `tim/src/commands/parity/index.js` | `.claude/rules/node.md`, plus `tim/CLAUDE.md` with its `@` imports (node code-style, testing, pino, jsdoc, gds language and writing) and `tim/.claude/rules/cli-patterns.md` |
| `repos/trade-imports-animals-backend/.../Application.java` | `.claude/rules/java.md` only |
| `repos/trade-imports-animals-frontend/.../unauthorised.njk` | `.claude/rules/gds.md` only |

## Conclusions

1. **Path-scoped rules load natively in Workflow agents and subagents** when they Read a file that
   matches. The workspace `CLAUDE.md` is also present from the start. There is no need to pass the
   rules in for **Claude** stages.
2. **Rules are pointers, not payloads.** `java.md`, `gds.md` and the others name the
   `docs/best-practices/<topic>/` files and say "Read the files relevant to the change before
   editing". The bundles themselves are not injected; the agent has to follow the pointer. So the
   implementor's prompts must say: **follow every rule pointer that loads, and read the named
   best-practice files before editing or reviewing**. Where it matters for quality, the ladder
   should also check that this was done.
3. A rule loads on **Read**, not on Write or Edit. An agent that creates a new file of a type it
   never read gets no rule. So the plan and implement prompts must say: **read at least one existing
   file of each type you will create or edit before writing**. Any sibling will do; it triggers the
   rule.
4. **Codex never gets any of this.** Codex stages must be handed the resolved list of matching rule
   files **and** the best-practice files those rules point to. The loop can resolve that list from
   the planned and changed file extensions, using the `paths:` globs in the rule front matter.
   Resolve it at run time, not from a hardcoded table, so a new rule is picked up automatically.
5. **Skill tool:** available to workflow agents, and `review` and `code-style` are visible.
   **Agent tool:** NOT available to workflow agents; it was available to the `Agent`-tool
   subagent. So a workflow agent cannot run those skills' own Task fan-out. The workflow must own
   the fan-out, with one agent per file or dimension, each following the skill's **worker persona
   files by path** (`review/references/*.md`, `code-style/references/*.md`) and the skill's own
   routing, read **live** at run time. That meets "pick up any updates automatically" without
   copying anything into the script.
6. **Hooks:** per-tool-call hooks (`PreToolUse` guard-bash, guard-edits, sonar secrets;
   `PostToolUse` on push) fire inside agents. Session-level hooks do not. That includes each repo's
   `Stop` hook running `sonar analyze agentic`, which only applies to a session whose working
   directory is that repo. Any sonar check has to be an explicit step, or a gate for Sam.
