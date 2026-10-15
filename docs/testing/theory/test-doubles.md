# Test doubles: dummy, fake, stub, spy, mock

A companion to [test-classification.md](test-classification.md). "Mock" gets used as a catch-all for any stand-in object, which makes it hard to talk precisely about what a test actually verifies. Gerard Meszaros's term **test double** (by analogy with a film stunt double) is the general name for any object that stands in for a real collaborator in a test; the five specific kinds below distinguish *how* it stands in. For constructing the domain data a test operates on, rather than standing in for a collaborator, see [test-data.md](test-data.md). Synthesised from Fowler's "Mocks Aren't Stubs" and Meszaros's xUnit Test Patterns.

## The five kinds

**Dummy** — Passed around but never actually used. Exists only to satisfy a parameter list or constructor signature. No behaviour to speak of.

**Fake** — Has a real, working implementation, but takes a shortcut that makes it unfit for production (e.g. an in-memory database standing in for a real one).

**Stub** — Provides canned answers to the calls made during the test, and generally doesn't respond to anything outside what's been programmed in. Used to steer the test down a particular path.

**Spy** — A stub that also records how it was called, so the test can assert on that afterwards.

**Mock** — Pre-programmed with expectations about the calls it should receive, checked as part of the test itself rather than asserted afterwards.

## The distinction that actually matters: state vs. behaviour verification

This is the axis worth remembering, per Fowler's "Mocks Aren't Stubs":

- **State verification** — run the code, then assert on the resulting state (of the object under test, or of a stub/fake/spy). Dummies, fakes, stubs, and spies are normally used this way.
- **Behaviour verification** — assert that specific calls happened, in a specific way, as part of the test's expectations. Only mocks work this way.

Behaviour verification couples the test to *how* the code achieves its result, not just *whether* it's correct — which is a stronger, more brittle claim than state verification.

## Classical vs. mockist testing style

Two coherent but different philosophies, per Fowler:

- **Classical** — use real collaborators wherever practical; reach for a test double only when the real thing is awkward (slow, non-deterministic, has side effects, or doesn't exist yet). Style tends to be "middle-out": build the domain first.
- **Mockist** — reach for a mock for any collaborator with interesting behaviour, as part of an "outside-in," need-driven design process, letting the mocks dictate the interfaces as you go.

Neither is universally correct; the workspace doesn't need to pick one, but a given test should be recognisably doing one or the other rather than a confused mix.

## Anti-pattern: over-mocking

Replacing every collaborator with a mock and asserting on every call turns a test into a restatement of the implementation rather than a check of behaviour: it breaks on harmless refactors (because the sequence of calls changed) and passes over real regressions (because the mocked collaborator was never asked to behave like the real one). If a test starts requiring more mock setup than the assertion it's protecting, that's a signal to switch to a fake, a sociable/real collaborator (see [test-classification.md](test-classification.md)), or a state-verification style instead.

## References

- Fowler, M. — [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html)
- Meszaros, G. — [Test Double](http://xunitpatterns.com/Test%20Double.html), xUnit Patterns
- Meszaros, G. — [Mocks, Fakes, Stubs and Dummies](http://xunitpatterns.com/Mocks,%20Fakes,%20Stubs%20and%20Dummies.html), xUnit Patterns
