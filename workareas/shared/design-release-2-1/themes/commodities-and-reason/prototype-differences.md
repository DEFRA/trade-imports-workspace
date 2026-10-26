# Main import reason: where we differ from the prototype

Theme: Design snagging, branch `feat/EUDPA-720-design-release-2-1-design-snagging`.
Prototype: Design Release 2.1, commit `56371e2`.

## Summary

| | Count |
|---|---|
| Differences we keep, with a reason | 2 |
| Brought in line on this branch | 5 |

## Kept

| Page | Prototype | Ours | Why | Source |
|---|---|---|---|---|
| Main import reason: the destination country and port of exit boxes | Plain selects with regular-weight labels, capped at 396px | Type-ahead boxes with bold labels, full width. Same look as the origin and port of entry searches | Design review settled 20 Oct: keep the type-ahead, with the same styling as the origin and port searches. EUDPA-635's component stays | Snag S10; ruling 9 Oct claim 4 |
| Main import reason: label size and empty-box text | Regular label, "Select one" in the select | The small bold label, as port of entry and as a follow-up question. "Select one" in both the empty box and the select's first option | Origin and port of entry differ on both, so the page sets them itself. "Select one" matches the prototype's select | Snag S10 |

## Brought in line

| Page | What now matches the prototype |
|---|---|
| Main import reason | The heading and browser title read "Main import reason" |
| Main import reason | Every destination country and port of exit starts on "Select one", with no divider |
| Main import reason | The "Exit date" label is regular weight |
| Main import reason | A 30px gap sits between the exit date box and "Port of exit" on a desktop-width screen, with and without JavaScript and in the error state |
| Overview and review | The task and the review heading read "Main import reason" |

## How the look was checked

The implementor compared the new reason page baselines (transhipment, transit, temporary admission with and without JavaScript, and the exit date error) with the prototype screens S10, S11 and S12 before staging them. The regular "Exit date" label and the gap above "Port of exit" match the prototype. The bold "Port of exit" label and the full-width box are the kept differences above.

The designers see the baselines at pull request review, and the screens in `snagging/screens/main` when the rendered-proof step re-shoots S09, S10, S11 and S12.
