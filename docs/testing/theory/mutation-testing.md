# Mutation testing

A technique for measuring whether a test suite actually catches bugs, rather than just executing lines — a sharper answer to the "chasing 100% coverage" anti-pattern already named in [test-pyramid.md](test-pyramid.md). Synthesised from PIT (Java) and Stryker (JavaScript/TypeScript) documentation.

## The problem it solves

Line/branch coverage only proves code *ran* during a test — it says nothing about whether the test would have noticed if that code were wrong. A test can execute every branch of a function and still contain no assertion capable of catching a broken calculation, an inverted condition, or an off-by-one error. Coverage percentage and test quality are not the same thing, which is exactly why chasing coverage as a target is misleading (see the pyramid doc's anti-pattern section).

## How it works

A mutation testing tool automatically introduces small, deliberate faults ("mutants") into the code under test — inverting a condition, changing a boundary (`<` to `<=`), swapping an arithmetic operator, deleting a line — then reruns the test suite against each mutated version:

- **Killed** — a test failed, meaning the suite noticed the fault. Good.
- **Survived** — every test still passed despite the fault. This is the finding that matters: the suite has a gap at that exact line, coverage numbers notwithstanding.
- **No coverage** — no test even executed the mutated line (a coverage gap, not a mutation gap).
- **Timeout** — the mutation caused an infinite loop or hang, generally treated as killed.

**Mutation score** = killed mutants ÷ total mutants. Unlike line coverage, this score can only go up when a test's *assertions* actually get sharper — running more code without asserting anything new doesn't move it.

## Tooling for this workspace's stacks

- **Java (backend, stub, reference-data, dynamics-gateway):** PIT (PITest) — works directly against compiled bytecode, so it's fast and needs no source rewriting.
- **JavaScript/TypeScript (frontend, admin, tests):** Stryker (StrykerJS) — supports the common JS/TS test runners and can type-check mutants via its TypeScript checker plugin to skip mutants that would just be compile errors.

## Anti-pattern: treating a survived mutant as noise

A survived mutant is a concrete, reproducible example of a change to production behaviour that no test noticed — dismissing it (or only ever looking at the aggregate score) throws away the one piece of information mutation testing exists to surface. Each survived mutant should be read as a specific missing assertion, the same way a failing test names a specific broken behaviour.

## Anti-pattern: running it on everything, every build

Mutation testing is far slower than the suite it's testing — every mutant requires a full test run — so treating it as a per-commit CI gate the way unit tests are tends to make the pipeline impractically slow. It fits better as a periodic health check on the test suite itself (analogous to how [contract-testing.md](contract-testing.md) tests run on their own schedule, not every build), and can be scoped to changed files/packages rather than the whole codebase to keep it tractable.

## References

- [PIT Mutation Testing](https://pitest.org/) — Java
- [Stryker Mutator](https://stryker-mutator.io/) — JavaScript/TypeScript
