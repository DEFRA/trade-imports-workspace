# The backlog shape

[`backlog.schema.json`](backlog.schema.json) defines the fields of `workareas/<workarea>/backlog.json`: the envelope,
the row, what each field means, which are required, the statuses, and the recipe fields a row may not carry. Every
field has a `description` there. Read it for the fields; this file keeps only the rules a schema cannot check.

`tim backlog check <workarea>` validates a backlog against that schema, then checks what a schema cannot: every
`dependsOn` id is in the backlog, no row depends on itself, there is no cycle, no id appears twice, and every repo a
row's `merge` names is in the row's `repos` and in the envelope's.

## Rows for the branch lifecycle

A backlog built onto an existing branch (the build loop's `lifecycle: 'branch'`, see [`BUILD.md`](BUILD.md#branch-lifecycle))
may use three more row fields: `merge`, `gatePhases` and `awaitCi`. They say what the loop must do around the row,
never how to write the change, so they are not recipe fields.

- A merge row is still a requirement. Its acceptance says what is true once the ref is in: what survived, what now
  behaves as the ref does. How each conflict is resolved belongs in the plan, or in a resolutions file the row's
  `notes` point at, never in the row.
- A row with `repos: []` changes no backlog repo, only the workspace repo. It is for work such as rewriting a report
  under `workareas/`, and normally sets `gatePhases: []`.
- A row whose acceptance is pull request text or state (a title, a body, lifting a draft) cannot be built by the
  loop, which never touches a pull request. Give it a withheld status and do it by hand.

## A row is a requirement, never a recipe

A row says what, why and acceptance. The build loop's plan stage works out the how against the live tree, just in
time, and writes it to `workareas/<workarea>/plans/<id>.md`.

## A row is a full-stack slice, never a layer

A row covers every repo the behaviour needs, and its acceptance can be observed once it lands. It is never "the
backend half of X" or "the tests for X". A row whose acceptance can only be observed once another row in a different
repo lands is a layer split, and is wrong. `dependsOn` is a real ordering need, not a layer order.

## An acceptance criterion may name

- rendered copy, options and error text;
- a route, only when another service links to it;
- a stored or published document shape, only when another system reads it;
- a GOV.UK component, only when a design source mandates it.

## An acceptance criterion must not name

Files, functions, classes, annotations, test file names, CSS classes or commands.

## Provenance

Each acceptance criterion ends with where it came from, in brackets: the source id, then the place in it, such as
`(confluence:6518997274 §Notification data; trace:ched-pp pages/country-of-origin.json fields[0])`. A row's `sources`
list the same sources as `{ "source": "<source id>", "ref": "<place>" }`, and `requirements` names the distiller's
requirement ids it covers.
