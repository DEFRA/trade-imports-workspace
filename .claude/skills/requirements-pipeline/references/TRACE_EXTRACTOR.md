# TRACE_EXTRACTOR — one trace source → one extract file

The method for a source whose `kind` is `trace`. Read it with the distil workflow's shared extract
brief, `../workflow/distil/briefs/extract.md`: the rules there hold here too, and this file adds what
a Playwright trace needs.

A trace is a recording of a real browser session against a running service. It is the strongest
evidence there is of what a service actually does, because it holds the rendered DOM, not somebody's
account of it. It is also only ever a lower bound: a page nobody exercised leaves no trace.

A trace source is extracted in parts, like every source. The **characterise** step indexes the
corpus and cuts it into parts (step 1 below), writing `<workarea>/distil/extract/<source-slug>.partition.json`.
One **extract** agent per part then mines every trace its part names (steps 2 to 5) and writes
`<workarea>/distil/extract/<source-slug>.part<N>.json`, with `source`, `structure` and `claims` in the
shape `extract.schema.json` beside this file defines. `tim distil merge-extract` joins the parts into
the one extract. The verify step that follows treats it like any other, so nothing downstream needs
to know the source was a trace.

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
  ambiguity; the verify and reconcile steps do that.

## The trace CLI

`playwright trace` reads a trace zip without opening a browser. The workspace's
`playwright-trace` skill documents every subcommand — read it before you start.

Two things about it shape how you work:

**It is stateful.** `open` extracts one trace; every later subcommand reads whichever trace is open,
and opening another replaces it.

**It is scoped to the working directory.** `open` extracts into `.playwright-cli/` under the
directory it runs from. Each agent needs a private one, so another agent running beside you cannot
overwrite your extracted trace: the characterise step works in
`<workarea>/distil/extract/<source-slug>.work/`, and each part's extract agent and each verifier in a
sub-folder of it, `part<N>/` or `verify<N>/`.

So you never run the CLI yourself. `tim distil trace` runs it for you, with the Playwright version tim
installs, in your own folder (`--folder` names the sub-folder):

```bash
tim distil trace <workarea> --source <source id> --folder part3 --out actions.txt --workspace <workspace> --json -- actions
```

tim's own options come first, then `--`, then the subcommand and its arguments, exactly as the
`playwright-trace` skill writes them. Your prompt gives the full command. No command needs a `cd` or a
`;`, and you never run `npx` or `playwright` directly.

Output is text. `--out <file name>` writes it to that file in your working folder: do that for anything
long, then read it with the Read tool, paging with `offset`/`limit`. Without `--out`, the output comes
back in the envelope's `result.stdout`.

The commands below show only the part after `--`.

Working files under `.work/` are yours. Only the extract file is read downstream.

## Mining a corpus

### 1. Index the corpus and cut it into parts (the characterise step)

Where the corpus folder holds a Playwright `report.json`, read it first: it lists every spec file and
test, and each test's trace attachment, so it maps tests to trace zips without opening one. Open only
the traces it leaves unclear, or every trace when there is no report.

Otherwise, open each trace and record what it is. `open` prints the title as
`<spec file>:<line> › <describe> › <test name>`, along with its duration, action count, page count
and error count. A corpus can run to hundreds of zips, so make this one pass: append every trace's
metadata to a single file in your working directory, then work from that file rather than reopening
traces to remember what they were.

Select the traces the source's `scope` covers, and say in the partition's `structure` how many you
selected and how you drew the line. **Match on whole path segments and whole names, never
substrings** — where one journey's name is a prefix of another's, a substring filter silently takes
both or discards everything you wanted. State the rule you used.

Classify each selected trace:

- **core journey** — completes the thing end to end
- **validation** — exercises error states
- **variant** — a conditional branch: an upload, a copy, a split, an alternative route
- **post-submission** — what happens after the user is done
- **peripheral** — touches the journey only in passing; leave it out of every part, and say so

Then cut the selected traces into parts: the traces of one spec file, or of one group of journey
steps, about 10 to 20 traces a part. Each part's `read` names every trace zip and the test it came
from; its `covers` names the pages those tests reach and the error states they drive. Traces that
recorded errors go in the part for their spec: they are where validation messages and error states
actually rendered.

### 2. Read each trace's timeline (each part's extract agent, from here on)

Mine **every** trace your part names: `open` it and take the full action list. Do not sample the
traces, and do not sample a trace's actions.

