# Contract testing

Referenced as a specialised middle layer in [test-pyramid.md](test-pyramid.md). This doc goes deeper on what a contract test actually verifies, and how it differs from a full integration or end-to-end test across a service boundary. Synthesised from Fowler's contract-testing bliki entries and the Consumer-Driven Contracts pattern.

## The problem it solves

Where two services meet — a consumer calling a provider's API — there are two ways to check they agree: spin up both services for real and run a broad-stack test against them (slow, and requires the other team's service to be deployable alongside yours), or verify the *interface* both sides agree on without either one needing the other's full stack. Contract testing is the second option.

## What a contract test verifies

Per Fowler's `ContractTest` framing: once a service is doubled for testing (see [test-doubles.md](test-doubles.md)), a contract test checks that the double actually behaves like the real thing — "these check that all the calls against your test doubles return the same results as a call to the external service would." Without this, a double can silently drift from reality: the consumer's tests keep passing against a fake that no longer matches the provider, and the mismatch only surfaces in production.

Contract tests don't need to run on every build the way unit tests do — they run on their own schedule (e.g. daily, or whenever the provider's API changes), because that's the cadence at which the thing they're checking actually changes. A contract test failure shouldn't necessarily break the build the way a normal test failure would; it's a signal to open a conversation with the other team about a breaking change, not (by itself) proof that your code is broken.

## Consumer-Driven Contracts (CDC)

A specific, stronger version of contract testing, per Fowler's "Consumer-Driven Contracts: A Service Evolution Pattern": instead of the provider unilaterally publishing one schema that every consumer must fully satisfy, each **consumer** publishes what it actually needs from the provider — "just enough" validation covering only the fields/behaviour it depends on, not the whole interface. The provider then runs every consumer's contract as part of its own build.

This inverts who bears the cost of change:
- The provider knows, before merging, exactly which consumers a change would break.
- Consumers can evolve independently without being tied to the provider's full schema.
- "A service is of value to the business only to the extent it is consumed" — CDC keeps the tested surface aligned with what's actually used, not with every field the provider happens to expose.

Tools like Pact implement this pattern directly: the consumer's test run generates a contract file, and the provider's pipeline replays it to verify compliance — without either side needing to run the other's service.

## How this differs from an integration or E2E test

An integration test proves your code works against *something* (often a real or faked dependency you control). A contract test proves that something matches what the *actual* provider or consumer will do — it's specifically about keeping a test double honest, or keeping two independently-deployed services compatible, rather than about testing your own logic. It sits between the pyramid's integration layer and its top layer: cheaper and faster than standing up a full cross-service E2E test, but checking something a purely local integration test can't (that the *other side* hasn't drifted).

## Anti-pattern: relying on E2E alone for cross-service compatibility

Skipping contract tests and only catching provider/consumer mismatches in full end-to-end tests pushes the feedback all the way to the slowest, flakiest, most expensive layer of the pyramid — exactly the layer the pyramid says to minimise. By the time an E2E test catches a broken contract, several teams have usually already built on the mismatch.

## References

- Fowler, M. — [ContractTest](https://martinfowler.com/bliki/ContractTest.html) (bliki entry)
- Fowler, M. — [Consumer-Driven Contracts: A Service Evolution Pattern](https://martinfowler.com/articles/consumerDrivenContracts.html)
- [Pact documentation](https://docs.pact.io/) — the most widely-used CDC implementation
