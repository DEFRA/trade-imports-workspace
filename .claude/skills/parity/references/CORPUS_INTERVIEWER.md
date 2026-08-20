# CORPUS_INTERVIEWER

You are setting up a comparison for somebody who does not know what a corpus
is. They said something like "compare these two things and give me a report".
Your job is to ask the few things nobody can discover, record each answer as it
arrives, and hand the scaffold a finished interview.

**The parent session loads this.** It is not a subagent brief. You are talking
to a person, one question at a time.

**Bash call hygiene** — one command per Bash call. No `&&`, no `;`, no `cd`.
Use `~/git/defra/trade-imports-workspace/...`, never a literal `/Users/` path.

## Ask only what cannot be discovered

Most of a corpus is derivable and the scaffold derives it: every path under the
workarea, the capture directories, the model and HTML directories, the evidence
root, the capture commands, the pairing and enumerator module paths, the run
directory, the band blurbs. **Do not ask for any of them.** A question whose
answer is already on disk spends the person's patience on nothing.

Before each question, look. `package.json` names the scripts a side can be
started with. `git remote -v` names the owner and repo. The directory listing
says whether views live under `app/` or `src/`. Propose what you found and ask
them to confirm or correct it — that is one decision instead of one recall.

## Record every answer as it arrives

```
~/git/defra/trade-imports-workspace/tools/parity/setup-add-answer.sh \
  --run-id EUDPA-XXXX --field <dotted.path> --value '<json>'
```

One call per answer, written atomically. An interview that is interrupted
resumes from what was answered rather than from nothing, and these interviews
get interrupted — half of them are conducted while somebody waits for a stack to
come up.

Never hand-edit `setup.json`.

## What you have to ask

**The run id.** It must start `EUDPA-`. `tools/parity/next-decision.sh` and
`rule-decision.sh` match `EUDPA-*` as a glob, so anything else breaks two
scripts silently, weeks later. A suffix is fine: `EUDPA-328-DR1` works.

**A short corpus id** — `dr1`, `dr3`. It names the entry in `corpora.json` and
the workarea, and it is what somebody types into `--corpus` for the next two
years.

**One sentence on what is being compared against what.** This becomes the
corpus's `description`, and it is the only sentence a person reads before
deciding whether a report is theirs.

**Per side:**

| Ask | Why it cannot be discovered |
|---|---|
| Where the checkout is | Nothing on disk points at it |
| Which port it serves on | **The trap. See below.** |
| How to start it | `package.json` proposes; only a person confirms which script serves the thing being compared |
| Any environment it needs | A service that bounces to an identity provider without a stub flag looks like a broken tool |
| Which repo its citations resolve against | Usually its own, but not always |
| Whether it is the requirements side | The whole comparison hangs on it |

**Whether the requirements side is signed off.** This is the question that
decides the band taxonomy, and the taxonomy is what a hundred findings get
sorted by. A design still in flux needs a band meaning "we might not want this",
and a signed-off one must not have one — that question is closed, and a band for
it invites a negotiation nobody called for.

**Whether there is a previous corpus** comparing the same implementation against
an earlier version of the same requirements. If there is, the carryover triage
runs and is the cheapest work in the whole pipeline: on `dr1` it struck 37 of
the previous 97 findings before an authoring agent was spawned.

## The port question, in as many words

The workspace stack owns **3000, 3001, 3007, 3100 and 3200.**

`tim parity capture` uses whatever is already listening on a side's `baseURL`
rather than starting a second copy. So a side on one of those ports photographs
the running container instead of the application you started, and **says nothing
about having done so.** Every finding downstream then rests on a picture of the
wrong thing.

The scaffold refuses those five ports. Say why when you ask, so the person picks
a free port rather than arguing with a refusal.

## Which side is the requirements side

Ask it plainly: **which of these two is the definition, and which is being
judged against it?**

It is not always the prototype and it is not always the newer one. Everything
downstream reads this: the band taxonomy, the direction every finding is written
in, which side's absence is a defect and which side's absence is a note.

Exactly one side may be `requirements`. The scaffold refuses anything else.

## When the answers are in

```
~/git/defra/trade-imports-workspace/tools/parity/scaffold-corpus.sh --run-id EUDPA-XXXX --dry-run
```

Read the entry it would write, with the person. Then run it without `--dry-run`.

Then tell them the one thing the scaffold cannot do: **the finding contract it
seeded has six sections that are marked and wrong.** The band table, the domain
list, the two evidence path roots, the requirements side's view-path rule, what
is not a finding, and the volatile values this comparison must never compare.

Those six are the difference between ten agents producing one backlog and ten
agents producing ten dialects of one, and they have to be finished before the
first agent is spawned. `workareas/shared/dr1-parity/FINDING-CONTRACT.md` is the
worked example — a real one, filled in.

## What you never do

- **Never guess a port.** Ask.
- **Never guess which side is the requirements side.** Ask.
- **Never write `corpora.json` by hand.** The scaffold writes it, and a corpus
  entry is what every path in a comparison resolves through.
- **Never batch the questions.** One at a time, each recorded before the next.
  A batched interview loses everything when the person answers three of five.
- **Never tell them the report will be ready.** It produces findings, not
  rulings, and when it finishes no person has read any of them.
