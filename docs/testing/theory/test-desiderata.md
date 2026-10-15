# Test Desiderata: properties of a good test

Where [test-pyramid.md](test-pyramid.md) is about *how much* testing effort to put at each layer, this doc is about *what makes a single test good*, regardless of layer. Synthesised from Kent Beck's Test Desiderata.

## The core principle

No property below is free, and none should be sacrificed for nothing: "no property should be given up without receiving a property of greater value in return." Not every test needs to exhibit every property — a slow, sociable integration test can be a good test if it's earning something (real confidence) that a fast one couldn't give. The desiderata are a set of dials to trade off deliberately, not a checklist every test must pass in full.

## The properties

**Isolated** — Returns the same result regardless of what order tests run in, or which other tests ran alongside it.

**Composable** — If every test is isolated, they can be run in any combination — one, many, or all — and the results still mean the same thing.

**Deterministic** — If nothing changes, the result doesn't change. (See [flaky-tests.md](flaky-tests.md) for what breaks this.)

**Fast** — Runs quickly enough that it doesn't discourage being run often.

**Writable** — Cheap to write relative to the cost of the code it's testing.

**Readable** — Comprehensible to a reader; the intent behind the test should be obvious, not just its mechanics.

**Behavioural** — Sensitive to changes in the *behaviour* of the code under test — a real regression should make it fail.

**Structure-insensitive** — Not sensitive to the *structure* of the code under test — a harmless refactor shouldn't make it fail. (This is the same failure mode called out under over-mocking in [test-doubles.md](test-doubles.md): behaviour-verification mocks are structure-sensitive by construction.)

**Automated** — Runs without a human in the loop.

**Specific** — When it fails, the cause is obvious from the failure alone.

**Predictive** — If everything passes, the code under test should genuinely be fit for production — the test's confidence claim has to be real, not assumed.

**Inspiring** — Passing the suite should actually make the team confident, not just formally "covered."

## How to use this

Two properties are worth reading together whenever a test feels wrong: **behavioural** and **structure-insensitive**. A test that fails on a refactor with unchanged behaviour is structure-sensitive — usually a symptom of solitary, mock-heavy tests asserting on internal call sequences rather than outcomes (see [test-doubles.md](test-doubles.md)). A test that keeps passing through an actual regression has failed at being behavioural or predictive — usually a symptom of over-stubbed dependencies or an assertion that's checking the wrong thing.

## References

- Beck, K. — [Test Desiderata](https://medium.com/@kentbeck_7670/test-desiderata-94150638a4b3)
- Beck, K. — [TestDesiderata](https://github.com/KentBeck/TestDesiderata) (GitHub — canonical list + talks)
- [testdesiderata.com](https://testdesiderata.com/) — reference site with the full property list
