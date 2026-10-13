# Extract: a Playwright trace source

A `trace` source is either a directory of Playwright trace zips or a set already mined under
`workareas/trace-requirements/`. Read [`extract.md`](extract.md) first: its rules all hold here.

The method for traces is its own file:
`.claude/skills/requirements-pipeline/references/TRACE_EXTRACTOR.md`. Read it in full and follow it. It covers
both input shapes, the trace CLI, indexing and cutting a corpus into parts, mining a part trace by trace and page by
page, reading an already-mined set, and how each finding becomes a claim. It ends in the same claim shape as every
other extract.

Five things to hold on to:

- **The characterise step indexes the corpus and cuts it into parts; you mine one part.** Your part's `read` names its
  trace zips and the tests they came from. Open and mine **every one** of them: never a sample, and never only the
  richest. Where the corpus folder carries a Playwright `report.json`, use it to map each test to its trace.
- **The trace CLI runs through tim.** Every `playwright trace` subcommand runs as the `tim distil trace` command
  your prompt gives: tim's own options first, then `--`, then the subcommand. tim runs it in your own sub-folder of
  the source's working folder (`--folder part<N>`, or `verify<N>` for a verifier), so the trace you open there is
  yours and an agent running beside you cannot overwrite it. No command needs a `cd` or a `;`. Never run `npx` or
  `playwright` yourself.
- **Write long output to a file** with `--out <file name>`, then Read it from your folder with the Read tool.
- **Claim ids** use the prefix your prompt gives, not `trace-`. Ids must be unique across the workarea.
- **A trace is a lower bound.** A page nobody walked leaves no trace. Write each surface you expected and did not
  find as a `gap` claim.
