# service-tag skill — decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Tag the specs in other domains that each service's pull request should also run, so a service PR runs its own domain plus only the related specs elsewhere; for the maintainers of trade-imports-ins-tests.

## 2. State shape

**Choice:** prose
**Pattern reference:** docs/best-practices/skills/patterns.md §1

## 3. Dispatcher

**Choice:** true
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

- start-service-tag
- list-specs

## 8. Triggers

- "tag specs for"
- "service-tag"
- "tag service specs"
- "add service tags"

**Disambiguation:** Distinct from /init (CLAUDE.md scaffolding), and from spec-cover (writes tests for Behaviour Spec gaps) and frontend-change (edits a frontend repo): this skill only adds service tags to existing ins-tests specs and tidies config/e2e-tests-pr-scope.json.
