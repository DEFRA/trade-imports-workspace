# Risk-based testing

Where [test-classification.md](test-classification.md) gives objective criteria for *which layer* a test technically belongs in, this doc is about a different question: whether a test earns its place at all, and at which level it provides the most value. Synthesised from ISTQB's formal risk-based testing definition, Google's *Software Engineering at Google*, and Playwright's own best-practices guidance, applied to UI/E2E suites specifically.

## The core question

ISTQB defines risk-based testing as an approach where "the management, selection, prioritization, and use of test activities and resources are based on corresponding risk types and risk levels" — test effort should track the risk of the thing being tested, not a rule about test-type purity.

Applied to an existing suite, the question to ask about any single test is not "is this a real E2E test?" but:

> What production risk does this test protect against?

This is the same underlying idea as the Testing Library/Testing Trophy principle already cited in [test-pyramid.md](test-pyramid.md): "the more your tests resemble the way your software is used, the more confidence they can give you." A test's value comes from the risk it retires, not from which category label it wears.

## What a browser-driven (Playwright) test is suited to test

Playwright's own best-practices guidance is explicit that these tests should "verify that the application code works for the end users" — testing user-visible behaviour, not implementation details (function names, internal state, DOM structure), and preferring role-based locators that mirror how a user or assistive technology actually perceives the page.

That framing is broader than "large end-to-end journeys." A browser-driven test earns its keep whenever the risk being protected against genuinely requires the browser and the real running application together — not because the scenario is large, but because the risk lives in the *integration*:

**Application integration** — a user action triggers a real backend request; the response updates application state correctly; the correct UI is displayed; data persists correctly.

**Browser behaviour** — navigation and browser history; cookies/session handling; file uploads; other browser APIs behaving correctly. These are failures a lower-level test can't see at all, because there's no real browser underneath it.

**Critical workflows** — a user completing an important business task end-to-end; permissions enforced correctly across the whole stack. These earn release confidence precisely because they exercise production-like scenarios and real network behaviour, not a simulated subset of it.

**Failure scenarios** — how the frontend behaves under a real (or realistically simulated) backend failure: timeouts and retries behaving correctly, invalid states handled correctly, errors producing the right user experience.

Conversely, per [test-classification.md](test-classification.md)'s sociable/solitary distinction: if a check would still be a meaningful regression test with the rest of the application replaced by a stub — a component rendering correctly given a prop, a validation rule, a formatter — it belongs at the component or unit level, where it's faster and more specific about what broke.

## Layered coverage vs. duplicate coverage

Two tests covering related ground aren't automatically redundant. *Software Engineering at Google*'s "Test Behaviors, Not Methods" chapter frames this well: a test should target a specific behaviour (a guarantee the system makes under given conditions), and it's normal — even valuable — for the same underlying code to be exercised by tests at more than one level, because each level is checking a different guarantee. The book goes further: deliberate redundancy (e.g. testing shared logic both directly and indirectly through every caller's own tests) is a legitimate choice, because it protects against a coverage gap opening up if one of those callers is ever removed.

Put plainly, each level is generally protecting against a different risk:

| Test type | Protects against |
|---|---|
| Unit test | Business logic bugs |
| Component test | UI rendering bugs |
| Playwright test | Integration/browser bugs |

The failure mode this doc's [test-pyramid.md](test-pyramid.md) already names as an anti-pattern — "redundant coverage across pyramid layers slows pipelines without adding confidence" — is specifically about *accidental*, not deliberate, duplication: two tests that would fail for the same reason and add nothing beyond what the faster one already tells you.

The distinction is whether the tests are proving the *same thing* or a *different thing* that happens to touch the same code. For example: a component test asserting an error message renders given an error prop, and a Playwright test driving a real form submission through a real failing API call to check the same error message appears — the component test protects against a rendering regression; the Playwright test additionally protects against the network/state layer failing to reach that render path at all. Removing the Playwright test on the grounds that "the error message is already tested" would delete the only check on that integration, even though both tests mention the same UI text.

## Anti-patterns

**Removing a browser-driven test solely because a lower-level test covers similar-sounding behaviour.** This is a bad approach because "similar-sounding" isn't "same risk" — per the layered-vs-duplicate distinction above, the two tests are usually protecting different failure modes that happen to converge on the same visible outcome. The question to ask before deleting is not "is this covered elsewhere?" but "would removing this test reduce confidence before release?" — if yes, it's earning its cost regardless of overlap with another layer. A related but distinct question applies when the proposal is to relocate rather than delete: "can this be tested elsewhere?" is better asked as "would *moving* this test to another level reduce confidence?" — moving a test that's genuinely protecting an integration risk down to a component/unit level doesn't preserve that protection just because some check still exists.

**True duplicate coverage.** Several tests that would all fail for the identical underlying reason — repeated journeys covering the same login flow, multiple tests asserting the same static content — add execution time and maintenance cost without adding any distinct confidence. This is the accidental-redundancy case Google's book and the pyramid doc both warn against, as opposed to the deliberate redundancy described above.

## An audit checklist

For any existing test, working through these in order surfaces whether it's earning its cost:

1. **Risk covered** — what specific production failure does this test exist to catch? Check it against the categories above: a critical-workflow failure, an integration regression, a browser-specific issue, a UI-rendering regression, or (see below) duplicate coverage of a risk something else already protects.
2. **Appropriate level** — does answering that question require a real browser and the real running application, or would a stub/component-level check give the same confidence faster (see [test-classification.md](test-classification.md))?
3. **Confidence gained** — would removing this test measurably reduce confidence before release, given what else already runs?
4. **Maintenance cost** — does the confidence it provides justify its cost? Specifically: flakiness and execution time (see [test-pyramid.md](test-pyramid.md)'s framing of E2E tests as the most expensive layer), coupling to implementation detail rather than behaviour (the structure-insensitive property in [test-desiderata.md](test-desiderata.md); the over-mocking anti-pattern in [test-doubles.md](test-doubles.md)), and general complexity of the test itself.

A suite audited this way isn't optimised for the fewest or the most tests — it's optimised so each test maps to a risk that nothing faster already covers.

## References

- ISTQB — [risk-based testing](https://glossary.istqb.org/en_US/term/risk-based-testing), ISTQB Glossary
- Playwright — [Best Practices](https://playwright.dev/docs/best-practices)
- Winters, T., Manshreck, T., Wright, H. (eds.) — *Software Engineering at Google*, [ch. 12: Unit Testing — "Test Behaviors, Not Methods"](https://abseil.io/resources/swe-book/html/ch12.html)
- Dodds, K. C. — [Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests) (already cited in [test-pyramid.md](test-pyramid.md))
- Fowler, M. (with Ham Vocke) — [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) (test-duplication anti-pattern, already cited in [test-pyramid.md](test-pyramid.md))
