# Extract: a Playwright trace source

A `trace` source is either a directory of Playwright trace zips or a set already mined under
`workareas/trace-requirements/`. Read [`extract.md`](extract.md) first: its rules all hold here.

The method for traces is its own file:
`.claude/skills/requirements-pipeline/references/TRACE_EXTRACTOR.md`. Read it in full and follow it. It covers
both input shapes, the trace CLI, mining a corpus page by page, reading an already-mined set, and how each finding
becomes a claim. It ends in the same claim shape as every other extract.

Four things to hold on to:

- **The trace CLI runs through tim.** Every `playwright trace` subcommand runs as the `tim distil trace` command
  your prompt gives: tim's own options first, then `--`, then the subcommand. tim runs it in your source's working
  folder, `<workarea>/distil/extract/<slug>.work/`, so the trace you open there is yours and a second trace source
  running beside you cannot overwrite it. No command needs a `cd` or a `;`. Never run `npx` or `playwright`
  yourself.
- **Write long output to a file** with `--out <file name>`, then Read it from the working folder with the Read tool.
- **Claim ids** use the prefix your prompt gives, not `trace-`. Ids must be unique across the workarea.
- **A trace is a lower bound.** A page nobody walked leaves no trace. Write each surface you expected and did not
  find as a `gap` claim.
