# Area plan: cut reconcile into areas

You write **one** file, `distil/areas.json`, and no requirement. Your prompt names the file and the check command.

After you, one reconciler per area reads **every** claim its area's working set holds, from every source, and writes
that area's requirements and conflicts. A cross-area pass then joins them. So the depth of reconcile is set here. One
reconciler over thousands of claims skims: it leans on the sources it reads first, compresses copy differences into a
few broad requirements, and leaves whole sources unweighed. An area small enough to read in full does not.

The file's shape is defined, field by field, in
`.claude/skills/requirements-pipeline/references/areas.schema.json`. Read it before you write.

## What an area is

An area is a part of the service a user or another system can name: a journey page or a small group of pages that
belong together, the dashboard, the address book, templates, transporters, amend, copy and delete, a record or an
integration. Add one **cross-cutting** area, last, for what every page shares: layout, navigation, headers, shared
copy and the start and end of the journey.

- **Every source's claims about the area go into it**, the target's and today's alike. Today's sources are the target
  repos, traces of the real services and the tests repo. An area with only the target's claims cannot tell what
  changes, so it would mark everything new.
- **Size.** Aim for 300 to 1,000 claims an area: as much as one reconciler can weigh claim by claim. Split a bigger
  one along the service's own seams (a page group into its pages, the dashboard into its list and its actions). Never
  merge two areas to keep the count down: a run with 15 or 25 areas is normal for a large programme.
- **Rulings and short judgement documents go in `everyArea`.** A ruling that weighs every difference, or a short
  document of judgements, belongs in every area's working set. A long document of judgements, such as a backlog of
  earlier decisions, is sliced like any other source, by the areas its rows speak to.

## How to slice

Work from each source's partition, `distil/extract/<slug>.partition.json`: each part's `title`, `scope` and `covers`
say what its claims are about. Give each part to the area it speaks to.

- **A part about one area** goes whole: `{ "source": "repo:frontend", "parts": [3, 4] }`.
- **A part about several areas** is cut by claim range. List its claims with
  `jq -c '.claims[] | {id, ref}' <the source's extract>` and give each run to its area:
  `{ "source": "trace:e2e", "from": "trace-e2e-p4-001", "to": "trace-e2e-p4-037" }`. A run is in extract order, both
  ends kept. A claim's missed claims (`<id>-m<N>`) follow it.
- **A source with no partition** goes whole, or by claim range.
- **A claim may go to two areas** when it truly speaks to both, such as a shared component one page uses differently.
  Keep this rare: each copy is weighed twice, and the cross-area pass must merge what both write.
- **Every claim lands somewhere.** `tim distil areas` names every claim in no area. A test, trace or repo claim that
  seems to fit nowhere usually belongs in the cross-cutting area.

Name a today source in every area it holds claims about: the feature folder of each target repo, the traces and
specs that walk the area's pages, and the tests repo's specs for it. An area whose slices name no today source is a
defect unless the service has nothing there yet; say so in your decisions.

## On a re-distil

When `requirements.json` and `conflicts.json` already exist, give every existing requirement and conflict to exactly
one area, in its `requirements` and `conflicts`: the area its claims speak to. Its reconciler keeps the id. A
requirement whose claims span areas goes to the area most of them are in, or to cross-cutting.

## Finishing

1. Write the file with the Write tool, at the absolute path your prompt gives.
2. Run the check command. It exits 1 and names every problem: a claim in no area, a slice whose part or claim does
   not exist, a range that runs backwards, an area with no claim, an existing id in no area or in two. Fix each one
   and check again until it passes.
3. Answer with the structured output your prompt asks for: every area's id and title, in the file's order, the
   `everyArea` sources, and every decision you made, such as a source you gave to every area and why.
