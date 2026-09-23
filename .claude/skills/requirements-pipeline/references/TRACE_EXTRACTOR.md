# TRACE_EXTRACTOR — one trace source → one extract file

The method for a source whose `kind` is `trace`. Read it with `SOURCE_EXTRACTOR.md`, which covers
documents, Confluence pages, images and repos: the ground rules there hold here too, and this file
adds what a Playwright trace needs.

A trace is a recording of a real browser session against a running service. It is the strongest
evidence there is of what a service actually does, because it holds the rendered DOM, not somebody's
account of it. It is also only ever a lower bound: a page nobody exercised leaves no trace.

Your output is the same as every other extractor's — `<workarea>/distil/extract/<source-slug>.json`,
with `source`, `structure` and `claims` in the shape DISTIL step 1 defines. The verify step that
follows treats your extract like any other, so nothing downstream needs to know the source was a
trace.

## Two input shapes

Read the source's `locator` in `sources.json` and `ls` it. It is one of two things:

| What you see | What it is | What you do |
|---|---|---|
| `.zip` files | A trace corpus | Mine it: the five steps below |
| A `pages/` directory | A set someone has already mined | Read the per-page specs as they stand |

Four already-mined sets live under `workareas/trace-requirements/`: `ched-p`, `ched-pp`, `ched-d`
and `iuu`. **The raw corpora they were mined from are no longer on disk**, so re-mining them is not
possible. Their per-page specs are the evidence; read them as the record of what the traces showed.

## Ground rules

- **Verbatim or nothing.** Copy every heading, label, hint, option and error message exactly as
  rendered, including capitalisation and trailing punctuation. Do not tidy it. If you did not see
  it, do not write it.
- **Confidence maps straight across.** Rendered text you read in a snapshot is `verbatim`. Something
  you deduced — from a control you saw but no test drove, from a pattern across pages — is
  `inferred`, and the statement says why. Something the source should show and does not is `gap`.
- **Uncovered surface is a finding.** Where the corpus never reaches a page, a field or an error
  state you have reason to believe exists, write a `gap` claim saying so. Silence is not evidence of
  absence, and the reconciler can only weigh what you record.
- **Traces carry secrets.** A `fill` value can be a password or a token. Write `[REDACTED]` in place
  of anything credential-shaped, and never copy one into a claim.
- **Record what the source shows.** Do not reconcile with other sources and do not resolve
  ambiguity; DISTIL steps 2 and 3 do that.

## The trace CLI

`npx playwright trace` reads a trace zip without opening a browser. The workspace's
`playwright-trace` skill documents every subcommand — read it before you start. Run it as
`npx --package @playwright/test playwright trace …` so npx resolves the scoped package; the commands
below are written in the short form for readability.

Two things about it shape how you work:

**It is stateful.** `open` extracts one trace; every later subcommand reads whichever trace is open,
and opening another replaces it.

**It is scoped to the working directory.** `open` extracts into `.playwright-cli/` under the
directory you run it from. Make yourself a private one — `<workarea>/distil/extract/<source-slug>.work/`
— so a second trace source running beside you cannot overwrite your extracted trace.

Your working directory resets between Bash calls, so each trace command carries its own:

```bash
cd <workarea>/distil/extract/<source-slug>.work; npx playwright trace actions > actions.txt
```

One call, a semicolon, never `&&`. **This is the only command that may carry a `cd`** — every other
command you run keeps the rails you were given.

Output is text, not JSON. Redirect anything long to a file in your working directory and read it
with the Read tool, paging with `offset`/`limit`, rather than slicing it through repeated Bash calls.

Working files under `.work/` are yours. Only the extract file is read downstream.

## Mining a corpus

### 1. Index the corpus

Open each trace and record what it is. `open` prints the title as
`<spec file>:<line> › <describe> › <test name>`, along with its duration, action count, page count
and error count. A corpus can run to hundreds of zips, so make this one pass: append every trace's
metadata to a single file in your working directory, then work from that file rather than reopening
traces to remember what they were.

Select the traces the source's `scope` covers, and say in your `structure` how many you selected and
how you drew the line. **Match on whole path segments and whole names, never substrings** — where
one journey's name is a prefix of another's, a substring filter silently takes both or discards
everything you wanted. State the rule you used.

Classify each selected trace, so later steps mine the richest first:

