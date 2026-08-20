# The capture spec contract

Read `RUN-BRIEF.md` beside this file first — it carries the firewall, the
applications, the screen list and the knowledge already paid for. This file is
only about the mechanics of a spec.

## What a capture spec is

Plain Playwright that drives one slice of one application and photographs every
screen it reaches. **It is a requirements-gathering tool, not a test.** Nothing
in it asserts that the application is correct. It records what the application
currently does, so that somebody else can compare it against a signed-off
design.

**But every step asserts that the journey landed where it should.** A
mislabelled picture is worse than a missing one: every ruling downstream rests
on the picture being of what it claims. Assert positively —
`await expect(page).toHaveURL(/\/port-of-exit$/)` — never "we are no longer on
the previous page", which is equally true of a redirect back to the hub after a
rejected answer.

## The file

One file per slice, named `<slice>.pw.js`, in:

- `~/git/defra/trade-imports-workspace/workareas/shared/dr1c-parity/specs/frontend/`
- `~/git/defra/trade-imports-workspace/workareas/shared/dr1c-parity/specs/prototype/`

`.pw.js`, **never** `.spec.js` — tim's own vitest run collects `**/*.spec.js`
and would run your spec as a unit test on every commit.

Specs are **ES modules**. There is a `specs/package.json` declaring
`"type": "module"`; do not edit it and do not write CommonJS.

## The one import, verbatim

A spec lives outside any package, so `import '@playwright/test'` resolves to
nothing. It imports exactly one module — the recorder — by the absolute path
`tim` puts in the capture context. Copy this preamble exactly:

```js
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)
```

`test` and `expect` are Playwright's own, re-exported, so the `test` you
register on is the one the runner is driving.

**Do not add any other import**, and never a `node_modules` symlink in the
workarea. There is nothing here to install.

## The recorder

```js
test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(async () => {
  record.write()
})

test('the origin page', async ({ page }) => {
  await page.goto('/origin-of-the-import')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await record.record(page, 'origin-of-the-import')
})
```

`await record.record(page, name)` takes **four things in one page visit** — a
full-page screenshot, an element crop per anchor, a page model and the rendered
HTML — so all four describe the same render.

**The name carries no corpus prefix.** The harness adds `fe-` or `dr1-` from the
corpus profile. Pass `'origin-of-the-import'`, and the screen is recorded as
`dr1-origin-of-the-import`. A spec that spells the prefix itself produces
`dr1-dr1-origin-of-the-import`, which coverage reports as one screen missing and
one screen unexplained.

**`record.write()` in `afterAll` is what writes the manifest rows.** A spec that
forgets it photographs everything and records nothing. `write` folds your rows
into whatever the other specs left, so specs stay independent.

## Journey state does not survive between tests — this is the biggest trap here

**Playwright's `page` fixture is test-scoped.** Every `test()` gets a brand new
browser context with new cookies. Both of these applications keep journey state
in the session, so a second `test()` in the same file starts from an empty
session and a fresh journey — it does **not** continue where the previous one
left off.

`test.describe.configure({ mode: 'serial' })` does not change that. Serial mode
controls ordering and failure propagation, not fixture scope.

So write **one `test()` per spec file** that walks your slice from its entry
point to its end, recording each screen as it passes:

```js
test.describe.configure({ mode: 'serial' })
const record = recorder()
test.afterAll(async () => { record.write() })

test('the consignment slice', async ({ page }) => {
  await page.goto('/create-notification')
  await expect(page).toHaveURL(/\/origin-of-the-import$/)
  await record.record(page, 'origin-of-the-import')

  await page.getByLabel('Country').selectOption('FR')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/what-are-you-importing$/)
  await record.record(page, 'what-are-you-importing')
  // … and so on through the slice
})
```

The 30-minute test timeout is there for exactly this. A slice of ten screens in
one test is the intended shape.

If you genuinely need a second `test()` — to shoot a state that requires a
different journey, say — that test must drive itself from the entry point again.
Say so in a comment, because a reader will otherwise assume continuity.

The alternative — one context created in `beforeAll` and shared — also works,
but you then own its lifecycle, and a crash mid-file leaves it open. Prefer the
single long test unless you can say why not.

## The names must match the enumeration exactly

