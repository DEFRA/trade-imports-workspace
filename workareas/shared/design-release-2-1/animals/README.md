# The live animals copies of the tracking pages

The same two pages as [`../combined/`](../combined/README.md), over the live animals journey and the work shared with
it. Nothing here is a second version of either page: both run the generator and the renderer from `combined/`, and the
only file that differs is each page's `build/scope.json`.

| Page | Link | Source here |
|---|---|---|
| Animals work by theme | https://claude.ai/code/artifact/846e4fb9-ebe0-49d0-a7f9-00bd1d89badf | `progress-page/` |
| Animals theme build order | https://claude.ai/code/artifact/61aaf990-8a86-4d61-9bd9-5e623cd7ee92 | `build-order-page/` |

The whole-programme pair stays where it was: [work by
theme](https://claude.ai/code/artifact/466c571f-880f-478e-971e-dbf10c53b7d5) and [build
order](https://claude.ai/code/artifact/f7f85b51-6974-4096-acd1-66bec1171457).

## What counts as animals

A row is on these pages when it changes the animals frontend or the animals backend (`frontend`, `backend` in a
backlog row's `repos`), or when it changes no journey frontend at all. The second half is what makes shared work
communal: a row that only touches the tests repo, the stub, reference data or the address book API serves every
journey that depends on it, so every journey copy shows it. A row whose only journey frontend is high-risk plants or
the INS front door is not here, even inside a theme that is.

That leaves out 40 of the 220 rows. One theme goes entirely — INS dashboard, all 8 rows. The address book loses 22 of
its 24, its pages being INS front-door pages; the two that stay are the journey-mode add page the animals journey
opens and the record change behind it. Nine more themes lose a row or two each.

A row left out still has to be built. It is on the whole-programme pages, and it will be on the copy for the journey
that owns it.

Levels, dependency lines and the ready markers are recomputed over what is left, so a theme can sit higher here than
it does on the whole-programme page, and a theme can read as ready here while the whole-programme page still shows it
waiting on a plants or INS row.

## Refresh

Same two steps as `combined/`, in each page's own `build/`:

```bash
npm run build   # writes data.js, and index.html from the whole-programme markup with this page's title
npm run check   # runs the page's own renderer against the new data
```

`npm run build` writes `index.html` here as well as `data.js`. It is a copy of the whole-programme page's markup with
the title swapped, so **do not edit `index.html` in this folder** — edit the one under `combined/` and rebuild, or the
change is lost on the next run. The pages read `data.scope` at run time for everything else they say about being a
slice.

Then republish each page passing its artifact URL above, with `data.js` as a supporting file.

## Adding another journey

Copy either `build/` directory, change `scope.json`, and run the two scripts. For high-risk plants that is `repos`
`["plantsfrontend", "plantsbackend"]` and `excludes` naming animals and the INS front door; for the front door,
`["insfrontend", "insbackend"]` excluding animals and plants. Nothing else needs writing: the generator reads the
theme names, editorial copy, pull request states and delivery branches from `combined/`, so a new journey copy starts
out agreeing with the others.

Keep the two `scope.json` files in a journey folder identical apart from `title`, or that journey's two pages will
disagree with each other.