- **core journey** — completes the thing end to end
- **validation** — exercises error states
- **variant** — a conditional branch: an upload, a copy, a split, an alternative route
- **post-submission** — what happens after the user is done
- **peripheral** — touches the journey only in passing; do not mine it

Traces that recorded errors are worth more than their number suggests: they are where validation
messages and error states actually rendered. Mine them for that copy.

### 2. Read each trace's timeline

For each trace worth mining, `open` it and take the full action list. Do not sample it.

```bash
cd <your .work dir>; npx playwright trace open <locator>/<hash>.zip
cd <your .work dir>; npx playwright trace actions > actions.txt
```

Transcribe every action: the kind (navigate, click, check, fill, select, assert), the verbatim
locator, and the literal value entered. **The accessible name inside a locator is the on-screen
label** — it is the most valuable token in the file. Ignore test-harness noise (before and after
hooks, fixture and context creation), but always keep `Navigate to`.

Then group consecutive actions into pages. A new page starts at a navigate, or after the click that
submits the one before. Name each page from its heading where you can see one, otherwise from the
URL path, and record the first and last action id on it — the next step needs an action id to
snapshot.

### 3. Build the page inventory

Merge every trace's pages into one distinct set. The same page appears across traces under slightly
different names; collapse them on URL pattern plus heading. Give each a stable kebab-case slug, work
out its position in the linear journey, and say whether it always appears or only under a condition.

For each page pick one to three snapshot pointers: a trace hash and an action id that happened
**on** that page. Choose an action in the middle of the page's range — the last action is usually
the click that navigates away. Prefer a core-journey trace with a high action count.

This inventory is your extract's `structure`. Write it there: the pages, their order, and what is
conditional. Do not give it a file of its own.

### 4. Mine each page

For each page in the inventory, open a pointer trace and confirm you are where you think you are:

```bash
cd <your .work dir>; npx playwright trace action <id>
```

If the action turns out to be on a different page, run `actions`, find one that is on your page by
its locator or navigate URL, and use that instead. Say so in a claim — a wrong pointer is worth
knowing about.

Then take the accessibility snapshot, which gives you the page title, the headings and every control
with its accessible name:

```bash
cd <your .work dir>; npx playwright trace snapshot <id> --name before
```

The accessibility tree omits hint text, `name` attributes, full option lists and hidden error
summaries. Go after those with `eval`, one Bash call each. Every `eval` in this step carries the same
`cd` prefix as the two commands above; it is left off below so the evals read:

```bash
npx playwright trace snapshot <id> -- eval "document.querySelector('main').innerText"
npx playwright trace snapshot <id> -- eval "Array.from(document.querySelectorAll('input,select,textarea')).map(e=>e.tagName+'|'+e.type+'|'+e.name+'|'+e.id+'|'+(e.required||false)).join('\n')"
npx playwright trace snapshot <id> -- eval "Array.from(document.querySelectorAll('select')).map(s=>s.name+' :: '+s.options.length+' :: '+Array.from(s.options).slice(0,40).map(o=>o.value+'='+o.text).join(' | ')).join('\n\n')"
npx playwright trace snapshot <id> -- eval "Array.from(document.querySelectorAll('.govuk-hint')).map(e=>e.id+' :: '+e.innerText).join('\n')"
npx playwright trace snapshot <id> -- eval "document.querySelector('.govuk-error-summary')?.innerText || 'none'"
```

Where an option list runs to hundreds — countries, commodity codes, ports — record the count and the
first twenty verbatim, say it is truncated, and treat the list as reference data rather than copy.

The accessibility tree does not show which design-system components a page uses, and for a GOV.UK
service that is load-bearing: it says what the rebuild can do inside the govuk-frontend toolbox and
where the old service went outside it. Read it from the classes:

```bash
npx playwright trace snapshot <id> -- eval "Array.from(new Set(Array.from(document.querySelectorAll('main [class]')).flatMap(e=>Array.from(e.classList)))).sort().join('\n')"
npx playwright trace snapshot <id> -- eval "Array.from(new Set(Array.from(document.querySelectorAll('main [class]')).flatMap(e=>Array.from(e.classList)).filter(c=>!c.startsWith('govuk-')))).sort().join('\n')"
```

Map each root class to its component — `govuk-radios` to Radios, `govuk-date-input` to Date input,
`govuk-summary-list` to Summary list, and so on — and keep the modifiers, which carry design intent.
A page that is entirely `govuk-*` is a useful finding; say so. Every class that is not is worth a
claim: what it does, and whether a standard component could replace it.