The screen ids you record are checked against a static enumeration of each
side's screens. Your spawn prompt lists the exact ids your slice owns. **Record
those ids and no others**, minus the prefix.

A name that is one character off is reported twice — once as a screen nobody
captured, once as a capture nobody can account for — and it is the single most
common way a capture pass reads as broken when it is not.

## States

A **state** — an error, a populated list, a conditional reveal open, a filter
panel open, a card at its maximum — is named `<screen>-<state>`:

```js
await record.record(page, 'reason-for-import-transit-revealed')
```

Coverage attributes `<screen>-<state>` to `<screen>` by prefix, mechanically, so
this naming is what keeps a state from reading as a screen nobody can account
for. **A state must start with its page's exact screen name.**

Two consequences worth knowing:

- A capture that only ever shoots `dashboard-empty` and `dashboard-populated`
  leaves `dashboard` reported missing. Shoot the page under its own name too.
- States are how the comparison sees anything conditional. Shoot them
  generously; they are cheap and they are where half the findings live.

## Photograph the screen the design defines

**Empty, before anything is typed into it.** A half-filled form is a screen
nobody specified. Answers are given to move on to the next page, not to dress
the picture. Where a populated view matters, shoot it as a named state as well.

## Configuration you do not write

The runner is configured for you: `workers: 1`, `baseURL` set to your side's
port, viewport 1280x1200, `deviceScaleFactor: 2`, `reducedMotion: 'reduce'`,
test timeout 30 minutes, expect timeout 15s, action timeout 15s, navigation
timeout 30s, trace retained on failure.

So: `page.goto('/origin-of-the-import')` — a path, never a host.

Do not write a `playwright.config.js`. Do not set `test.setTimeout` unless you
have a reason you can state in a comment.

## A generated value makes a screenshot irreproducible

A reference minted per run, printed across thirty pages, produces different
pixels for identical pages. On a previous run that made the report's drift panel
claim 87 moved pictures across 54 findings when nothing had changed — and **a
panel that fires every time teaches its reader to skip it**, which is worse than
no panel.

Mask it in the live DOM before the shot:

```js
await page.evaluate(() => {
  for (const el of document.querySelectorAll('[data-reference]')) {
    el.textContent = 'AAAA-0000-AAAA'
  }
})
```

Fix it at the capture, never by teaching a downstream check to forgive it. Say
in a comment what you masked and why.

## Do not import the application

Nothing in your spec may `require` or `import` either application's own test
helpers, journey drivers, page objects or fixtures. Those suites are
unmaintained, and a capture built on one breaks the first time somebody
refactors a suite nobody runs — and it makes this comparison a hostage to
another repo's test code.

**Re-derive the widget handling in the spec, where it is visible.**

## When a spec cannot reach a screen

Say so, say why, and leave it uncaptured. A screen that is genuinely unreachable
is a **stated absence** — a real answer the comparison records. **A wrong picture
is worse than none.**

Write the reason as a comment in the spec at the point you gave up, and repeat it
in your report to the parent. Do not record a picture of a different page under
the missing page's name to make a number go green.

## A serial block turns one failure into several

`mode: 'serial'` means a failed test skips the rest of the file. Before writing a
screen up as unreachable, check whether a test **above** it failed. One real
failure once presented as two, and a screen was recorded as never reached when it
had never been broken.

## You do not run the capture

**Captures cannot run in parallel** — one server, one session. The parent
serialises every run. Write your spec, self-review it against this file, and
report. Do not run `tim parity capture`, and do not run Playwright directly.

On a failed run the parent will send you the failure. The run directory survives
under `~/git/defra/trade-imports-workspace/tim/.parity-runs/`, and
`test-results/*/error-context.md` in it holds a full accessibility snapshot of
the failing page — the fastest way to see what state the run was actually in.

## Self-review before you report

- Every screen id in your spawn prompt is recorded, or has a stated reason.
- No id carries a corpus prefix.
- Every state name starts with its page's exact screen name.
- `record.write()` is in `afterAll`.
- Exactly one import, and it is the recorder preamble.
- Every `record` is preceded by a positive assertion that you are on that page.
- No assertion anywhere claims the application is correct.
- Nothing imports the application's own test code.
- Anything minted per run is masked, with a comment saying why.
