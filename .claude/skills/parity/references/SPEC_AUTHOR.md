# SPEC_AUTHOR

You own one slice of one side's journey. You read that application's views and
routes and write plain Playwright that drives your slice and photographs every
screen it reaches.

**Bash call hygiene** — one command per Bash call. No `&&`, no `;`, no `cd`.
Use `~/git/defra/trade-imports-workspace/...`, never a literal `/Users/` path.
Full rule table: `docs/agent-skills.md` → "Bash call hygiene".

## This is a requirements-gathering tool, not a test

**Nothing you write asserts that the application is correct.** You are recording
what it currently does so it can be compared against a definition. That is why
these specs live in the workspace and not in either application's repo, and it
is why a spec that fails is a spec that could not reach a screen — never a
finding.

**But every step asserts that the journey landed where it should.** A
mislabelled picture is worse than a missing one: every ruling downstream rests on
the picture being of what it claims. Assert the landing URL or the heading
positively — `toHaveURL(/\/port-of-exit$/)`, not "no longer on the previous
page", which is equally true of a redirect back to the hub after a rejected
answer.

## The shape

One file per slice, `<slice>.pw.js`, in `<workarea>/specs/<side>/`. Read an
existing one before writing: `workareas/shared/dr1-parity/specs/frontend/` has
six, and `specs/prototype/` six more.

```js
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

test.describe.configure({ mode: 'serial' })
const record = recorder()
test.afterAll(() => { record.write() })

test('records the hub', async ({ page }) => {
  await openHub(page)
  await record.record(page, 'hub')
})
```

`record.record(page, name)` takes **four things in one page visit** — a
full-page screenshot, an element crop per anchor, a page model and the rendered
HTML — so all four describe the same render. The name has no corpus prefix; the
harness adds it.

`record.write()` in `afterAll` writes the manifest rows. A spec that forgets it
photographs everything and records nothing.

## Photograph the screen the design defines

**Empty, before anything is typed into it**, unless the finding needs otherwise.
A half-filled form is a screen nobody specified. Answers are given to move on to
the next page, not to dress the picture.

A **state** — an error, a populated list, a conditional reveal, a filter panel
open — is named `<screen>-<state>`. `coverage` attributes those to their page
mechanically, so the naming is what keeps them from reading as screens nobody
can account for.

## Do not import the application

Nothing here may `require` the application's own test helpers, journey drivers
or fixtures. The retired harness did, and it is the one thing carried over that
must not be: those suites are unmaintained, and a capture built on one breaks
the first time somebody refactors a suite nobody runs. It also makes the
comparison a hostage to another repo's test code.

**Re-derive the widget handling in the spec, where it is visible.**

## Knowledge already paid for

Every one of these cost a failed run. They are about the applications compared
so far; expect your own to have its own list, and write it down when you find it.

- **A search widget posts a HIDDEN input, and its open results panel overlays
  the buttons and swallows the mousedown.** Clicking Continue while it is open
  reaches nothing — no error, no navigation, no POST. Dismiss the panel, then
  assert the hidden field is non-empty.
- **An answered item in a hub still renders a link.** A "Change" link sits in
  the same container with the same classes as an "Add" link, separated by one
  extra class. A loop driving off "any link" reopens the first section forever.
  Two agents wrote that bug independently.
- **A serial describe block turns one failure into several.** Before writing a
  screen up as unreachable, check whether the test above it failed. One real
  failure once presented as two, and a screen was recorded as never reached when
  it had never been broken.
- **The hub is not the only way into a page.** Some pages are reachable by
  walking the journey forward and not from the hub at all. If a hub row is dead,
  try the journey before concluding the page cannot be captured.
- **Select by value, not by visible text**, where the list is refetched from a
  reference service in one mode and a fixture in another. The code is the half
  that survives, and a list carrying "Netherlands (the)" is what a name-matched
  locator trips over.
- **A field seeded with `"[]"` on page load** passes "assert not empty" before
  anything is selected. Assert against `/^(\[\])?$/`.
- **A date with a moving valid window** derived from `new Date()` expires a
  hardcoded value silently.
- **The declaration is a checkbox, not a radio.**
- **The GOV.UK Prototype Kit bounces nodemon while recompiling.** Wrap the first
  navigation in `expect(async () => {…}).toPass({ timeout: 240_000 })`.
- **Dismiss the MoJ date picker with Escape**, and type into the input rather
  than driving the calendar.

## A generated value makes a screenshot irreproducible

A reference minted per run, printed on thirty-two pages, produced different
pixels for identical pages and made the report's drift panel claim 87 moved
pictures across 54 findings when nothing had changed. **A panel that fires every
time teaches its reader to skip it, which is worse than no panel.**

Mask it in the live DOM before the shot. Fix it at the capture, never by
teaching a check to forgive it.

## When a spec cannot reach a screen

Say so, and say why, and leave it uncaptured. A screen that is genuinely
unreachable is a **stated absence** — a real answer that the comparison records.
A wrong picture is worse than none, and **never mark a capture complete that is
not.**

On a failed run the directory survives under `tim/.parity-runs/`. Read
`test-results/*/error-context.md` in it: it holds a full accessibility snapshot
of the failing page, which is the fastest way to see what state the run was
actually in.

## What you never do

- **Never run the capture yourself in parallel with another.** One server, one
  session, `workers: 1`. The writing fans out; the running is serialised by
  whoever spawned you.
- **Never import the application's test code.**
- **Never assert the application is correct.** That is a finding, and findings
  are written from the pictures you take, by somebody else.
- **Never photograph a page without asserting you are on it.**
- **Never leave `record.write()` out.**
