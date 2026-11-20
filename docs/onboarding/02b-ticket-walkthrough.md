# Session 2 (deep dive): the `ticket` skill on a real ticket

**Objective:** Watch the `ticket` skill take one real ticket — EUDPA-213,
Java hot-reload — through plan, implement and refactor across four repos,
in the words of the actual transcript.

Companion deck: `02b-ticket-walkthrough.pptx`.

This is the hands-on counterpart to [`02-ticket.md`](02-ticket.md). Where
that page is the usage-focused tour (what the skill is for, how you trigger
it, where you decide), this one is a single worked example built from the
captured logs under
`workareas/ticket-skill-demo/` (not committed) —
`plan.log`, `implement.log`, `refactor.log`. Every terminal snippet on the
slides is lifted from those transcripts.

## The ticket

EUDPA-213 — *Hot-reload Java services in docker-compose-dev (DevTools
parity with frontend nodemon)*. Editing a `.java` file meant
`make docker-restart-backend` and a 20–30s wait; the ask was Spring Boot
DevTools so an edit auto-restarts the service in a few seconds, across
backend, stub and reference-data, with the production image kept clean.

## Plan — the decisions surface as text, before any code

- **It caught that the ticket wouldn't work as written.** DevTools watches
  the *compiled* classpath (`target/classes`), not `src/`, and
  `mvn spring-boot:run` compiles once at startup. So "add DevTools + mount
  src" gives you the restart machinery but nothing ever triggers it — the
  plan flagged this and proposed an in-container recompile step.
- **You argued with it, twice.** A question about `livereload` clarified
  that `restart` (the nodemon equivalent) and `livereload` (a browser ping)
  are independent. A question about how widely used the `fizzed-watcher`
  plugin really is surfaced the numbers — 61 GitHub stars, only a 2015
  artifact on Maven Central — and the approach pivoted to a dependency-free,
  ~10-line in-container `mvn compile` mtime-poll loop.
- **It produced a handover prompt** that front-loads the settled,
  hard-won decisions as non-negotiables, because a fresh agent is most
  likely to "helpfully" undo exactly those (mtime-poll *not* inotify; no
  watcher plugin; `fork` must stay on).

## Implement — canary first, verify every target

- Confirmed the baseline (`mvn verify` green) before touching anything.
- Wired **backend only** first, brought the stack up via the wrapper, edited
  a `.java`, and watched the logs prove it: *"Restarting due to 115 class
  path changes"* → the edited line served on the `restartedMain` thread →
  *"Started Application in 2.619 seconds"* — no manual bounce.
- Only then fanned out to stub (8087) and reference-data (8086), and
  **verified each one live** rather than spot-checking.
- A transient, out-of-scope gateway failure (a Maven Central blip while
  four containers compiled at once) was investigated and explained, not
  waved away as "pre-existing".
- Verified prod exclusion (`unzip -l target/*.jar | grep devtools` empty),
  committed one change per repo on the same branch name, and raised four
  PRs — backend #53, stub #7, reference-data #13, workspace #17.

## Refactor — a quality pass over the diff only

- `shellcheck` was clean, but it found a real latent bug anyway: the
  `find … | grep -q .` change detector is a footgun under `set -o pipefail`
  (`grep -q` exits on first match, `find` takes SIGPIPE, pipefail reads it
  as false — so a busy poll cycle can silently miss edits). The fix is a
  pipe-free `[ -n "$(find …)" ]` test, applied identically across all three
  byte-identical scripts.
- Touching `dev-run.sh` mandated a fresh live canary — re-verified on all
  three services — before committing.
- It also showed restraint: it consciously **left alone** the near-duplicate
  Dockerfile stages, the consistent yml comments, and the redundant-but-
  harmless `compile process-classes` — don't over-engineer.

## The throughline

Challenge before code · you stay the decision-maker · canary first and
verify every target · don't excuse failures · don't over-engineer.

## Live view

Don't memorise this run — read the real thing:

- `workareas/ticket-skill-demo/*.log` — the three transcripts this deck is built from
- `.claude/skills/ticket/SKILL.md` — what the skill actually executes
- `plan / implement / refactor EUDPA-X` — how you launch each phase

## Try it

Pick a real ticket you know and run just the plan phase: "plan EUDPA-XXXX".
No code is written, so it's a safe first run. Open `plan.md` and look for
the same shape you saw here — numbered steps, a risks table, and the
`[NEEDS VERIFICATION]` markers where it wants you to decide.

Back to [Session 2 — the `ticket` skill](02-ticket.md).
