# Repository Review: trade-imports-workspace

**PR:** #217
**Commit reviewed:** a937d6cc727855548f8d365f6e39c5a9e6c6ea0d
**Files Changed:** 10

## Summary
Rewrites the `service-observability` skill around Micrometer + `EmfMeterRegistry` (dot-case names), with matching dashboard/alert templates and updates to `spring-boot.md` / unit-test guidance. Aligns with the address-book reference implementation. Grafana import and alert firing remain marked `[UNPROVEN]`.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `.claude/skills/service-observability/SKILL.md` | NEEDS ATTENTION | 0 | 1 | 0 |
| `.claude/skills/service-observability/assets/alerts.template.md` | SAFE | 0 | 0 | 0 |
| `.claude/skills/service-observability/assets/dashboard.template.json` | SAFE | 0 | 0 | 0 |
| `.claude/skills/service-observability/references/ALERTS.md` | SAFE | 0 | 0 | 0 |
| `.claude/skills/service-observability/references/DASHBOARD.md` | SAFE | 0 | 0 | 0 |
| `.claude/skills/service-observability/references/LOGGING.md` | SAFE | 0 | 0 | 0 |
| `.claude/skills/service-observability/references/METRICS.md` | NEEDS ATTENTION | 0 | 1 | 0 |
| `CLAUDE.md` | NEEDS ATTENTION | 0 | 1 | 0 |
| `docs/best-practices/java/spring-boot.md` | SAFE | 0 | 0 | 0 |
| `docs/best-practices/java/testing/unit.md` | SAFE | 0 | 0 | 0 |

## Positive Observations
- Skill METRICS/LOGGING/ALERTS and the templates use the same names the address-book code publishes.
- Clear `[UNPROVEN]` markers where CDP steps have not been run on a real service yet.
- Best-practice guides updated away from the deleted `EmfMetricsPublisher` shape.

## Test Coverage
- Unit tests: N/A (skill and docs).
- Integration tests: N/A.

## Risk Assessment
**Overall Risk:** Low
**Rationale:** Documentation-only change for this repo; the open item is ticket-key provenance narration, not a runtime defect.

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | .claude/skills/service-observability/SKILL.md | 14 | Major | history | SKILL.md lines 14-15 name EUDPA-632 and EUDPA-674 as where the skill was written from; METRICS.md line 67 tags address-book with (EUDPA-674), line 166 tags reference-data with (EUDPA-632), and the CLAUDE.md skill-routing row repeats both ticket keys as provenance. Code-quality forbids ticket keys and before/after narration in committed docs that agents copy from; git already holds that history. | the skill states the current recipe and which services prove which step, without ticket keys or 'written from EUDPA-…' narration in SKILL.md, METRICS.md or the CLAUDE.md routing blurb. | say 'spike on trade-imports-reference-data' and 'reference implementation trade-imports-address-book' and drop the EUDPA-N tokens from those sentences. |  |  |  |
| 2 | .claude/skills/service-observability/references/METRICS.md | 67 | Major | history | The reference-implementation sentence tags trade-imports-address-book with (EUDPA-674), and the 'old way' table tags reference-data with (EUDPA-632). Same provenance narration as SKILL.md. | METRICS.md names the reference services without ticket keys. | drop the (EUDPA-N) parentheticals; keep the service names and package paths. | Merged | — | merged into #1 |
| 3 | CLAUDE.md | 1 | Major | history | The service-observability row in the skill routing table names EUDPA-632 and EUDPA-674 as where the skill was written from, repeating the history narration in SKILL.md. | the CLAUDE.md routing blurb describes the skill's current recipe without ticket keys. | say the code recipe is Micrometer via EmfMeterRegistry on trade-imports-address-book, proven by tests there. | Merged | — | merged into #1 |

## Repository Verdict
**Status:** NEEDS ATTENTION
