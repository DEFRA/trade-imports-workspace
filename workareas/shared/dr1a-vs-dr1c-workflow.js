export const meta = {
  name: 'dr1a-vs-dr1c',
  description:
    'Compare two independent parity runs over the same comparison: which findings both caught, which only one caught, and what that says about either',
  whenToUse:
    'When two runs of the same comparison exist and somebody needs to know how far they agree.',
  phases: [
    { title: 'Match', detail: 'one agent per subject area, reading both backlogs' },
    { title: 'Judge', detail: 'a second agent re-checks the one-sided claims' }
  ]
}

const AREAS = args.areas

const WORKAREAS = '~/git/defra/trade-imports-workspace/workareas'

const PREAMBLE = `
You are comparing TWO INDEPENDENT RUNS of the same parity comparison.

Both compared the DEFRA live-animals import notification frontend against
Design Release 1 of the GOV.UK prototype. They were derived separately, months
apart, by different agents, from the same two applications.

  RUN A  EUDPA-328-DR1   133 findings   backlog: ${WORKAREAS}/journey-builder/EUDPA-328-DR1/backlog.json
  RUN C  EUDPA-328-DR1C  125 findings   backlog: ${WORKAREAS}/journey-builder/EUDPA-328-DR1C/backlog.json

**Run C reused NOTHING from run A.** Its specs, pairing, slicing, contract and
every finding were derived from source with run A firewalled off. That is what
makes this comparison worth anything: where the two agree, two independent
derivations reached the same conclusion. Where they differ, exactly one of three
things is true, and saying WHICH is your job:

  1. One run genuinely missed something the other caught.
  2. Both found it, and they describe it so differently that it looks like two.
  3. The applications changed between the runs, so both are right about their
     own moment.

**(2) is the trap and it is the whole difficulty.** Two agents describing one
change in different words share no screen id, no control name and no vocabulary.
A title-similarity match will not find them. Read what each finding actually
ASKS SOMEBODY TO DO — if a person doing the work would write the same diff, they
are the same finding however differently they are worded.

**A quick way in, and its limits:** two digests, one line per finding as
\`id|domain|band|title\`:

  ${WORKAREAS}/shared/dr1a-digest.txt   (133 lines)
  ${WORKAREAS}/shared/dr1c-digest.txt   (125 lines)

Use them to orient, then **read the actual findings in the backlogs** before
calling anything matched or one-sided. A title is a summary and two summaries of
one change can look unrelated. The backlogs hold each finding's frozen \`detail\`
plus its prose slots — that is what you judge on.

**Note the two runs use different domain vocabularies.** Run A has \`origin\` and
\`contact\` domains; run C has \`import-reason\`, \`address-book\` and \`dashboard\`.
Do not match on domain. Match on what the finding is about.

**Be careful about counts.** Run C had one finding withdrawn and three deferred
by a person after it was built, so its live backlog reads 124. Compare all 125
as authored — a finding that was later descoped was still FOUND, and whether run
A found it too is exactly what is being asked.

GUARD RAILS
- One command per Bash call. No &&, no ;, no cd. Write ~/git/defra/... never a
  literal /Users/... path.
- curl, wget, node, env, python, python3 and bash -c are on the workspace deny
  list. awk, grep and sed are fine.
- **Read only. Change nothing.** Do not edit either backlog, do not run any
  \`tim parity\` write command, and do not git commit, push or checkout. Both
  runs are frozen and one of them has rulings on it.
`

