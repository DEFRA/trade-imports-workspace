# EUDPA-774 business tickets

One Story per domain for "Save and continue always goes on through the rest of the journey", written by the `theme-ticket` skill from `openspec/` on `main`. Parent epic EUDPA-328. Each relates to the original story, EUDPA-774.

The backlog has no themes, so the whole backlog is one theme. Its row commits are scoped `eudpa-774-save-and-continue`. The work was squash-merged as workspace #226 (14346101), so the derive read the row commits from the local branch `feat/EUDPA-774-save-and-continue-through-journey` and links every spec file on `main`.

| Folder | Jira | Domain | Rows | Scenarios | Spec files | Status |
|---|---|---|---|---|---|---|
| `animals/` | EUDPA-793 | Live animals | 26 | 114 | 21 | Deskcheck |
| `plants/` | EUDPA-794 | High-risk plants | 21 | 75 | 13 | Done |

114 + 75 = 189 scenarios across 21 + 13 = 34 files, which matches the theme's total in `derived.json`.

Rows: the backlog holds 32. 15 changed both frontends and appear on both tickets, 11 only live animals and 6 only plants (26 + 21 − 15 = 32).

Excluded: 9 `ins/address-book` scenarios that the coverage-link commit db4cc928 carried in after merging main. They are EUDPA-789's behaviour, not this theme's. See `footprint-overrides.json` for the reasoning.

Regenerate:

```bash
tim theme-ticket derive --workarea shared/eudpa-774 --theme eudpa-774-save-and-continue --branch main --commits-from feat/EUDPA-774-save-and-continue-through-journey --out workareas/shared/eudpa-774/tickets/derived.json
```
