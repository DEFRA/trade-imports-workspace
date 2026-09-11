## What

Port the plants snag-001 accessible-autocomplete styling fix to the identical
shared component in the animals frontend.

- The wrapper and generated controls use the GOV.UK 19px font mixin.
- A local stacking context restores the upstream dropdown arrow without
  changing the input hit target, padding or focus treatment.
- The enhanced input mirrors the installed GOV.UK error border.
- Equivalent animals-origin FIT tripwires pin typography, paint order, focus
  and the invalid-country error state.

## Related PRs

- Plants implementation: [DEFRA/trade-imports-plants-frontend #67](https://github.com/DEFRA/trade-imports-plants-frontend/pull/67)
- Shared E2E visual baselines: [DEFRA/trade-imports-animals-tests #205](https://github.com/DEFRA/trade-imports-animals-tests/pull/205)

Merge the coordinated autocomplete PRs together.

## Verification

The targeted origin FIT suite is green (32 tests), the live-animals unit suite
is green (978 tests), and the full unit suite is green (2,096 passed, 8
skipped). Format, lint and the full FIT suite are green (409 tests). The
animals E2E project is green (150 tests), including the inspected and
regenerated origin visual baseline, against the verified source-mounted
development stack.

Port of snagging increment `snag-001`
(`workareas/shared/plants-snagging`). No Jira ticket by design.

Generated with OpenAI Codex.
