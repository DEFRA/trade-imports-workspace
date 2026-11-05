## Java source specifics

- Null safety: an `Optional` returned and then `.get()` without a check, a
  nullable parameter used without a guard, a record field that can be null
  with no annotation or check.
- Logging: SLF4J with the throwable as the last argument, never
  `e.getMessage()` alone. Placeholders, not string concatenation.
- Layering: controllers map requests, services hold the rules,
  repositories hold persistence. A rule in a controller, or a query built
  in a service, is a `structure` finding.
- Javadoc only on an exported public API, and only its contract.
