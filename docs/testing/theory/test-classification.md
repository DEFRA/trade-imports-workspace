# Classifying a test: which layer does it belong in?

A companion to [test-pyramid.md](test-pyramid.md). The pyramid describes the layers; this doc gives objective criteria for placing a specific test into one of them, rather than relying on what it happens to be named. Synthesised from Google's test-size classification and Fowler's sociable/solitary distinction.

## Why this needs objective criteria

"Unit," "integration," and "end-to-end" are used inconsistently across teams — the same test might be called a unit test by one developer and an integration test by another, purely based on convention rather than what the test actually does. Two independent axes settle the question without relying on naming convention: **what the test touches** (its size/scope), and **what it uses to touch it** (real collaborators or test doubles).

## Axis 1: What does the test touch? (size/scope)

Based on Google's small/medium/large test-size classification — deliberately defined by measurable constraints rather than intent:

**Small** — Runs in a single process. No network calls, no filesystem access, no sleeping, no other processes. Tight time limit (Google uses 60 seconds). If a test can't honestly meet these constraints, it isn't small, regardless of what it's named.

**Medium** — Can span a few components: a service talking to a real (often local/in-memory) database, or two in-process modules wired together for real. Broader time limit (Google uses 300 seconds).

**Large** — Full system: real network, real external dependencies, real deployment topology. Answers "does the product work the way a user expects?" Longest time limit (Google uses 900 seconds).

This maps directly onto the pyramid's unit/integration/UI layers, but the size labels are argument-proof: you can *check* whether a test opens a socket or sleeps; you can't objectively check whether a test "feels like" a unit test.

## Axis 2: What does the test use to get there? (sociable vs. solitary)

Independent of size, per Fowler's `UnitTest` distinction:

**Solitary** — The unit under test is isolated from its collaborators using test doubles (see [test-doubles.md](test-doubles.md)). A failure in a neighbouring class can't cause this test to fail.

**Sociable** — The unit is allowed to talk to its real collaborators. A failure in a neighbouring class *can* cause this test to fail — which is sometimes exactly the point (it's testing the collaboration, not just the unit).

Fowler is explicit that this is a pragmatic choice, not a purity test: "even a classic tester ... uses test doubles when there's an awkward collaboration." A sociable small test (real collaborators, but still single-process, no I/O) is entirely normal — e.g. two plain objects wired together in memory.

## Putting the two axes together

| | Solitary (doubles) | Sociable (real collaborators) |
|---|---|---|
| **Small** (in-process, no I/O) | Classic isolated unit test | Multiple real objects, no I/O — still a fast unit test |
| **Medium** (a few components, real I/O) | One component under test, its neighbours doubled, but hitting a real DB/queue | Real service + real local dependency (e.g. service + local Postgres) |
| **Large** (full system) | Rare — largely defeats the point of a large test | End-to-end / UI test through the real deployed stack |

A test's pyramid layer is a *consequence* of where it lands on this grid, not something to decide first and then justify.

## Anti-pattern: mislabelling

Calling a test "unit" when it actually opens a real database connection is a bad approach: it gives false confidence that the suite is fast and isolated, and it's how test suites quietly become slow and flaky without anyone noticing the shift — the failure creeps in one "unit test that happens to hit the DB" at a time. If a test doesn't meet the small-test constraints, classify and run it as medium, so its cost is visible.

## References

- Google Testing Blog — [Test Sizes](https://testing.googleblog.com/2010/12/test-sizes.html)
- Fowler, M. — [UnitTest](https://martinfowler.com/bliki/UnitTest.html) (bliki entry — sociable vs. solitary)
- Fowler, M. — [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html) (classicist vs. mockist framing)
