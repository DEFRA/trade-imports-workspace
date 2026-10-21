---
paths:
  - '**/*.java'
---

# Java conventions

Editing a `.java` file. Follow the workspace Java best-practices — do not rely on memory of older Java idioms.

- Always on: `~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md` holds the house rules inline (comments, ids, history, names, structure, tests, logging). They apply to every Java file and win over any guide below.
- Topic dir: `~/git/defra/trade-imports-workspace/docs/best-practices/java/`
- Key files: `modern-java.md` (Java 17–25 idioms), `spring-boot.md`, `spring-data-mongodb.md`, `aws-sdk-v2.md`, `openapi-springdoc.md`, and `testing/{unit.md,integration.md}`.
- Logging: `spring-boot.md` §15 Logging. Read it before adding a log line, a catch, a retry or a fallback.
- Additive: doc comments follow `~/git/defra/trade-imports-workspace/docs/best-practices/doc-comments/javadoc.md` (read `~/git/defra/trade-imports-workspace/docs/best-practices/doc-comments/BEST_PRACTICES.md` first for the accuracy rules).

Read the files relevant to the change before editing. Do not copy the best-practices content into this file; only the house rules are written inline, in `code-quality.md`.
