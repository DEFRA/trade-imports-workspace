# Design Release 2.1: layer by layer to main

Decided by Sam, 13 October 2026. This replaces "review the combined branch as one".

## Summary

- The themes are layered by dependency (`themes/themes.json` `landingOrder`, drawn on Ian's [build-order page](https://claude.ai/code/artifact/f7f85b51-6974-4096-acd1-66bec1171457)).
- Each layer goes to `main` on its own theme branches, then the next layer starts.
- Per layer: get the branches ready, engineering review, fix, Sam merges, BAs review, feed back.
- Claude runs the engineering reviews and keeps track. Sam reviews, decides and merges.
- The page maturity banner is not part of Design Release 2.1. It has its own ticket and branch.

## The loop for each layer

| Step | Who | What | Done when |
|---|---|---|---|
| 1. Ready | Claude | Survey each theme branch: PRs per repo, how far behind `main`, conflicts, CI, fixes that only exist on the combined branch | Every theme branch is level with `main`, green, and carries its own fixes |
| 2. Engineering review | Claude, for Sam | Review each theme's own diff: find, adversarially verify, rank by risk. One review pack per layer | Sam has a ranked list per theme |
| 3. Change | Claude (agents) | Fix what Sam rules in. Re-prove: unit, E2E, OpenSpec validate | Sam signs the theme off |
| 4. Merge | Sam | Merge to `main`, services first, then frontends, then tests, then the workspace spec PR | Every PR in the layer is merged |
| 5. BA review | BAs | Business review page for that layer: what changed, spec before and after, verdicts | BAs have given verdicts |
| 6. Feed back | Claude | Each verdict becomes a fix on a small branch, a new backlog row, or no action. Sam rules on anything unclear | Every verdict has an outcome |
| 7. Next layer | Claude | Merge `main` into the next layer's theme branches and go to step 1 | — |

Steps 5 and 6 for one layer can run while step 1 of the next layer starts.

## Layers

| Layer | Themes | Branch built? |
|---|---|---|
| 1 | Journey foundation (EUDPA-691), Reference lists (EUDPA-692) | Yes, both |
| 2 | Design snagging (no ticket yet): the designers' review of `main` against the prototype, 19 October | No: 16 rows ready, cut from `main` |
| 3 | Documents, Address book, Commodities and import reason (EUDPA-693), Arrival and transit (EUDPA-694), Origin page (EUDPA-695) | 3 of 5 |
| 4 | Transporters, Identification and permanent address, Type question and templates | 1 of 3 (templates: 13 of 22 rows, 9 held) |
| 5 | Consignment parties, Overview and review (EUDPA-696) | 1 of 2 |
| 6 to 9 | Manage notifications, Animals dashboard, Germinal products, INS dashboard, Waiting on design | None |

Layer numbers match the waves in `themes/themes.json`. Design snagging was put in on 19 October as its own layer, ahead of the rest. It brings finished fixes from the origin page, commodities and import reason, arrival and transit, and overview and review branches to `main`, and takes in 7 planned rows. See `snagging/assessment.md`.

## Layer 1 pull requests

| Theme | Repo | PR |
|---|---|---|
| Journey foundation | animals frontend | #399 |
| Journey foundation | plants frontend | #93 |
| Journey foundation | INS frontend | #46 |
| Journey foundation | tests | #21 |
| Reference lists | animals frontend | #400 |
| Reference lists | plants frontend | #94 |
| Reference lists | INS frontend | #47 |
| Reference lists | tests | #22 |
| Reference lists | reference-data | #25 |
| Reference lists | stub | #18 |

The workspace OpenSpec changes for each theme also need a PR to `main`. Step 1 works out which spec commits belong to which theme.

## The combined branch

- It stays as a preview of everything together. It is not merged.
- After each layer merges, `main` is merged into it so it keeps showing the remaining difference.
- It is closed when the last layer merges.

## What to keep track of

| Record | Where |
|---|---|
| This plan and each layer's step | This file, the "Status" table below |
| Theme order and rows | `themes/themes.json`, each theme's `backlog.json` |
| Engineering review packs | `layers/<n>/engineering-review.md` |
| Differences from the prototype ("prototype says X, we did Y, because Z") | `themes/<id>/prototype-differences.md`, linked from each theme PR; refreshed at step 3 and given to the BAs at step 5 |
| BA verdicts | The layer's business review page database, read back with ArtifactData |
| Outcomes of BA verdicts | `layers/<n>/ba-outcomes.md`, and new rows in the theme backlogs |

## Status

| Layer | Step | Note |
|---|---|---|
| 1 | 5. BA review | **Merged to main 13 October** on Sam's go-ahead. Journey foundation: animals #399, plants #93, INS #46, tests #21, workspace spec #108. Reference lists: stub #18, reference-data #25, animals #400, plants #94, INS #47, tests #22, workspace spec #114. Review pack `layers/1/engineering-review.md`; prototype differences in each theme's `prototype-differences.md`. Next: layer 1 business review page for the BAs. Main merged into the combined branch and every built theme branch (693, 694, 695, 690, 696) on 14 October: all level with main, all PRs green. Carried to layer 2 (EUDPA-693): import reason's "Save and return" skips required checks; k6 walk out of step with the opening run. Plants journey-flow REQ-PLANTS-FLOW-015 coverage partial (unit only) |
| 2 | 1. Ready (next) | Design snagging: build on `feat/NO_JIRA-design-release-2-1-design-snagging` from `main` (see `themes/HOW-TO-BUILD.md`). Three snags wait on the designers (`snagging/discussion.md`) |
| 3 | Waiting on layer 2 | Documents, Address book, Commodities and import reason (EUDPA-693), Arrival and transit (EUDPA-694), Origin page (EUDPA-695): once design snagging merges, merge main into each theme branch, drop the ported changes their port notes name, and survey |
| 4 to 9 | Not started | — |

## Separate from this plan

- **Page maturity banner.** A new feature, not Design Release 2.1. Proof of concept moves to its own branch from `main`, gets a ticket, and is built properly elsewhere. It comes off the combined branch.
- **Templates' 9 held rows** stay held until layer 3.
- **Stub PR DEFRA/trade-imports-defra-id-stub#13** (isolated E2E users) still unblocks the parked tests patch and the save-template flake.
