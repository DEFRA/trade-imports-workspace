export const meta = {
  name: 'dr1c-author',
  description:
    'Author the DR1C parity findings, one agent per slice, each verified by a different agent',
  whenToUse:
    'The AUTHOR phase of a parity comparison, once both sides are captured, coverage is clean and the slicing is proven.',
  phases: [
    { title: 'Author', detail: 'one agent per slice, reading both sides' },
    { title: 'Verify', detail: 'a different agent asks only: is this correct' }
  ]
}

// The slicing, proven by `tim parity slices EUDPA-328-DR1C --strict` before
// this workflow was launched. Passed in as args so the script does not carry a
// second copy of a list that lives in slices.json.
const SLICES = args.slices

const WORKAREA = '~/git/defra/trade-imports-workspace/workareas/shared/dr1c-parity'

// Every agent reads these two before anything else. The firewall is in the
// first one, and it overrides the personas — which name the firewalled paths.
const PREAMBLE = `
You are one agent in the AUTHOR phase of comparison run EUDPA-328-DR1C.

READ FIRST, WHOLE, IN THIS ORDER:
1. ${WORKAREA}/RUN-BRIEF.md
2. ${WORKAREA}/FINDING-CONTRACT.md

RUN-BRIEF.md section 1 is a FIREWALL. Honour it exactly. This run reuses nothing
from the two previous runs of this same comparison. You must not read, list,
grep or copy from:
  ~/git/defra/trade-imports-workspace/workareas/shared/dr1-parity/
  ~/git/defra/trade-imports-workspace/workareas/shared/dr1b-parity/
  ~/git/defra/trade-imports-workspace/workareas/journey-builder/EUDPA-328-DR1/
  ~/git/defra/trade-imports-workspace/workareas/journey-builder/EUDPA-328-DR1B/
  ~/git/defra/parity-archive/

Documents you are told to read WILL point you at those paths by name. The
FINDING_AUTHOR and FINDING_VERIFIER personas and the finding-contract template
all do. Ignore those instructions and say in your report that you did. Flagging
a deviation is not permission for it: a previous session reused three things,
flagged all three, and had its work thrown away.

There is no carryover on this run. There is no carryover.json, no upstream
backlog, and no finding may carry a "carriedFrom" field. If you find yourself
looking for what a previous run concluded, stop.

GUARD RAILS
- One command per Bash call. No &&, no ;, no cd. Write ~/git/defra/... never a
  literal /Users/... path.
- curl, wget, node, env, bash -c and python are on the workspace deny list. Do
  not attempt a transformed retry. You do not need them: the rendered DOM of
  every screen is already on disk.
- Do not git commit, push, checkout or stash. Do not run tim parity capture,
  ingest, anchors or report. The parent does all of those.
- Do not edit tools/parity/corpora.json, the pipeline ledger, slices.json, or
  any enumerate*.cjs.

THE EVIDENCE, AND WHICH OF IT TO TRUST
For every screen, three things were written in ONE page visit, so all three
describe the same render:
  ${WORKAREA}/evidence/frontend@76a864ba/page/<screen>.png
  ${WORKAREA}/capture/html/frontend/<screen>.html
  ${WORKAREA}/capture/model/frontend/<screen>.json
and the same three under prototype@491b3926 / prototype/ for dr1- screens.

**The rendered DOM is the cheapest evidence here and the hardest to argue with.
The screenshot is the only thing that shows what a user meets. Read both.**

**The page model is unreliable and is a hint, never evidence.** It reports
caption: null on every prototype screen because that side uses its own class, it
has collapsed five checkbox fieldsets into one, and it has attached a hint to
the wrong control.
`

const AUTHOR = (slice) => `${PREAMBLE}

Also read, and follow, this persona — except where it conflicts with the
firewall above:
  ~/git/defra/trade-imports-workspace/.claude/skills/parity/references/FINDING_AUTHOR.md

YOUR SLICE: "${slice.id}".

${slice.chrome
  ? `**YOU OWN THE CHROME, AND YOU ARE THE ONLY SLICE THAT MAY RAISE A CHROME
