---
paths:
  - 'src/cli.js'
  - 'src/commands/**'
---

# CLI conventions

## Commander wiring

- One subcommand = one file under `src/commands/`. The file exports a `register(program)` function that adds the command, options, and action handler.
- `src/cli.js` is the only entry point. It imports every `register` and calls it. No dynamic discovery — explicit imports keep the surface obvious.
- Every command sets these options on top of its own:
  - `--json` — emit one zod-validated JSON line to stdout, suppress Ink
  - `--no-ui` — plain text to stdout, no Ink
  - `--verbose` — pino structured logs to stderr
  - `--workspace <path>` — override the resolved workspace root
- `cli.js` sets `--no-ui` automatically when `!process.stdout.isTTY`.

## Argument validation

- Validate every positional and option before any side-effect runs (network, filesystem write, subprocess spawn). Use a small zod schema per command, parse once at the top of the action.
- Validation failure → exit 2 (per `src/constants/exitCodes.js`) with a GDS-plain-English message on stderr. Never throw a raw zod error at the user.

## Errors and exit codes

- All errors go to stderr. Stdout is reserved for the command's output (text or JSON).
- Use the constants in `src/constants/exitCodes.js`. Don't write magic numbers.
- The shared writer core's write-safety refusals (a lost update, a lock still held) use `src/constants/writerExitCodes.js` instead (`LOST_UPDATE` = 3, `LOCKED` = 4), mapped by `exitCodeFor` in `src/commands/envelope.js`. `tim backlog *` can exit with these.
- In `--json` mode, errors emit `{ok: false, schema_version: 1, tim_version, errors: [{code, message}]}` to stdout _and_ set the exit code.

## Help text

- Every command must have a `description` and at least one usage `example`. GDS plain English. No marketing copy.