```
-- open <locator>/<hash>.zip
-- actions            (with --out actions.txt)
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

This inventory is your part file's `structure`. Write it there: the traces you mined, the pages, their
order, and what is conditional. Do not give it a file of its own.

### 4. Mine each page

For each page in the inventory, open a pointer trace and confirm you are where you think you are:

```
-- action <id>
```

If the action turns out to be on a different page, run `actions`, find one that is on your page by
its locator or navigate URL, and use that instead. Say so in a claim — a wrong pointer is worth
knowing about.

Then take the accessibility snapshot, which gives you the page title, the headings and every control
with its accessible name:

```
-- snapshot <id> --name before
```

The accessibility tree omits hint text, `name` attributes, full option lists and hidden error
summaries. Go after those with `eval`, one Bash call each. The snapshot subcommand takes its own `--`
before `eval`, after tim's:

```
-- snapshot <id> -- eval "document.querySelector('main').innerText"
-- snapshot <id> -- eval "Array.from(document.querySelectorAll('input,select,textarea')).map(e=>e.tagName+'|'+e.type+'|'+e.name+'|'+e.id+'|'+(e.required||false)).join('\n')"
-- snapshot <id> -- eval "Array.from(document.querySelectorAll('select')).map(s=>s.name+' :: '+s.options.length+' :: '+Array.from(s.options).slice(0,40).map(o=>o.value+'='+o.text).join(' | ')).join('\n\n')"
-- snapshot <id> -- eval "Array.from(document.querySelectorAll('.govuk-hint')).map(e=>e.id+' :: '+e.innerText).join('\n')"
-- snapshot <id> -- eval "document.querySelector('.govuk-error-summary')?.innerText || 'none'"
```

Where an option list runs to hundreds — countries, commodity codes, ports — record the count and the
first twenty verbatim, say it is truncated, and treat the list as reference data rather than copy.

The accessibility tree does not show which design-system components a page uses, and for a GOV.UK
service that is load-bearing: it says what the rebuild can do inside the govuk-frontend toolbox and
where the old service went outside it. Read it from the classes:

```
-- snapshot <id> -- eval "Array.from(new Set(Array.from(document.querySelectorAll('main [class]')).flatMap(e=>Array.from(e.classList)))).sort().join('\n')"
-- snapshot <id> -- eval "Array.from(new Set(Array.from(document.querySelectorAll('main [class]')).flatMap(e=>Array.from(e.classList)).filter(c=>!c.startsWith('govuk-')))).sort().join('\n')"
```

Map each root class to its component — `govuk-radios` to Radios, `govuk-date-input` to Date input,
`govuk-summary-list` to Summary list, and so on — and keep the modifiers, which carry design intent.
A page that is entirely `govuk-*` is a useful finding; say so. Every class that is not is worth a
claim: what it does, and whether a standard component could replace it.

For the page skeleton in order, read the headings, paragraphs, labels, legends, captions, buttons
and tables out of `main`. Where anything surprises you, dump the raw HTML to a file and read it:

```
-- snapshot <id> -- eval "document.querySelector('main').outerHTML" --filename=main.html
```

Where the page has an error state, `-- errors` names the actions that failed and
`-- console --errors-only` shows what the browser said. Snapshot the failing
action and read the error summary: that is the only place the real validation copy exists.

Skip the platform chrome — cookie banner, service header, phase banner, footer, skip link, account
bar. Keep the section caption, the heading, the back link and the primary button: those are the
page. Keep a page to around twenty Bash calls; if an eval errors, adjust it and move on.

### 5. Map the integrations

A journey does not stand alone. It looks values up, uploads files and hands its result onward, and
the rebuild needs to know what it touches. The network log says what actually went over the wire:

```
-- requests           (with --out requests.txt)
-- request <id>
```

`requests` takes `--grep <pattern>`, `--method` and `--failed`; let the CLI narrow the log rather
than post-processing it.

Read the network log of every core-journey and variant trace in your part. Ignore static assets and
telemetry; you want the data calls. For each system, record what the journey needs it for, which pages depend on it, the
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

The characterise step cuts the pages the source's `scope` names into parts, in the order
`journey-spec.json` gives. Each part's agent reads every page file its part names, in full, and writes
its `structure` from them. `backlog.json`, `backlog.md` and `target-model.md` are **not** sources: they
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

Ids take the part's prefix your prompt gives, such as `trace-ched-pp-p3-001`, so no two parts or
sources clash.

`ref` is the pointer somebody else can follow to check you:

- from a corpus: `trace <hash> action <id>`, or `trace <hash> request <id>` for an integration
- from an already-mined set: `pages/<slug>.json fields[<label>]`, or the file and key you read

`quote` is the rendered text itself — the label, the hint, the option, the error message. That is
where a page's detail lives, and it is why the extract needs no richer file of its own.

## Done means

- The partition's `structure` says what the corpus or set held, what was taken from it, and how the
  scope line was drawn. Each part's `structure` says which traces or pages it mined.
- Every trace a part names was opened and mined: none sampled.
- Every page in scope has a claim, and every field on it has one. A page or field seen in a part's
  traces and not claimed is a defect.
- Every claim carries a `ref` somebody can follow and a `quote` you did not paraphrase.
- Uncovered surface is written down as a `gap`, not left out.
- No credential appears anywhere in the file.
