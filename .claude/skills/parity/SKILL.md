---
name: parity
description: 'Build, check and adjudicate a findings report for a comparison corpus — today DR2.1 (EUDPA-328), 97 findings comparing the live-animals frontend against the Design release 2.1 prototype. Four modes: REPORT regenerates the page from the backlog and serves it at full resolution; WALK presents the gated findings for a batch of rulings and applies them; MIGRATE moves a finding''s prose into the six structured slots and rewrites it into plain English, under ten invariants; CAPTURE re-shoots the evidence at the pinned commits (triggers: "regenerate the parity report", "rebuild the findings report", "rule the parity decisions", "walk parity EUDPA-X", "migrate parity EUDPA-X", "recapture the parity corpus"). NOT for running the build loop over the accepted findings — that is journey-builder, which consumes the same backlog''s status/gate/dependsOn. NOT for reviewing a PR (use review).'
---

Render a backlog of findings as a decision surface, and help rule on it.

The corpus is data. Today it is one comparison — a frontend against a design
prototype — but nothing here counts to two: `tools/parity/corpora.json` holds a
`sides[]` list, and the requirements side will not always be a prototype. Read
the corpus profile; do not assume the shape.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/...`. Bash expands `~` automatically.

**Bash call hygiene** — one command per Bash call, no `&&`, no `;`, no `cd`.
Full rule table: [`docs/agent-skills.md`](../../../docs/agent-skills.md) →
"Bash call hygiene". Everything in this skill runs through

```
npm --prefix ~/git/defra/trade-imports-workspace/tim run parity -- <subcommand> …
```

or, where `tim` is on PATH and the shell is inside the workspace, `tim parity
<subcommand>`. `make tim-link` puts this checkout's `tim` on PATH; check it
first with `readlink -f "$(which tim)"`, because a stale clone's `tim` will
resolve a different workspace and quietly report a different corpus.

## The two files and what each is for

- **`workareas/journey-builder/<run>/backlog.json`** — judgement. The findings,
  their prose, their citations' identity, the rulings. Tracked, and a `git diff`
  on it is a prose review.
- **`workareas/journey-builder/<run>/evidence.json`** — derived. URLs, blob ids,
  snippets, anchor results, the `[[cN]]`-marked copy of the prose. Regenerable
  from scratch; never hand-edited.

`.corpus-meta.json` beside them holds the pins, the captures and every count the
report's masthead prints. Nothing on the page is typed in.

**`detail` is frozen forever.** It is the only oracle that proves the structure
pass and the language pass lost nothing. Never edit it, never delete it, never
reword it. The renderer stops reading it once a finding is migrated; the checker
never stops.

## Modes

Emit `MODE: REPORT|WALK|MIGRATE|CAPTURE` on the first line of your reply, then
follow that section.

### REPORT — regenerate the page

Triggers: "regenerate the parity report", "rebuild the findings report".

```
tim parity report EUDPA-328
tim parity serve EUDPA-328          # then open http://127.0.0.1:4328/
```

`--target artifact` writes `report/artifact.html`, one self-contained file to
send someone. It is a second emitter of the same generator, not a reduced tier:
the element crops travel inside it as WebP and the full-page screenshots become
a stated local reference, so what it does not carry is named rather than
quietly dropped. Nothing is ever downsized to fit a channel. It does not write
to the seal store — shipping a copy must not change what the local build says
you have seen.

`report` writes `workareas/journey-builder/<run>/report/index.html` plus
`report/assets/`, hardlinking the screenshots rather than copying 20 MB. It
prints image coverage per side; `--require-images` turns a gap into a non-zero
exit so a release-grade regeneration can be gated while daily regeneration stays
permissive.

Run `tim parity check EUDPA-328` alongside it and read the warnings. Rebuild
`evidence.json` first if the backlog's citations have changed:

```
tim parity citations EUDPA-328 --write
tim parity evidence EUDPA-328 --write
```

Before a regeneration anyone will rule from, run the evidence check. It is the
only command that reads pins, captures, coverage and citations together — each
of them alone can read green over a stale one of the others:

```
tim parity check-evidence EUDPA-328
```

A moved pin or a missing capture is blocking, and `--strict` makes it a
non-zero exit. A citation whose anchor has drifted is not: it is a finding to
re-verify, which is the expected yield of pinning to HEAD.

**Never `--reseal` on someone's behalf.** The report records the pictures it
last showed in `evidence/seals.json`; anything that has moved since carries a
ribbon and is listed at the top of the page. `--reseal` says "I have looked at
these and accept them", which is a person's statement, not a build step.

### WALK — present the gated findings and apply a batch of rulings

Triggers: "rule the parity decisions", "walk parity EUDPA-X".

The report is the presentation surface. Open it, filter to *Not yet ruled*, and
read the decision block at the top of each gated card: one question, the options
where the prose names them, what stays blocked, and the exact argument string.
The page collects a batch and the *copy batch* control returns one command per
line.

Apply them one call at a time:

```
~/git/defra/trade-imports-workspace/tools/parity/rule-decision.sh EUDPA-328 inc-055 accept --note "why"
```

`--note` is required on every ruling. A ruling without a reason is worth very
little three months later, and this backlog is meant to outlive the conversation
that made it. `tools/parity/next-decision.sh` still walks them one at a time in
the terminal for the ones that need discussion.

Rulings and what they do: `accept` unblocks it for the build loop; `reject`
drops it as a recorded decision; `defer` marks it decided-not-now; `falsified`
drops it and strips the dependency from anything waiting on it, because the loop
never treats a dropped dependency as satisfied.

### MIGRATE — move a finding's prose into slots, then rewrite it

Triggers: "migrate parity EUDPA-X", "run pass A", "run pass B".

Two passes, two commits, never one. The split is what makes the guard work.

**Pass A moves words. It does not reword them.** Read the frozen `detail`, split
it across `frontend`, `prototype`, `difference`, `correction`, `falsifiedBy`,
and import `verification` verbatim from the upstream findings file. Every
citation token becomes its `[[cN]]` marker.

**Pass B rewrites into GDS plain English**, over `frontend`, `prototype`,
`difference`, `correction`, `falsifiedBy` and `decisionRequired.question` only.
`verification` is an audit record and is never touched. Technical vocabulary
stays — `govukServiceNavigation`, `isGerminalProduct` and
`showTemperatureQuestion` are the names of real things. What goes: sentences
over 25 words, passives where an actor exists, nested parentheticals, and
preamble that the section headings now carry.

Workers never edit JSON. They write a slot file and call the setter:

```
tim parity set-slot EUDPA-328 inc-037 frontend --pass a --file /path/to/slot.txt
tim parity set-decision EUDPA-328 inc-055 --question "…" --source authored --option "…" --consequence "…"
tim parity check EUDPA-328 --pass a
```

`--pass` matters: the word budgets apply to Pass B and the residue check applies
to Pass A, so a finding has to say which one wrote it.

The personas are in `references/`: [COPY_EDITOR](references/COPY_EDITOR.md) for
the writing, [CLAIM_VERIFIER](references/CLAIM_VERIFIER.md) for the adversarial
read afterwards, [EVIDENCE_CURATOR](references/EVIDENCE_CURATOR.md) for the
pictures. **A different worker verifies than wrote.**

### CAPTURE — re-shoot the evidence

Triggers: "recapture the parity corpus".

Capture is the one place a `cd` is genuinely needed, so it stays in shell.
Before re-capturing, read `.corpus-meta.json`: `pins` is where the citations
resolve and `captures` is where the pixels came from, and the report says so on
the page when they disagree. A re-capture is what makes them agree again.

Capture ids are immutable. A capture at a new commit writes a new directory; it
never overwrites the old one, because the old evidence is the record of what a
ruling was made against.

The full sequence, in order:

```
tim parity seed-anchors EUDPA-328 --write            # which controls get cropped
tim parity insertion-anchors EUDPA-328 --write       # where a one-sided control would go
npm --prefix repos/trade-imports-animals-frontend run test:fit:capture
<the prototype harness command in corpora.json>
tim parity manifest EUDPA-328 --side prototype --sha <sha> --dsf 2 --write
tim parity repoint EUDPA-328 --side <side> --to <sha>   # preview, old beside new
tim parity repoint EUDPA-328 --side <side> --to <sha> --accept
tim parity meta EUDPA-328 --write
tim parity report EUDPA-328
```

`seed-anchors` reads the compare deltas and writes `anchors.<side>.json`; both
harnesses load the file for their own side, so adding element evidence to a
finding is a data change and never a spec edit.

`repoint` is not optional politeness. Accepting a new capture supersedes every
picture in the corpus at once, and the preview is where a lost screen — one the
new run did not reach — is caught before it silently disappears.

Which crop lands on which card is chosen, not curated: an anchor is relevant
when the finding's own prose names the control, by its `name` attribute or its
label, matched whole-word. A curated frame in `visual[]` overrides it. Where
nothing matches, the card keeps the whole page.

**A reader cannot see an absence.** For "the prototype has X and we do not",
the side with nothing to show gets an *insertion crop*: a picture of a control
that is there, outlined, captioned with what is missing and where it would go.
The position comes from the two page models, and its confidence is part of the
caption — where the pages share a field it says "it would sit after Species",
and where they share nothing it says the position could not be derived rather
than inventing one. Insertion anchors rank below prose-named ones, so they only
appear on the side whose prose names no control.

## The invariants, and why each one is there

`tim parity check <run> [--pass a|b]` runs ten. Read the two that matter most:

- **I5, quote conservation.** Every double-quoted span of five characters or
  more and every backticked identifier in the frozen `detail` must appear
  verbatim in some slot. On the 26 copy-change findings the quoted UI string
  *is* the finding — `"has as it's aim,"` against `"has as its aim"` — and a
  copy editor is exactly the kind of agent that would silently correct the typo
  it was asked to report.
- **I10, the polarity list.** Every hedge introduced and every absolute removed,
  printed. It cannot be a gate: "always" legitimately becomes "on every page".
  The only defence is the printed list plus a reader who did not write the text.

The residual risk this skill cannot mechanise is a claim softened in a way no
checker catches — "the frontend enforces" becoming "the frontend checks". Every
finding in this backlog is defensible today and that is its entire value.

## Handoff to journey-builder

Both skills write the same `backlog.json`. The split is produce and consume:

- **parity** builds the findings, resolves their evidence, renders them, and
  adjudicates them. It sets `finding.*`, `citations[]`, `visual[]`, `decision`
  and — through `rule-decision.sh` — `status` and `gate`.
- **journey-builder** consumes `status`, `gate` and `dependsOn` to run the build
  loop over whatever has been accepted. It never reads `finding.*`.

Never run both against one run at the same time. Both write the whole file.

## What this skill will not do

- **Guess a citation.** 35 of the 819 citations are queued for a human with the
  reason printed. A confidently wrong permalink is worse than inert code.
- **Rewrite `verification` or `detail`.**
- **Show a picture from a different commit without saying so.** A frame records
  the hash of the image it was curated against; a changed hash renders a
  ribbon and lists the finding in a drift panel at the top of the page.
- **Resize an image to fit a delivery channel.** The artifact export carries
  element crops only, and says on the page which evidence it cannot carry.
