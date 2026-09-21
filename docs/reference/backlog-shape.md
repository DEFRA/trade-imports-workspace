# The backlog shape

One `backlog.json` shape joins the pieces. The `distil` skill writes it, `tim backlog check` validates it, and
build-orchestrator and `.claude/workflows/increment-build-loop.js` read it. It lives at
`workareas/<workarea>/backlog.json`.

An increment is a **requirement**: what, why and acceptance. It is never a recipe. The build loop's plan stage
works out the how against the live tree, just in time, and writes it to `workareas/<workarea>/plans/<id>.md`.

An increment is a **full-stack slice**. It covers every repo the behaviour needs, and its acceptance can be
observed once it lands. It is never "the backend half of X" or "the tests for X".

## Envelope

```json
{
  "programme": "iuu-transport",
  "generatedFrom": ["trace:iuu", "confluence:6518997286"],
  "invariants": ["Every page round-trips the CSRF token."],
  "increments": []
}
```

`invariants` are rules every increment must keep. They are written once here, not repeated on each row. The
loop's planner and reviewers read the envelope as well as the row.

## Row

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | `inc-NNN`. Stable: never renumber, because rulings and commits cite it |
| `title` | yes | What changes, in plain English |
| `detail` | yes | What and why: the user need, and the behaviour afterwards |
| `acceptanceCriteria` | yes | At least one outcome a user, operator, other system or reviewer can observe. Each may end with its provenance, such as `(confluence:6518997286 §3)` |
| `dependsOn` | yes | Ids that must be `done` first. A real ordering need, not a layer order |
| `status` | yes | `todo`, `blocked`, `done`, `deferred`, `dropped`, `rejected` or `merged-into` |
| `kind` | no | `feat`, `fix`, `chore`, `refactor`, `test` or `docs`. Sets the branch prefix |
| `repos` | no | The repo keys the slice touches, such as `["backend","frontend","tests"]`. Left out, the loop takes every configured repo |
| `sources` | no | Where it came from: `{ "source": "trace:iuu", "ref": "pages/transport-details.json" }` |
| `requirements` | no | The distiller's requirement ids the row covers (`req-004`), from `distil/requirements.json` |
| `openQuestions` | no | What is still undecided. A `blocked` row must have at least one |
| `notes` | no | Anything a builder should know that is not a requirement |
| `gate` | no | A checkpoint: the loop lands this increment, then stops so a person can look before anything that depends on it |

The build loop owns `ticket`, `branch`, `commit` and `prs`, and writes them with `tim backlog set`.

### An acceptance criterion may name

- rendered copy, options and error text;
- a route, only when another service links to it;
- a stored or published document shape, only when another system reads it;
- a GOV.UK component, only when a design source mandates it.

### An acceptance criterion must not name

Files, functions, classes, annotations, test file names, CSS classes or commands. `tim backlog check` refuses the
recipe fields `filesToTouch`, `verification`, `recipe` and `implementorSkill`.

## Commands

```bash
tim backlog check <workarea>            # the shape, dependencies, cycles and recipe fields
tim backlog next <workarea>             # the next buildable id, or NONE
tim backlog set <workarea> <id> --status done --commit abc1234
```

`next` withholds `done`, `deferred`, `dropped`, `blocked`, `rejected` and `merged-into`, and returns the first
other row whose every dependency is `done`. An unknown status is picked up, so it is seen.
