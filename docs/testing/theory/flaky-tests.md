# Flaky tests

A flaky test is one that passes and fails on the same code, without any code change — it violates the **deterministic** property from [test-desiderata.md](test-desiderata.md). Per Fowler: "Non-deterministic tests have two problems, firstly they are useless, secondly they are a virulent infection that can completely ruin your entire test suite" — once a suite has a reputation for crying wolf, real failures get ignored along with the noise. Synthesised from Fowler's "Eradicating Non-Determinism in Tests" and Google's Testing Blog.

## Common causes

**Lack of isolation** — A test depends on state left behind by another test, or on execution order. Fix by rebuilding state from scratch per test and cleaning up afterwards, rather than relying on ordering.

**Asynchronous behaviour** — Waiting on something that hasn't happened yet. A bare `sleep()` is the classic anti-pattern: it's both slow (always waits the full duration) and still unreliable (fails whenever the real delay exceeds the guess). Prefer polling with a timeout, or a callback/event to wait on.

**Remote services** — A real network call to something outside the test's control. Replace with a test double (see [test-doubles.md](test-doubles.md)) that behaves deterministically, validated separately by a contract test (see [contract-testing.md](contract-testing.md)) so the double doesn't quietly drift from the real service's behaviour.

**Time** — Code that calls the system clock directly produces different results depending on when it runs (midnight rollovers, DST, leap seconds). Wrap the clock behind a seam so tests can substitute a fixed, seeded time.

**Resource leaks** — Unreleased connections, threads, or memory cause failures that appear random because they depend on what ran before. Running a resource pool at size 1 in tests surfaces a leak immediately instead of it hiding until the pool is exhausted under load.

## Anti-pattern: masking instead of fixing

Automatically re-running every failed test, or blanket-retrying in CI, treats the symptom and hides the problem: a "flaky" designation that never gets revisited just becomes a permanent tax on suite reliability and a place where real regressions go to hide. Google's own practice reruns only tests explicitly marked as flaky (not everything), and pairs that with active tracking — flaky tests are still tracked as bugs to fix, not permanently tolerated.

## Quarantine, with limits

Moving a known-flaky test out of the main pipeline so it stops blocking other people's builds is legitimate — but only as a deliberately time-boxed holding pen, not a place tests go to be forgotten:

- Cap how many tests can be in quarantine at once (Fowler suggests a limit around 8) — hitting the cap should itself be treated as a build-breaking signal.
- Cap how long a test can stay quarantined (e.g. one week) before it must be fixed or deleted outright.

A quarantined test that everyone has forgotten about provides zero value and zero confidence — it's better deleted than left silently ignored.

## References

- Fowler, M. — [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html)
- Google Testing Blog — [Flaky Tests at Google and How We Mitigate Them](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)
