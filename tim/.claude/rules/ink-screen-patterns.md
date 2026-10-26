---
paths:
  - 'src/components/**'
---

# Ink screen conventions

## Language

All user-facing strings follow GDS plain English (see `@../docs/best-practices/gds/language.md` from `CLAUDE.md`). Address the user directly, active voice, plain words. "Can't connect to Jira" not "Connection to Jira could not be established".

## Component shape

- Screens are pure given their props. Side-effects (network calls, file I/O, subprocess spawn) live in the feature hook (`use<Name>Feature.js`), not in the screen.
- One screen = one file. One feature folder = one hook + one or more screens.
- Shared screens (`MenuScreen`, `LoadingScreen`, `ErrorScreen`, `InputScreen`, `TaskResultsScreen`, `ParallelProgressScreen`) live under `src/components/common/screens/` and are reused. Don't fork them per feature.

## Detaching for long-running stdio

Some commands (`tim docker logs`, `tim start frontend`, foreground processes) need raw stdio for the child process. The pattern:

1. Hook decides to run the long-lived command.
2. Calls `unmount()` from `inkControl.js` to tear down Ink cleanly.
3. Spawns the child with `stdio: 'inherit'` via execa.
4. Awaits exit; CLI exit code mirrors the child's.

Don't render Ink frames over streaming docker/npm output — it corrupts the terminal.

## Parallel work

The canonical multi-task pattern is `ParallelProgressScreen`. Feature hooks build a `tasks: [{id, label, run: (signal) => Promise}]` array; the screen runs them with controlled concurrency, surfaces per-task spinner + status, and on `--json` unmounts Ink and writes a structured result.

Don't roll a bespoke progress UI per feature — extend `ParallelProgressScreen` if a new shape is genuinely needed.
