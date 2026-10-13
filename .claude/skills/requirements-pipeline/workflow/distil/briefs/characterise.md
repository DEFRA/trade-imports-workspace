# Characterise: cut one source into parts

You characterise **one** source and write **one** file: its partition. You write no claims. Your prompt names the
source, the file, the prefixes and the check command.

After you, one extract agent per part reads its part **in full** and claims **everything** in it, side by side with
the others. `tim distil merge-extract` then joins the parts into the one extract the rest of the pipeline reads. So
the depth of the whole run is set here. A part too big for one agent to read word for word comes back thin, and a
thin extract caps everything downstream: a page, field or rule nobody claimed never reaches a requirement.

The file's shape is defined, field by field, in
`.claude/skills/requirements-pipeline/references/partition.schema.json`. Read it before you write.

## What you do

1. Read the source's entry in `sources.json`. Its `scope` says what the parts must cover, and its `role` what the
   source is authoritative for.
2. Survey the whole scoped source, cheaply: list it, count it, read its headings, indexes and routes. Read enough to
   know its shape. Do not extract it: the part agents do that.
3. Write `structure`: what the source is, how it is laid out, how big each piece is, and what the scope leaves out.
   It heads the merged extract's structure, so the reconciler reads it to learn how much of the source the extract
   covers.
4. Cut the scoped source into parts, using the rules below for its kind. Together the parts cover everything in
   scope, with no gaps and no overlaps.
5. For each part write: `part` (1, 2, 3 and on), `title`, `scope` (where the slice starts and stops), `read` (every
   file, folder, page, section or trace the part's agent reads in full, precise enough to open) and `covers` (what it
   must claim, named or counted, such as "the 6 views in views/origin/: every heading, field, hint, option and error
   message" or "the 14 traces of tests/plants/origin.spec.ts"). `covers` is how the part agent knows what complete
   means, so name things rather than gesture at them.
6. Give part N the prefix your prompt names.
7. On a re-extract, your prompt asks you to share out the existing extract's claim ids as `keeps`. Give each old id
   to the one part whose slice holds its `ref`.
8. Run the check command, fix every problem it names, and check again until it passes.

## How big a part is

A part is as much as one agent can read **every word of** and still claim exhaustively: every page, field, option,
hint, error, rule and branch in it. As a guide:

- about 3,000 lines of code or template, or 6 to 10 views or pages with their routes and validation;
- about 15 to 25 pages of a document, or 3 to 5 sections of a long Confluence page with their tables;
- about 10 to 20 traces of one journey, or the traces of one spec file, mined in full;
- about 5 to 10 images.

Cut along the source's own seams, never mid-page or mid-section. A small source is one part. A big one may be 10 or
20 parts: never merge two slices to keep the count down. When one file is bigger than a part, such as a long
`routes.js`, give each part the whole file in `read` and the routes that belong to its pages in `scope` and `covers`,
so the file is read in full where it matters and each route is claimed once.

## Cutting each kind of source

| Kind | One part is | `read` names |
|---|---|---|
| `repo`, a service or prototype | One feature folder, journey section or group of related pages: its views, controllers, routes, validation and copy. Shared config, such as routes, navigation or a rulings ledger, is its own part, or goes to the part that owns it | Every folder and file, by path from the repo root |
| `repo`, the tests repo | One spec folder or a few spec files for one journey, with the page objects and fixtures they use | Every spec, page object and fixture file |
| `trace`, a corpus of zips | The traces of one spec file, or one journey step group, after you have indexed the corpus | Every trace zip by file name, and the spec file and test titles they came from |
| `trace`, an already-mined set | A run of `pages/*.json` files in journey order, plus `integrations.md` as a part of its own | Every page file |
| `confluence` | A run of consecutive sections, cut on its headings, with every table in them | Each section heading, as the page writes it |
| `document` | A run of consecutive sections or pages | Each heading, or the page range |
| `web` | One page, or a few short pages that belong together | Each URL |
| `image` | A run of consecutive images, in name order | Each file name |
| `ruling` | Almost always one part: the whole file | The file |

### A trace corpus

Index it before you cut it: open each trace once with the trace CLI your prompt gives, and record its title
(`<spec file>:<line> › <describe> › <test name>`), action count and error count in one file in your working folder.
Where the corpus folder holds a Playwright `report.json`, read it first: it maps every test to its trace attachment,
so it is the index, and you open only what it leaves unclear. Then cut by spec file, or by the journey steps the
tests cover. Each part's `read` names its trace zips **and** their test titles, so the part agent reads every one of
them, not a sample. Traces with errors go in the part for their spec: they hold the validation copy.

### A prototype or service repo

Cut by what a user sees: a part is a group of pages, never a layer. Name the views, the controllers or route
handlers, the validation and the copy for those pages in `read`, and in `covers` name each page and say "every
heading, field, label, hint, option, error message, conditional branch and link". A large shared routes or
navigation file goes in `read` for every part whose pages it routes.

## Finishing

1. Write the whole file with the Write tool, at the absolute path your prompt gives. Keep `parts` last.
2. Run the check command your prompt gives. It exits 1 and names every problem. Fix each one and check again until it
   passes.
3. Answer with the structured output your prompt asks for: how many parts, a line on the structure you found and how
   you cut it, and every decision you made along the way.