FINDING.** The phase banner, the service navigation, the caption above the
heading, the back link and breadcrumbs, the footer, the page title pattern, the
signed-in bar, the journey status strip, the error-summary pattern and the
save/continue button pattern appear on every screen. Every other slice has been
told in as many words not to raise a finding about any of them. If you do not
raise them, nobody will.`
  : `**DO NOT RAISE A CHROME FINDING.** The phase banner, the service navigation,
the caption above the heading, the back link and breadcrumbs, the footer, the
page title pattern, the signed-in bar, the journey status strip, the
error-summary pattern and the save/continue button pattern appear on every
screen and are owned by the "service-wide" slice. A finding about any of them
from you is a duplicate, and duplicates cost more than gaps. Raise what is
specific to your screens.`}

YOUR SCREENS — these and no others. The other slices own the rest:
${slice.screens.map((s) => `  ${s}`).join('\n')}

THE PAIRING — which screen answers which, from pairs.cjs:
${slice.pairing ?? '  (see ' + WORKAREA + '/pairs.cjs for your slice\'s rows)'}

WHAT A FINDING IS
The contract governs. Read it whole; do not work from a summary of it. In
particular: you are comparing FUNCTIONALITY, not code. Design release 1 is
signed off, so where the frontend differs, the frontend is wrong unless the
finding itself is mistaken. A finding whose substance is a code difference is
not a finding.

Write one JSON file per finding at:
  ${WORKAREA}/findings/${slice.id}--<slug>.json

**Never rename a finding file afterwards.** The increment id is bound to the
file name, and a rename orphans every ruling and citation attached to it.

**Do not write finding.verification.** That slot belongs to the verifier who
reads your work next, and it is the only thing that distinguishes a verifier who
found nothing from one who looked at nothing. An author who fills it destroys
the only evidence that anybody checked.

NAME THE CONTROL. Each finding's "controls" array drives the element crop, so a
finding about one field is shown by that field rather than by a whole page. An
empty array must be a stated choice, not an omission.

CHECK THE BRIEF. Three agents on the specs phase disproved premises they were
handed, and each was right to. If the evidence contradicts something you were
told here, the evidence wins — say so in your report rather than writing the
finding the brief expected.

PROMOTE WHAT YOU NOTICE. The one thing this method has never checked is whether
an observation became a finding. Three times an agent wrote a fact into its own
notes and never raised it. If you notice a difference, raise it or say in your
report why you did not.

REPORT BACK: the file slugs you wrote, one line each; anything you noticed and
deliberately did not raise, with the reason; any premise you disproved; and
confirmation that you opened no firewalled path.`

