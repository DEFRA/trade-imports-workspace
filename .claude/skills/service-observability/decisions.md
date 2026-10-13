# service-observability skill — decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Walks a developer through adding custom metrics, dependency call logging, a Grafana dashboard and alerts to one CDP service, then promoting and testing them.

## 2. State shape

**Choice:** prose
**Pattern reference:** docs/best-practices/skills/patterns.md §1

## 3. Dispatcher

**Choice:** false
**Pattern reference:** patterns.md §2

## 4. Pre-baked context

**Choice:** false
**Pattern reference:** patterns.md §3

## 5. Worker fan-out

**Choice:** false
**Workers:** 
**Pattern reference:** patterns.md §5

## 6. Walker

**Choice:** false
**Pattern reference:** patterns.md §7

## 7. Helpers introduced

None. The skill is a recipe a person and Claude follow; it has no
state file and no setup commands, so there is no `tools/service-observability/`
and no allowlist entry.

## 8. Triggers

- "add observability to"
- "add metrics and alerts to"
- "add a dashboard and alerts to"
- "service-observability"
- "observability for EUDPA-"

**Disambiguation:** Distinct from /init (CLAUDE.md scaffolding). Distinct from ticket (plans or implements any ticket): this skill holds the observability recipe a ticket plan follows. Distinct from review and code-style, which judge code already written.
