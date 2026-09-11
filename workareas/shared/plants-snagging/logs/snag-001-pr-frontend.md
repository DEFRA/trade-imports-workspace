## What

The shared accessible-autocomplete now renders with the same GOV.UK typography
as ordinary service inputs, and its dropdown arrow paints above the page while
remaining behind the transparent interactive input.

- The wrapper and generated controls use the GOV.UK 19px font mixin.
- A local stacking context restores the upstream arrow without changing its
  hit target or right padding.
- The generated input mirrors the installed GOV.UK error border.
- FIT tripwires pin typography, paint order, focus treatment and error state.

## Sibling PR

The paired verification commit is in
[DEFRA/trade-imports-animals-tests #205](https://github.com/DEFRA/trade-imports-animals-tests/pull/205).
The plants styling tripwires belong to this frontend FIT suite; the tests PR
also carries the inspected visual-baseline update needed by the animals port.
Merge the coordinated PRs together.

## Verification

The focused suite (731 tests), full unit suite (1,815 passed, 8 skipped),
format, lint and FIT suite (213 passed, 1 flaky retry) are green. The plants
E2E project is green (64 tests), and the full cross-service E2E suite is green
(257 passed, 1 skipped) against the verified source-mounted development stack.

Snagging increment `snag-001` (`workareas/shared/plants-snagging`). No Jira
ticket by design.

Generated with OpenAI Codex.