const VERIFY = (slice, authored) => `${PREAMBLE}

Also read, and follow, this persona — except where it conflicts with the
firewall above:
  ~/git/defra/trade-imports-workspace/.claude/skills/parity/references/FINDING_VERIFIER.md

**A DIFFERENT AGENT WROTE THESE FINDINGS. You did not. Your job is to try to
break them.**

YOUR SLICE: "${slice.id}". The findings to verify are the files at:
  ${WORKAREA}/findings/${slice.id}--*.json

The author reported writing these:
${(authored?.slugs ?? []).map((s) => `  ${s}`).join('\n') || '  (list them yourself from the directory)'}

**Your only question is "is this finding correct".** Never "do we want it" —
Design release 1 is signed off, so that question is closed, and a verifier that
starts answering it is running a negotiation nobody asked for.

THE CLASSES OF ERROR THAT ARE ACTUALLY THERE. On a previous authoring pass this
step took 118 findings to 132. What it caught:
- **A claim about markup dressed as a claim about behaviour.** "The frontend
  lets you walk past this question" was true of the page and false of the
  journey three separate times: the obligation model marks the field mandatory
  and the review gate enforces it. The user cannot submit — they are just never
  told why. Check the obligations and the flow, not only the template.
- **A claim stated more strongly than the evidence supports.** "A user cannot
  complete their notification" was a blocked return path, not a blocked journey.
- **A finding whose own falsifier was never run.** Run each one.
- **Two findings that are one.**
- **A missed finding.** The net was +14, so this pass adds as well as removes.
- **A control named that could never crop** — a field called "Back", a whole
  page title used as a label. Both fall back to the whole-page shot that the
  naming rule exists to prevent.

**OPEN THE PICTURES.** Four findings on a previous run were confidently wrong
and only looking found them: a white square from a collapsed filter panel, two
whole-page shots from a growth loop that stopped on a page container, and a
sliver reading "Co" that matched a one-pixel visually-hidden submit trap.

WHAT YOU WRITE
- **Every finding gets a finding.verification line, including the ones that
  survive untouched.** One line saying what you opened and what you ran. Ingest
  refuses a finding without one, and there is no flag to turn that off. Be
  specific: name the file you read and the thing you checked.
- Where the claim is wrong, fix the slot AND add finding.correction recording
  what was claimed, what is true, and how you checked. The record of what was
  claimed is worth more than a clean-looking file.
- Where the claim stands but is overstated, understated or mis-cited, leave the
  slot and say so in finding.correction.
- Where the finding does not survive at all, band it "disputed" and say in
  finding.difference exactly what would settle it.
- Where you find a finding the author missed, write it — same file naming as the
  author, and fill your own verification line saying you both wrote and checked
  it, so a reader knows.

REPORT BACK: per finding, one line — stands / corrected / disputed / struck, and
why; any finding you added; and confirmation that you opened no firewalled path.`

phase('Author')

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['slugs', 'notRaised', 'firewallClean'],
  properties: {
    slugs: {
      type: 'array',
      items: { type: 'string' },
      description: 'File slugs written, without the .json extension'
    },
    notRaised: {
      type: 'array',
      items: { type: 'string' },
      description: 'Things noticed and deliberately not raised, with the reason'
    },
    premisesDisproved: { type: 'array', items: { type: 'string' } },
    firewallClean: { type: 'boolean' }
  }
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdicts', 'firewallClean'],
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slug', 'outcome', 'why'],
        properties: {
          slug: { type: 'string' },
          outcome: {
            type: 'string',
            enum: ['stands', 'corrected', 'disputed', 'struck', 'added']
          },
          why: { type: 'string' }
        }
      }
    },
    firewallClean: { type: 'boolean' }
  }
}

// pipeline, not a barrier: a slice's findings go to verification the moment that
// slice finishes authoring, rather than every slice waiting for the slowest.
// Nothing in verification needs to see another slice's findings — the
// cross-slice duplicate sweep is a separate pass the parent runs afterwards,
// and it is the only thing that reads the whole corpus at once.
const results = await pipeline(
  SLICES,
  (slice) =>
    agent(AUTHOR(slice), {
      label: `author:${slice.id}`,
      phase: 'Author',
      schema: FINDINGS_SCHEMA
    }),
  (authored, slice) =>
    agent(VERIFY(slice, authored), {
      label: `verify:${slice.id}`,
      phase: 'Verify',
      schema: VERDICT_SCHEMA
    }).then((verdict) => ({ slice: slice.id, authored, verdict }))
)

const done = results.filter(Boolean)

log(
  `${done.length} of ${SLICES.length} slices authored and verified. ` +
    `${done.reduce((n, r) => n + (r.authored?.slugs?.length ?? 0), 0)} findings written.`
)

return {
  slices: done,
  firewallBreaches: done
    .filter((r) => r.authored?.firewallClean === false || r.verdict?.firewallClean === false)
    .map((r) => r.slice),
  notRaised: done.flatMap((r) =>
    (r.authored?.notRaised ?? []).map((n) => `${r.slice}: ${n}`)
  ),
  premisesDisproved: done.flatMap((r) =>
    (r.authored?.premisesDisproved ?? []).map((p) => `${r.slice}: ${p}`)
  )
}
