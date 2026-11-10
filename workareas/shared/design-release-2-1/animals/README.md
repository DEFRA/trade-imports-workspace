# The live animals pages

Three pages over the live animals journey and the work shared with it. Two of them are the tracking pages from
[`../combined/`](../combined/README.md) read over a smaller set of rows: nothing here is a second version of either,
both run the generator and the renderer from `combined/`, and the only file that differs is each page's
`build/scope.json`. The third is the journey map, which only exists per journey — its generator and markup live under
`combined/journey-map-page/` and its journey lives here.

| Page | Link | Source here | Favicon |
|---|---|---|---|
| Animals work by theme | https://claude.ai/code/artifact/846e4fb9-ebe0-49d0-a7f9-00bd1d89badf | `progress-page/` | 📋 |
| Animals theme build order | https://claude.ai/code/artifact/61aaf990-8a86-4d61-9bd9-5e623cd7ee92 | `build-order-page/` | 🧭 |
| Animals Journey Page Map | https://claude.ai/code/artifact/9add006f-18c8-40e8-bdba-138b22bb5d90 | `journey-map-page/` | 🗺️ |

The whole-programme pair stays where it was: [work by
theme](https://claude.ai/code/artifact/466c571f-880f-478e-971e-dbf10c53b7d5) and [build
order](https://claude.ai/code/artifact/f7f85b51-6974-4096-acd1-66bec1171457). There is no whole-programme journey map:
a journey map is a journey's own pages, so it comes one per journey and nothing else.

## What counts as animals

A row is on these pages when it changes the animals frontend or the animals backend (`frontend`, `backend` in a
backlog row's `repos`), or when it changes no journey frontend at all. The second half is what makes shared work
communal: a row that only touches the tests repo, the stub, reference data or the address book API serves every
journey that depends on it, so every journey copy shows it. A row whose only journey frontend is high-risk plants or
the INS front door is not here, even inside a theme that is.

A row left out still has to be built. It is on the whole-programme pages, and it will be on the copy for the journey
that owns it.

Levels, dependency lines and the ready markers are recomputed over what is left, so a theme can sit higher here than
it does on the whole-programme page, and a theme can read as ready here while the whole-programme page still shows it
waiting on a plants or INS row. The journey map's counts are recomputed the same way, which is why its "themes that
change no live animals page" section can be empty: the scope has already taken those themes out.

## Refresh

The same two steps for all three, in each page's own `build/`:

```bash
npm run build   # writes data.js, and index.html from the shared markup with this page's title
npm run check   # runs the page's own renderer against the new data
```

For the progress page, run `npm run prs` in `../../../combined/progress-page/build/` first whenever the pull requests
may have moved.

`npm run build` writes `index.html` here as well as `data.js`. It is a copy of the shared markup with the title
swapped, so **do not edit `index.html` in these folders** — edit the one under `combined/` and rebuild, or the change
is lost on the next run. The pages read `data.scope` at run time for everything else they say about being a slice.

Then republish each page passing its artifact URL above, with `data.js` as a supporting file and the favicon from the
table — a changed favicon reads as a different page to anyone who keeps the tab open.

## The journey map's own input

The two tracking pages need nothing here but `scope.json`. The journey map needs one more file,
`journey-map-page/build/journey.json`, because no backlog records what a trader walks. It holds:

- **the bands and the pages in them** — each page's name, the URL path a trader sees, and the folders the page is made
  of: its feature folder, its obligation section and the services behind it;
- **the pages Design Release 2.1 adds**, in the same shape, with the sentence each card reads;
- **claims** — one sentence per theme that reaches no page at all, saying what it changes instead, and which section
  says it.

Everything else is derived. A theme is on a page when the theme's own declared folders and the page's folders overlap,
so adding a page is naming its folders and the themes attach themselves. Where a theme stands, how many rows it
carries, the wave it lands in, every count and the whole register come from the backlogs.

Three things stop the build rather than being guessed:

- the opening run in `journey.json` is compared against `RUN_STEPS` in the live animals frontend on `main`, so a page
  reordered, added or dropped in the code fails here instead of leaving the map describing a journey nobody takes;
- a theme that reaches no page and has no claim fails, rather than disappearing off the page;
- a path whose prefix `pathPrefixes` does not know fails, rather than matching nothing in silence.

A claim that is no longer needed — its theme now reaches a page — is dropped from the page and reported in the build
output, so the file tells you what to delete.

## Adding another journey

For the two tracking pages, copy either `build/` directory, change `scope.json`, and run the two scripts. For
high-risk plants that is `repos` `["plantsfrontend", "plantsbackend"]` and `excludes` naming animals and the INS front
door; for the front door, `["insfrontend", "insbackend"]` excluding animals and plants. Nothing else needs writing:
the generator reads the theme names, editorial copy, pull request states and delivery branches from `combined/`, so a
new journey copy starts out agreeing with the others.

For the journey map, copy `journey-map-page/build/` as well and write that journey's `journey.json`: its `set` block
pointing at that frontend's checkout, run file and features folder, its `pathPrefixes`, and its pages. The generator,
the renderer and the markup are already shared.

Keep every `scope.json` in a journey folder identical apart from `title`, or that journey's pages will disagree with
each other.
