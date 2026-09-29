# Reconcile: every source's verified claims into requirements and conflicts

You turn the working set, every claim that survived verification plus every claim a verifier found missing, into
`distil/requirements.json` and `distil/conflicts.json`. Your prompt names the files and the check command.

The fields are defined in `.claude/skills/requirements-pipeline/references/requirements.schema.json` and
`conflicts.schema.json` beside it. Read both before you write.

Read, in this order:

1. `sources.json`: the goal, the repos, `reposWhy`, and `precedence`, most authoritative first.
2. The working set your prompt names. Per source, it gives the claims that held and the missed claims, and ranks the
   source by precedence. Refuted claims are already left out. Read it in pages if it is long: it can run to a
   thousand claims.
3. The existing `requirements.json` and `conflicts.json`, when your prompt says they exist.

## Requirements

- **Merge claims that say the same thing** from different sources into one requirement citing all of them. That is
  the cross-reference: a requirement backed by two sources is stronger than one, and the report says so.
- A requirement is a behaviour, rule or quality somebody can observe. `statement` says what, `why` says why, in
  plain English.
- `claims` cites claim ids from the working set only. Never cite a refuted claim or one from a source that is not
  in the working set.
- `status`:
  - `adopted`: it will be built, or it already exists.
  - `question`: it rests on a question precedence cannot settle. It cites that question conflict.
  - `out-of-scope`: the goal excludes it. `why` says why. A problem in a service that the programme does not fix
    is out of scope and goes to the report.
- `delta`, on every adopted requirement, against what the target repos' claims say exists today:
  - `new`: not there.
  - `change`: there, but different. `deltaNote` says how today differs.
  - `exists`: already true. `deltaNote` names the target claim that meets it.

## Conflicts

- **Every disagreement becomes a conflict.** Each position names its `source`, what it `says` and the `claim` it
  rests on.
- Where `precedence` settles it, the higher-ranked source wins: `resolution` is `precedence`, `outcome` says what
  was adopted and why, and it carries no `question` and no `default`. Never block on a disagreement precedence
  settles.
- **`overruled` names what precedence set aside.** List every claim a losing position rests on that must no longer
  be built. A later ruling that withdraws an earlier one always lists the earlier claim. Each id is one of the
  conflict's position claims, from a source ranked below a position the conflict keeps. Leave a claim out when it
  still backs something true, and say why in `outcome`.
- **An overruled claim leaves every standing requirement.** No `adopted` or `question` requirement cites it in
  `claims`. Reword each requirement that did to what the conflict adopted. An `out-of-scope` requirement may keep
  it, to record what was set aside. `tim distil coverage` refuses a standing requirement that still cites one.
- **Precedence settles a disagreement between sources, never within one.** A conflict settled by `precedence` has
  positions from at least two sources. Where one source says two things, the second only reports a third party's
  view, or restates the first, merge the claims into one requirement. Where it truly contradicts itself, make it a
  question.
- Only a disagreement precedence cannot settle, or a `gap` that matters, becomes a question: `resolution` is
  `question`, with a one-sentence `question` for the owner and a `default`, what will be built if nobody answers.
  Every question carries a default, so building can start.
- **Never settle a doubt with the plain reading.** Where a source or ruling cannot be met as written in some part
  of the target, such as an environment, a repo, a journey or a stage, or two readings of it would build different
  things, that is a question. Its `default` says what each part gets: "the stand-ins locally, the real services in
  CDP", not one reading stretched over every part. Check each claim against every environment, repo and journey
  that `sources.json` and the claims name before you adopt it.
- **One question per decision.** Never copy one question onto many requirements: cite the one conflict from each.
- A requirement that contradicts an existing ruling in a target repo is a conflict. Precedence settles it, or it
  becomes a question whose default keeps the ruling.
- Every conflict is cited by at least one requirement.

## Re-distilling

When requirements and conflicts already exist, this is a re-distil: new sources or rulings have been folded in.

- **Keep every existing id.** A requirement or conflict that still stands keeps its id and its wording where the
  wording is still right. The backlog cites requirement ids, and a changed id breaks it.
- New requirements and conflicts take the next free ids.
- A ruling that answers a question settles it: the conflict becomes `precedence`, drops its `question` and
  `default`, and the requirement that cited it becomes `adopted` or `out-of-scope`.
- A requirement nothing supports any more becomes `out-of-scope`, with `why` saying what changed. Never delete it.
- **A later ruling that withdraws an earlier one is a precedence conflict** between the two ruling sources. The later
  ruling ranks first. List the withdrawn claim in `overruled`, then take it out of every standing requirement.
- **Re-read every existing wording against what changed.** A requirement or conflict can go stale without its
  own claims changing: another requirement widens the scope, or a ruling narrows it. Update the `statement`,
  `about`, `question`, `default` and `outcome` of each one the change touches, and keep its id. A question about
  "the INS suites" that a later requirement widened to four journeys now names the four journeys.

## The goal

`sources.json`'s `goal` is the main session's summary at intake. It ranks below every ruling. Where a ruling
contradicts the goal, follow the ruling. Never reintroduce what a ruling withdrew because the goal still says it.
Return each contradiction in `goalConflicts`, as one line naming the ruling and what the goal should now say. The
main session corrects the goal.

## Finishing

1. Write both files with the Write tool, at the absolute paths your prompt gives.
2. Run the check command your prompt gives. It exits 1 and names every problem. Fix every problem it names about
   requirements, conflicts or claims, and run it again, until it names none. Problems about `backlog.json` or
   increments are the consolidator's, not yours: leave them.
3. Answer with the structured output your prompt asks for, including every decision you made and every
   `goalConflicts` line.
