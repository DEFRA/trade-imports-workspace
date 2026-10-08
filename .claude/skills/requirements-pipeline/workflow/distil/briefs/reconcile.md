# Reconcile: every source's verified claims into requirements and conflicts

Reconcile runs in two steps, and this brief is the method for both:

- **An area reconciler**, one per area of `distil/areas.json`, turns its area's working set (every claim about the
  area that survived verification, plus every claim a verifier found missing) into the area's requirements and
  conflicts, in `distil/areas/<area id>/reconciled.json`. `tim distil merge-reconcile` joins every area's file into
  `distil/requirements.json` and `distil/conflicts.json`.
- **The cross-area pass**, one agent, works across the merged files: duplicates two areas both wrote, conflicts that
  span areas, and every problem `tim distil coverage` names. See [Across areas](#across-areas).

Your prompt says which you are, names the files and the check command.

The fields are defined in `.claude/skills/requirements-pipeline/references/requirements.schema.json` and
`conflicts.schema.json` beside it, and an area's file in `reconcile-part.schema.json`. Read them before you write.

Read, in this order:

1. `sources.json`: the goal, the repos, `reposWhy`, `precedence` (most authoritative first), and every source's `role`.
2. Your working set. Per source, it gives the claims that held and the missed claims, and ranks the source by
   precedence. Refuted claims are already left out. Read **every claim**, in pages: depth is the point of cutting
   reconcile into areas.
3. On a re-distil, the existing requirements and conflicts your prompt names.

## Weigh every claim, today's included

- **Every claim from a today source is weighed.** Today's sources are the target repos, traces of the real services
  and the tests repo: they say what exists now. Each one is either the evidence for a requirement's delta, part of a
  conflict, or recorded as out of scope. Never leave a today source unweighed because the target's sources say more:
  `tim distil coverage` refuses a source that backs no requirement or conflict.
- **The delta cites its evidence.** `new` cites the claims that show the target wants it and, where a today source
  shows its absence (a page with no such field, a test that walks past it), that claim too. `change` cites the today
  claim that shows what is there now, and `deltaNote` says how it differs. `exists` cites the today claim that meets
  it.
- **Keep differences at their real granularity.** A heading, a label, a hint, an option, an error message or a
  button that differs is its own requirement, citing the claims that show both versions. Never fold many copy
  differences into "the page matches the design": the builder cannot see what to change, and the reviewer cannot
  check it. Group only what is the same change, such as one renamed term used on three pages.

## Requirements

- **Merge claims that say the same thing** from different sources into one requirement citing all of them. That is
  the cross-reference: a requirement backed by two sources is stronger than one, and the report says so.
- A requirement is a behaviour, rule or quality somebody can observe. `statement` says what, `why` says why, in
  plain English.
- `claims` cites claim ids from your working set only. Never cite a refuted claim or one from a source that is not
  in the working set.
- `status`:
  - `adopted`: it will be built, or it already exists.
  - `question`: it rests on a question nothing settles. It cites that question conflict.
  - `out-of-scope`: the goal excludes it. `why` says why. A problem in a service that the programme does not fix
    is out of scope and goes to the report.
- `delta`, on every adopted requirement, against what the target repos do today: `new`, `change` (with `deltaNote`
  saying how today differs) or `exists` (with `deltaNote` naming the claim that meets it).
- `blockedBy`, on an adopted requirement only, when it cannot be built until somebody outside the programme acts: a
  platform change, access, another team's ticket. Say who must do what. It is built in a blocked increment.

## Conflicts

- **Every disagreement becomes a conflict.** Each position names its `source`, what it `says` and the `claim` it
  rests on.
- **Questions are minimal by default.** Settle every difference precedence or a ruling settles, as `precedence`.
  Read every ruling for the rules it sets on how differences are weighed, such as "the prototype wins by default;
  only a judgement on the same difference, or a real constraint the prototype cannot express, overrides it", and
  apply them. A difference that waits on somebody outside the programme is never a question: adopt it with
  `blockedBy`. Raise a question only where neither precedence nor any ruling settles it. A challenge step then tries
  to settle every question you raise, and only the survivors reach the owner.
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
- A question has `resolution` `question`, a one-sentence `question` for the owner and a `default`: what will be built
  if nobody answers. Every question carries a default, so building can start.
- **Never settle a doubt with the plain reading.** Where a source or ruling cannot be met as written in some part
  of the target, such as an environment, a repo, a journey or a stage, or two readings of it would build different
  things, and nothing ranks them, that is a question. Its `default` says what each part gets: "the stand-ins locally,
  the real services in CDP", not one reading stretched over every part. Check each claim against every environment,
  repo and journey that `sources.json` and the claims name before you adopt it.
- **One question per decision.** Never copy one question onto many requirements: cite the one conflict from each.
- A requirement that contradicts an existing ruling in a target repo is a conflict. Precedence settles it, or it
  becomes a question whose default keeps the ruling.
- Every conflict is cited by at least one requirement.

## Ids in an area's file

- A new requirement is `req-<area id>-001`, `req-<area id>-002` and on; a new conflict `c-<area id>-001` and on.
  `tim distil merge-reconcile` gives each the next free number and rewrites every citation.
- On a re-distil, the working set's `owns` lists the existing ids your area keeps. Write each one, id unchanged.
  Write no other existing id: another area owns it. You may cite an existing conflict another area owns.
- Cite only claims in your area's working set, and only conflicts in your own file or already in `conflicts.json`.
  The merge refuses anything else.

## Across areas

The cross-area pass reads the merged `requirements.json` and `conflicts.json`, `distil/areas.json` and
`distil/areas/id-map.json` (which area each id came from), and has the whole working set to hand.

- **Merge duplicates.** Two areas that both saw a shared claim may both have written a requirement for it. Keep one:
  the existing id where there is one, otherwise the lower. Fold the other's claims and conflicts into it. A duplicate
  created this run is removed; one that existed before stays, as `out-of-scope` with `why` naming the requirement that
  now carries it, so its id still resolves.
- **Settle cross-area conflicts.** Where two areas adopted things that cannot both be built (a shared page that two
  journeys change differently), record the conflict and settle it as any other: precedence, a ruling, a blocker, and
  only then a question.
- **Keep the areas' granularity.** Never merge requirements because they look alike across areas: merge only what is
  the same change.
- Run the coverage check and fix every problem it names about requirements, conflicts, claims, sources or challenge
  verdicts. A source that backs nothing means its claims were never weighed: weigh them now.

## Re-distilling

When requirements and conflicts already exist, this is a re-distil: new sources or rulings have been folded in.

- **Keep every existing id.** A requirement or conflict that still stands keeps its id and its wording where the
  wording is still right. The backlog cites requirement ids, and a changed id breaks it.
- A ruling that answers a question settles it: the conflict becomes `precedence`, drops its `question` and
  `default`, and the requirement that cited it becomes `adopted` or `out-of-scope`.
- A requirement nothing supports any more becomes `out-of-scope`, with `why` saying what changed. Never delete it.
- **A later ruling that withdraws an earlier one is a precedence conflict** between the two ruling sources. The later
  ruling ranks first. List the withdrawn claim in `overruled`, then take it out of every standing requirement.
- **Re-read every existing wording against what changed.** A requirement or conflict can go stale without its
  own claims changing: another requirement widens the scope, or a ruling narrows it. Update the `statement`,
  `about`, `question`, `default` and `outcome` of each one the change touches, and keep its id.

A run after `tim distil reset --stage reconcile` is a first reconcile: nothing exists, and every id is new.

## The goal

`sources.json`'s `goal` is the main session's summary at intake. It ranks below every ruling. Where a ruling
contradicts the goal, follow the ruling. Never reintroduce what a ruling withdrew because the goal still says it.
Return each contradiction in `goalConflicts`, as one line naming the ruling and what the goal should now say. The
main session corrects the goal.

## Finishing

1. Write your file or files with the Write tool, at the absolute paths your prompt gives.
2. Run the check command your prompt gives. It exits 1 and names every problem. Fix every problem it names about
   your files, and run it again, until it names none. Problems about `backlog.json` or increments are the
   consolidator's, not yours: leave them.
3. Answer with the structured output your prompt asks for, including every decision you made and every
   `goalConflicts` line.
