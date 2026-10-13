# The backlog shape

[`backlog.schema.json`](backlog.schema.json) defines the fields of `workareas/<workarea>/backlog.json`: the envelope,
the row, what each field means, which are required, the statuses, and the recipe fields a row may not carry. Every
field has a `description` there. Read it for the fields; this file keeps only the rules a schema cannot check.

`tim backlog check <workarea>` validates a backlog against that schema, then checks what a schema cannot: every
`dependsOn` id is in the backlog, no row depends on itself, there is no cycle, no id appears twice, every repo a
row's `merge` names is in the row's `repos` and in the envelope's, the theme rules below hold, the rules for a theme
split off early hold, and every `externalDependsOn` names a row that its workarea's backlog has.

## Themes

A backlog may group its rows into `themes`, so each theme builds on its own machine and its own branch at the same
time as the others. DISTIL writes them when `sources.json` has a `themes` rule. `tim backlog split` then writes one
backlog per theme.

- **A theme's boundary is drawn by the code it touches.** Its `touches` names the code areas it owns, as
  `<repoKey>:<path prefix>`. Its `why` gives the evidence: which requirements change that code. Two themes never
  touch the same path, or one inside the other, in the same repo: overlapping code means conflicting pull requests.
  Name the narrowest folder the rows change, never a whole repo another theme also builds in.
- **Boundaries are drawn at feature-folder granularity.** Where a repo's feature folders are independent by design
  (each page or feature its own folder), they are separate code areas: several themes can build in one app at once,
  each owning a few folders. Group rows by the folders they actually change, never by the app they live in.
- **Shared code goes in a foundation theme in an early wave.** A file several themes would change (a journey's
  flow, the layout, shared copy, a shared component) belongs to one small foundation theme that makes the shared
  change once. The feature themes depend on it and land in the next wave, in parallel.
- **A theme holding most of the rows is a smell.** It means the boundary followed a repo or a shared file rather
  than the code each row owns. Redraw it, or say in its `why` why it cannot split. The aim is several themes that
  genuinely build in parallel.
- **A row belongs to exactly one theme.** Every `todo` or `blocked` row names it in `theme`, and builds only in
  repos its theme touches. A row built or set aside may have no theme.
- **A cross-theme dependency is a real ordering need.** A row may depend on a row in another theme only when it
  cannot be built before that row lands. Its theme then depends on that theme, directly or through another. Each
  one makes a theme wait for another machine, so prefer a boundary that needs none.
- **Themes land in waves.** A theme lands after every theme it depends on. Themes with no ordering need between
  them land in the same wave, in parallel. `tim backlog split` writes the order to `themes/themes.json`.
- **A theme id is stable once its rows are built.** The split's workarea and branch are named by it. On a
  re-distil, keep each row's theme unless the requirements behind it moved to another theme's code. A row built or
  set aside never changes theme.

A split backlog, at `workareas/<workarea>/themes/<theme id>/backlog.json`, has `theme`, `branch`, `parent` and
`touches` in its envelope instead of `themes`, and only its theme's rows. A `dependsOn` on another theme's row
becomes an `externalDependsOn` on that theme's split workarea; one on a row in no theme points at the parent. Never
edit a split backlog's rows by hand: re-distil the parent and split again. A theme split off early is the
exception: its parent no longer has its rows, so its own backlog is where they change.

## A theme split off early

`tim backlog split <workarea> --theme <id> --write` moves one ready theme out of a backlog that is still being ruled
on (see [`DISTIL.md`](DISTIL.md#8-splitting-a-theme-off-early)). Its split backlog is the only copy of its rows. The
parent keeps one pointer per such theme in `splitOff`, and `tim backlog check` holds it to these rules:

- **A theme split off is never also in `themes`,** and is split off once.
- **No row in the parent is in a split-off theme,** and none reuses the id of a row that moved.
- **No theme left in `themes` touches a split-off theme's code.** Its `touches` still count for overlap.
- **A theme left may depend on a split-off theme,** and lands after it.
- **Every theme a pointer's `dependsOn` names is still in `themes` or `splitOff`,** under the same id. A theme it
  depends on is never renamed or removed, built or not.
- **`increments` lists every row that moved,** dropped, rejected and merged rows too, so no row reuses their ids.
  `requirements` lists only what the covering rows (`todo`, `blocked`, `done`, `deferred`) covered.
- **No requirement is held by two split-off themes.**
- **A row left that waited on a moved row waits through `externalDependsOn`** on the split workarea, never
  `dependsOn`. A moved row that waited on a row left in the parent has an `externalDependsOn` on the parent's
  workarea; `tim backlog next` follows it into that row's own theme split once there is one.
- **The pointer is fixed once written, except `pickUp`.** A re-distil carries it over and may only add to
  `pickUp` the requirements adopted later that fall in the theme's `touches`. Never draft a row for a requirement
  a pointer holds.

`tim distil coverage` counts every requirement a pointer holds, in `requirements` or `pickUp`, as covered by the
split backlog, and refuses a row in the parent that covers one.

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