For the page skeleton in order, read the headings, paragraphs, labels, legends, captions, buttons
and tables out of `main`. Where anything surprises you, dump the raw HTML to a file and read it:

```bash
npx playwright trace snapshot <id> -- eval "document.querySelector('main').outerHTML" --filename=main.html
```

Where the page has an error state, `npx playwright trace errors` names the actions that failed and
`npx playwright trace console --errors-only` shows what the browser said. Snapshot the failing
action and read the error summary: that is the only place the real validation copy exists.

Skip the platform chrome — cookie banner, service header, phase banner, footer, skip link, account
bar. Keep the section caption, the heading, the back link and the primary button: those are the
page. Keep a page to around twenty Bash calls; if an eval errors, adjust it and move on.

### 5. Map the integrations

A journey does not stand alone. It looks values up, uploads files and hands its result onward, and
the rebuild needs to know what it touches. The network log says what actually went over the wire:

```bash
cd <your .work dir>; npx playwright trace requests > requests.txt
cd <your .work dir>; npx playwright trace request <id>
```

`requests` takes `--grep <pattern>`, `--method` and `--failed`; let the CLI narrow the log rather
than post-processing it.

Take three to five of the richest core-journey traces. Ignore static assets and telemetry; you want
the data calls. For each system, record what the journey needs it for, which pages depend on it, the
call shape — protocol, method, path, request and response — and a real example where you captured
one. Record each reference-data list separately: what it holds, roughly how big it is, and which
pages read it.

A call you saw in the network log is `verbatim`. A system you have reason to believe exists but never
saw fire is a `gap`.

## Reading an already-mined set

The set's own files are your source. Take only what survived its verification: its verifier wrote
corrections back into `pages/*.json`, and a set that also carries `verify-verdicts.json` records
which pages it faulted — read that first and discount those pages accordingly.

| File | What it gives you |
|---|---|
| `pages/<slug>.json` | Per page: heading, caption, body copy, back link and button label; every field with its label, hint, control, options and validation; the components used and anything non-standard; the page skeleton |
| `journey-spec.json` | The pages in journey order, and what is conditional |
| `conflicts.json` | Disagreements the set recorded but did not settle |
| `integrations.md` | External systems and reference-data lists |

Read the pages the source's `scope` names, and its `journey-spec.json` for the order, and write your
`structure` from them. `backlog.json`, `backlog.md` and `target-model.md` are **not** sources: they
are an earlier distillation of the same evidence, and taking claims from them would launder somebody
else's judgement into yours.

Each page spec already tags its own confidence as `confirmed`, `inferred` or `gap`. Carry it across:
`confirmed` becomes `verbatim`, and the other two keep their names.

## Turning what you found into claims

One claim per observable fact — something a user, an operator or another system can observe. Never a
file, a class or a function.

| What you found | `kind` | The claim says |
|---|---|---|
| A page in the journey | `behaviour` | Who reaches it, when, and what it asks for |
| A field on a page | `data` | What the user gives, and whether they must |
| An option list | `data` | What they can choose from, or that it comes from reference data |
| A validation message | `rule` | What makes it fire, with the message verbatim in `quote` |
| A heading, caption or button label | `copy` | The words the page uses, where they carry meaning |
| A conditional page or field | `rule` | What has to be true for it to appear |
| An outbound call | `integration` | What the journey needs the other system for |
| A pattern outside the design system | `constraint` | What it does, and what would replace it |
| Surface the corpus never reached | any, `confidence: "gap"` | What you expected to find and did not |

Ids run `trace-001` onwards. Where a run has more than one trace source, prefix them from the source
id so the reconciler can tell them apart.

`ref` is the pointer somebody else can follow to check you:

- from a corpus: `trace <hash> action <id>`, or `trace <hash> request <id>` for an integration
- from an already-mined set: `pages/<slug>.json fields[<label>]`, or the file and key you read

`quote` is the rendered text itself — the label, the hint, the option, the error message. That is
where a page's detail lives, and it is why the extract needs no richer file of its own.

## Done means

- `structure` says what the corpus or set held, what you took from it, and how you drew the scope
  line.
- Every page in scope has a claim, and every field on it has one.
- Every claim carries a `ref` somebody can follow and a `quote` you did not paraphrase.
- Uncovered surface is written down as a `gap`, not left out.
- No credential appears anywhere in the file.
