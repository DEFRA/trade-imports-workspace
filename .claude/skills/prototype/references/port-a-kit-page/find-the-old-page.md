# Finding the old page when the designer only names it

Designers often say "port the transporter page from the old prototype" and
attach nothing. The old prototype is the GOV.UK Prototype Kit repository
`defra-design/GB-notification-service` on GitHub. Find its source yourself
with `designer:kit`; ask only if it finds nothing.

`designer:kit` works from any folder (it is an npm script in the prototype
repo), prints a few lines, and never searches the whole disk: it looks beside
the prototype and a few folders down in the usual code folders of the home
folder, and skips folders it cannot read.

## 1. Find a clone

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:kit -- find
```

It prints the clone it will use (the one changed most recently, or the one
remembered from last time) and the current design folder.

If it finds nothing, ask the designer once: "Where is your copy of the old GB
notification prototype? A folder path, or I can use a page you paste in or a
screenshot." Then give it the path, which it remembers for next time:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:kit -- find --clone <the folder>
```

Never clone the old prototype yourself without asking: it is a separate
repository.

## 2. Pick the page

The old prototype keeps several copies of most pages:

| Folder under `app/views/`      | What it is                                                         |
| ------------------------------- | -------------------------------------------------------------------- |
| `design-release-2.1/`          | The current design at the time of writing: `find` names the newest |
| `design-release-2/`            | The previous release, kept as a record                             |
| `testing/`                     | Pages set up for user research rounds                              |
| top level (`transporter.html`) | The oldest version, from before the design releases                |

`designer:kit` picks the design-release folder that changed most recently.
List its pages to match the designer's name ("the transporter page" is
`transporter`, its add form `transporter-add`, with `-commercial` and
`-private` variants):

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:kit -- pages
```

If the designer says "the DR2 version" or "the one from research", add
`--folder design-release-2` or `--folder testing` to `pages` and `copy`.

## 3. Copy the page and what it pulls in

One command copies the page to the port's working folder, with every partial
it includes (and theirs):

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:kit -- copy <page> --release <release-id> --slug <new-slug>
```

It writes
`~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/.cache/designer/port/<release-id>/<new-slug>/source.html`
and the partials under `included/` beside it, and prints the paths. Never
retype a page with the Write tool. Pass `source.html` to the workflow as
`source` with `sourceKind: "html"`, and read the partials it lists with the
Read tool.

Add `--saved` when the clone may have unsaved edits: it copies the last saved
(committed) version instead.

A page also takes things from outside its folder that `copy` does not follow:

- option lists and data: `app/data/` and `app/routes.js` in the clone (search
  them for the page's field names with `grep -rn`)
- its layout: `app/views/layouts/main.html`

## 4. Words from another service

The old prototype is for live animals as well as plants. Before porting its
words, read them for anything that names another commodity (animals,
livestock, animal welfare, journey logs) or links to an animal-only page. List
each one in the port's report and ask the designer one question: keep it,
reword it for plants, or leave it out. Until they answer, port it as it is
and log it in the fidelity table as "words from the animals journey".

## 5. Running the old prototype to see a page

Only when the source and a screenshot are not enough. In the clone:

- Start it with the clone's `dev` script, never its `serve` or `start`
  script. Those run in production mode, which redirects to https and sets secure-only cookies,
  so the page fails on plain `http://localhost` and answers are not kept.
- Create `usage-data-config.json` before the first start, or the Kit waits for
  an answer to its usage-data question and never finishes starting.
- The MCP browser switches `localhost` to https, so it cannot open the Kit.
  Drive it with a Playwright script run by `@playwright/test`, which uses its
  own browser. Wait for the port to accept connections, not for an HTTP
  answer.
- Run one browser at a time (`workers: 1`). The Kit's dev server mixes up
  answers between parallel sessions and drops a page's data without an error.
- The MOJ date picker stays open after you fill the date. Press Escape before
  the next field, or its calendar covers it.
