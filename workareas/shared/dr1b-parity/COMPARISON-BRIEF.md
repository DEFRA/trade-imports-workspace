# Comparing the two readings — the brief every comparison agent reads

Two independent readings of the same comparison now exist, over byte-identical
evidence:

- **`dr1`** — run `EUDPA-328-DR1`, 133 findings, `workareas/journey-builder/EUDPA-328-DR1/backlog.json`
- **`dr1b`** — run `EUDPA-328-DR1B`, `workareas/journey-builder/EUDPA-328-DR1B/backlog.json`

**The firewall is lifted for you and only for you.** Every other agent on this
run was forbidden from opening `dr1`. You must open both.

## The question you are answering

Sam asked for **"any fundamental wrongs in the new stuff"**. So `dr1b` is the
work under test and `dr1` is a second opinion on the same evidence — **not an
oracle.** `dr1` was itself produced by agents, has six `disputed` findings of
its own, and had about a dozen claims falsified during its own verification
pass. Where the two disagree, **the evidence settles it, not seniority.**

Answer these four, in this order, for the domain you were given.

### 1. Is anything in `dr1b` wrong?

This is the priority and the reason the exercise exists. A `dr1b` finding is
wrong if the captured evidence or the source contradicts it — not if `dr1`
merely says something different.

Grade each: **wrong** (the evidence refutes it), **overstated** (true but
claimed more strongly than the evidence supports), or **sound**.

### 2. What did `dr1b` find that `dr1` missed?

New signal. For each, say whether it is real, and how you checked. A finding
present in one run and absent from the other is not automatically a win for
either — `dr1b` may have found something real, or may have invented something.

### 3. What did `dr1` find that `dr1b` missed?

Coverage gaps in the new run. Same test: is the `dr1` finding real? A gap
matters only if what was missed is true.

### 4. Where they contradict each other, which is right?

The interesting cases. Go to the rendered DOM, the screenshots and the source
and settle it. Quote what decided it.

## Read the provenance before you weigh any agreement

`workareas/shared/dr1b-parity/PROVENANCE.md` records exactly how independent
`dr1b` was, including three places the firewall bent.

**The asymmetry that matters: contamination can only ever push the two runs
toward agreement.** So:

- **A disagreement is always trustworthy.** Nothing in the setup could have
  manufactured one.
- **Agreement is trustworthy everywhere except one subject** — the frontend's
  blocked exit-details hub row, where a `dr1b` agent saw two of `dr1`'s finding
  file names in a `grep` output. Do not count agreement there as two independent
  confirmations. Say so if it comes up in your domain.

## Known structural differences, so you do not report them as findings

These are properties of how the two runs were set up, not disagreements:

- **`dr1b` has no `carriedFrom` anywhere.** It carried nothing over by design.
- **The pairings differ.** `dr1`: 41 pair rows, 2 `onlyFrontend`, 4
  `onlyPrototype`. `dr1b`: 54, 2, 2. That is a real disagreement about the
  service's shape and is worth examining — but examine it as a disagreement, not
  as an error in the file format.
- **The slicings differ**, so the same finding may sit under a different slice
  in each run. Compare by **subject**, never by slice or by increment id.
- **`dr1b` findings all carry `finding.verification`; `dr1` findings carry
  none.** `dr1` predates the requirement. That is not a quality signal about
  either run's findings — do not read it as one.
- Both runs use the same three bands. A band disagreement on the same subject
  **is** worth reporting.

## One known live disagreement, already visible

`dr1` lists `dr1-permanent-address-animals` as `onlyPrototype` — a prototype
screen with no frontend counterpart. `dr1b` pairs it to the frontend's
identification screen, on the grounds that the frontend carries the same rule
inline in the identification card, gated to a commodity list the captures never
exercise.

**Both cannot be right.** If your domain covers it, settle it from the source
and say which run is wrong.

## What you write

A markdown report at the path your spawn prompt names. Structure it as the four
questions above. For every judgement, quote the file and line, or the screen and
what is visible in it.

**Do not edit either backlog.** Do not write into `findings/`. You are producing
an assessment, not amending a corpus.

## Guard rails

- One Bash command per call. No `&&`, no `;`, no `cd`.
- `~/git/defra/trade-imports-workspace/...`, never a literal `/Users/...` path.
- Do not run `npm install`, start either application, or run Playwright.
- Do not touch git.
- Your final message is the return value. Facts, not narrative.