const MATCH = (area) => `${PREAMBLE}

YOUR SUBJECT AREA: ${area.name}

${area.what}

Findings likely in your area — but **verify the boundaries yourself**, because
the two runs group things differently and a finding may sit in a domain you
would not expect:

  Run A domains: ${area.aDomains.join(', ')}
  Run C domains: ${area.cDomains.join(', ')}

WHAT TO PRODUCE

For your area, every finding from BOTH runs, sorted into exactly three buckets:

- **matched** — both runs found this. Give run A's id, run C's id, and one line
  on how differently they put it. Where one is materially better than the other
  — more precise, better evidenced, correctly banded where the other is not —
  **say so and say which**. That judgement is the most useful thing here.
- **onlyA** — run A found it, run C did not. For each, say what you think
  happened: did C miss it, or did C's evidence show it is no longer true, or is
  it inside another C finding without its own id?
- **onlyC** — run C found it, run A did not. Same question in reverse.

**Before you call anything onlyA or onlyC, search the other backlog properly.**
Grep for the control name, the screen id, the quoted UI string — not the title.
A finding hiding inside another finding's prose is the single most likely way to
get this wrong, and it has already happened three times inside run C alone.

Return your answer in the structured shape you are given.

Keep the reasoning tight. The audience is a business analyst who has read run A
and wants to know whether run C tells them anything new.`

const JUDGE = (area, matched) => `${PREAMBLE}

YOU ARE CHECKING SOMEBODY ELSE'S WORK, in the subject area: ${area.name}

Another agent sorted this area's findings into matched / onlyA / onlyC. **Your
only question is whether the ONE-SIDED calls are correct**, because those are
the claims with consequences: an "only run A found this" says run C has a hole,
and an "only run C found this" says run A does.

Its answer:

${JSON.stringify(matched, null, 2)}

**Attack the one-sided calls, both lists.** For each, go to the OTHER run's
backlog and look hard for the same substance under different words. Grep the
control name, the screen ids, the quoted UI strings, the field names — never the
title. A finding that exists in both but was called one-sided is a false alarm
that will send a business analyst looking for a gap that is not there.

Also spot-check three or four of the **matched** pairs. A wrong match is quieter
and worse: it hides a real difference by pairing two findings that ask for
different work.

Where you overturn a call, say what the other run's finding is and where you
found it. Where you confirm one, say what you searched for and failed to find —
that sentence is the only thing distinguishing a check that ran from one that
did not.

Return your answer in the structured shape you are given.`

phase('Match')

const MATCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['area', 'matched', 'onlyA', 'onlyC'],
  properties: {
    area: { type: 'string' },
    matched: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['a', 'c', 'note'],
        properties: {
          a: { type: 'string' },
          c: { type: 'string' },
          note: { type: 'string' },
          better: { type: 'string', enum: ['A', 'C', 'neither'] }
        }
      }
    },
    onlyA: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'why'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          why: { type: 'string' }
        }
      }
    },
    onlyC: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'why'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          why: { type: 'string' }
        }
      }
    }
  }
}

const JUDGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['area', 'overturned', 'confirmed'],
  properties: {
    area: { type: 'string' },
    overturned: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'was', 'actually'],
        properties: {
          id: { type: 'string' },
          was: { type: 'string' },
          actually: { type: 'string' }
        }
      }
    },
    confirmed: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'searchedFor'],
        properties: {
          id: { type: 'string' },
          searchedFor: { type: 'string' }
        }
      }
    },
    matchesDisputed: { type: 'array', items: { type: 'string' } }
  }
}

const results = await pipeline(
  AREAS,
  (area) =>
    agent(MATCH(area), {
      label: `match:${area.id}`,
      phase: 'Match',
      schema: MATCH_SCHEMA
    }),
  (matched, area) =>
    agent(JUDGE(area, matched), {
      label: `judge:${area.id}`,
      phase: 'Judge',
      schema: JUDGE_SCHEMA
    }).then((verdict) => ({ area: area.id, matched, verdict }))
)

const done = results.filter(Boolean)

log(
  `${done.length} of ${AREAS.length} areas compared. ` +
    `${done.reduce((n, r) => n + (r.matched?.matched?.length ?? 0), 0)} matched pairs, ` +
    `${done.reduce((n, r) => n + (r.matched?.onlyA?.length ?? 0), 0)} only in A, ` +
    `${done.reduce((n, r) => n + (r.matched?.onlyC?.length ?? 0), 0)} only in C, before the judges.`
)

return { areas: done }
