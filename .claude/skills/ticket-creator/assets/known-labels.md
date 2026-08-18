# EUDPA-project Jira labels — observed catalogue

Snapshot of labels in use on the EUDPA board (board 13780). Read this
at session start so the LLM has visibility into the established
patterns and stops inventing new labels.

**Snapshot date:** 2026-05-26
**Source:** backlog sample via
`~/git/defra/trade-imports-workspace/tools/jira/list-board-labels.sh 13780`
(129 issues).

Casing rule: **camelCase canonical** (e.g. `technicalImprovement`,
not `tech-improvement` or `technical_improvement`). Legacy hyphenated
forms exist on older tickets but should not be used on new work.

## Active labels (observed counts)

| Label | Count | Use when |
|-------|-------|----------|
| `Skeleton` | 27 | Initial scaffolding story for a new capability slice — puts a feature in the codebase before behaviour is wired up. |
| `technicalImprovement` | 8 | Tech debt — refactor, dependency upgrade, code-quality clean-up. Pairs with the tech-debt modifier (priority `Lowest`). |
| `UCD` | 1 | User-centred design work — research, design artefact, prototype. |

### Capability-tracking family — `CAP-*` and `COMMON-CAP-*`

Stories that belong to a Capability (CAP) work-stream carry a label
of the form `CAP-<area>.<sub>` or `COMMON-CAP-<area>.<sub>`, the
latter marking a cross-cutting capability. A `CAP-H.<sub>` holding
series covers the Notification Hub. These codes are defined in the
[EUDP Import Notification Capability Map][cap-map] on Confluence
(page id `6468764101`), not in this catalogue.

The active set is pulled fresh on each session by
`tools/ticket-creator/prepare-ticket-creation.sh` and Read at
session start from `workareas/ticket-creation/.prereqs/capabilities.txt`,
one `CODE — Name [STATUS]` per line. Pick from that list — don't coin
new codes from this skill.

If that file is missing or the script reported an `ERROR:`, the map has
drifted from its canonical shape — run
`tools/ticket-creator/check-capabilities.sh` rather than guessing a code.

[cap-map]: https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6468764101

## Legacy / deprecated labels (do not use on new tickets)

| Label | Notes |
|-------|-------|
| `tech-improvement` | Legacy hyphenated form of `technicalImprovement`. Replaced. |
| `DevOps` | Previously paired with a "DevOps quick ticket" convention; the convention has been removed. |

## Refreshing this catalogue

When the snapshot drifts from reality, re-run the aggregator and
update this file:

```bash
~/git/defra/trade-imports-workspace/tools/jira/list-board-labels.sh 13780
```

Update the **Snapshot date** in the header, refresh the counts in
the active-labels table, and refresh the CAP family list. If a new
label appears repeatedly (>1 occurrence) that isn't yet catalogued,
add it. If a label drops out of use entirely, move it to the
Legacy/deprecated section with a note about when it was retired.
