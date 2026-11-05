## Java test specifics

- Unit tests (`*Test`) and integration tests (`*IT`) follow the guides in
  this brief: integration tests extend the shared IT base classes and use
  Testcontainers, not a hand-built context.
- AssertJ assertions on the exact value, not `isNotNull()` where the value
  is known.
- A `@DisplayName` or method name is the title: it states what the
  assertions prove.
- Test support classes (`testsupport/`) are reviewed as shared helpers: a
  copy of their body in a test is a `duplication` finding.
