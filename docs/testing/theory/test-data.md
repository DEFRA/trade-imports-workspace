# Test data

A companion to [test-doubles.md](test-doubles.md) — where that doc covers standing in for a *collaborator*, this one covers constructing the *domain data* a test actually operates on. Synthesised from Gerard Meszaros's xUnit Test Patterns.

## A note on terminology

Meszaros's own book files these patterns under "fixtures" — his term for whatever state exists before a test runs. This doc deliberately avoids that word: in this workspace, `fixture` already means something specific and different — Playwright's dependency-injection mechanism (`import { test, expect } from '@fixtures'`, `test.extend`), which wires page objects and context into a test. That's not what this doc is about. Everything here is about constructing valid domain objects and values, independent of whatever mechanism hands them to a test.

## The problem it solves

Every test needs realistic data to operate on, but most of a given object's fields are irrelevant to what any one test is actually checking. Constructing a full, valid object by hand in every test buries the one or two fields the test cares about under boilerplate that has nothing to do with its behaviour — and when the shape of that object changes, every test that built one by hand needs updating.

## Object Mother

An Object Mother is a helper — typically a set of (often static) creation methods — that returns ready-to-use test objects in a named starting state, rather than requiring each test to assemble one from scratch. Each method's name describes the state being produced (e.g. a submitted record, a draft, an amended one), and the test that calls one doesn't need to know or care how that state is actually built.

## Test Data Builder

A Test Data Builder uses the builder pattern instead of named factory methods: a fluent interface accumulates the desired state, applies sensible defaults for everything a given test doesn't specify, and only builds the actual object on a terminal call. Where Object Mother is best for a handful of well-known named states, a builder scales better when a test needs to vary just one or two fields away from a sensible default without a combinatorial explosion of named methods to cover every combination. The two aren't mutually exclusive — Meszaros notes an Object Mother can itself return a builder, giving a test a ready-made default it can still adjust before building.

## Anti-pattern: the Mystery Guest

A Mystery Guest is data a test's assertions depend on that isn't visible anywhere in the test itself — seeded in a `beforeAll` shared across an entire file, or pulled from some external fixture the test never references by name. Per Meszaros, this means "the test reader is not able to see the cause and effect between fixture and verification logic because part of it is done outside the Test Method" — the test can't be understood by reading it alone. This is the same failure mode `test-desiderata.md` names as **readable** and **specific**: a test whose data is a mystery guest fails both, because a reader can't tell what's actually being exercised, and a failure can't point at an obvious cause.

The fix is what Meszaros calls a fresh, inline setup: build (or call a clearly-named Object Mother/Builder for) only the data that test needs, visibly, rather than relying on data that exists somewhere else for reasons the test doesn't state. This also overlaps with `flaky-tests.md`'s "lack of isolation" cause — data shared across tests is a common source of both an unreadable test *and* a flaky one, since one test's data can end up depended on, or corrupted, by another.

## References

- Meszaros, G. — [Object Mother](http://xunitpatterns.com/Object%20Mother.html), xUnit Patterns
- Meszaros, G. — [Test Data Builder](http://xunitpatterns.com/Test%20Data%20Builder.html), xUnit Patterns
- Meszaros, G. — [Obscure Test](http://xunitpatterns.com/Obscure%20Test.html) (Mystery Guest), xUnit Patterns
