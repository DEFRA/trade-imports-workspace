# Design snagging B on laptop B: hand-back report (22 to 23 October 2026)

## Outcome

**5 of 5 rows landed (100%).** Nothing is merged, un-drafted or approved: the branch waits for Sam's technical review.

| Row | What | Landed in run | CI |
|---|---|---|---|
| inc-217 | Declaration and Notification submitted pages | wf_78986091-ecb | green |
| inc-214 | Identification details | wf_c243a700-063 (attempt 2) | green |
| inc-216 | Check your answers: no red bar on a missing answer | wf_bcb895f8-7f4 | green |
| inc-219 | CPH number | wf_bcb895f8-7f4 | green |
| inc-221 | Final tidy | wf_b0b97d44-50f (attempt 3) | green, then see the theme review below |

Pull requests on `feat/EUDPA-720-design-release-2-1-design-snagging-b`:

- animals frontend [#423](https://github.com/DEFRA/trade-imports-animals-frontend/pull/423): CI green
- plants frontend [#114](https://github.com/DEFRA/trade-imports-plants-frontend/pull/114): **CI red** on SonarCloud
  (below)
- tests [#47](https://github.com/DEFRA/trade-imports-ins-tests/pull/47): CI green

**The theme's engineering review** fixed 25 findings across the theme in animals `5e73ec2e`, plants `d74ba1d` and tests
`05e9db8`. Its commit then turned plants #114's SonarCloud gate red on **one new major issue**: `javascript:S138` in
`address-book-picker/picker-routes.js:52`, a function of 102 lines against a limit of 75. The run stopped at `ci-red`.
Coverage 99.3%, duplication 0%.

**Laptop A's branch merged in cleanly**, in two steps: inc-217 merged it as it stood on 22 October (all three repos), and
inc-221 merged its tip of 23 October morning (animals `e6caf32b`, plants `b680bcf`, tests `e71852c`), conflicts resolved
by the implementor and verified green. **Laptop A pushed 7 more test-only commits at 10:26 to 10:58 on 23 October**, after
inc-221's merge; they are not on this branch (animals `08afa644`, `a448d0f6`; plants `e6716e9`, `713cc96`; tests
`54a08ca`, `05b9b1a`, `9bc17b3`). `main` has nothing this branch lacks.

The workspace branch `feat/NO_JIRA-design-release-2-1-snagging-b` is merged into `feat/NO_JIRA-design-release-2-1` and
pushed (`201d21db`). Coverage conflicts took this branch's side: its test titles are the ones on the B branch, and its
theme review cut the coverage notes that narrated branch history (judge findings 59 and 60).

## Open for Sam

- **Plants #114 SonarCloud S138** on the theme review's commit: split `picker-routes.js:52`. Not repaired: a CI stop is
  reported, not fixed by hand.
- **Spec check:** `SCN-CYA-003-A` (a draft's review back link opens the notification list) has no proving test. Its own
  coverage note says overview-and-review's draft review row builds it, so it belongs to that theme, not a gap here.
- **Your 23 October review of inc-221 was not built.** It reached the programme branch at 09:50 to 09:57, after
  attempt 3 launched (09:29), so the run never read it: (1) one HTML parser for tests, cheerio to jsdom (low priority);
  (2) a no-JavaScript test that picks a transporter from the narrowed list and saves it, in `transporters.fit.spec.js`.
  Proposed: a follow-up row that also merges laptop A's 7 newer commits.
- **Prototype mismatches** from the retaken screenshots: `screens/comparison.md`. Every snag is met; mismatches are the
  identification page's heading sizes, an extra "animal" in its inset, wider identifier inputs and the Draft line, a
  paragraph gap on the submitted page, and review page card names and sub-headings outside S34.
- **Refuted findings** to read: 9 dropped as refuted across the theme (in run wf_b0b97d44-50f's `refutedFindings`).
- **Parked:** none. **Deferred:** inc-217's confirmation spec move and inc-219's slashed CPH on the addresses page,
  both owned by overview-and-review, and the build loop's resume gap, all in `../../deferred.md`.

## Cost: the five most expensive and five slowest stages, across all eight runs

| Most tokens | | Slowest row stages | |
|---|---|---|---|
| inc-221 implement (attempt 3) | 146.4M, 57 min | inc-214 fix | 64 min |
| inc-221 implement (attempt 1) | 100.6M, 37 min | inc-221 implement (attempt 3) | 57 min |
| inc-221 fix (attempt 3) | 55.8M, 31 min | inc-217 ci watch | 48 min |
| inc-214 implement | 46.8M, 38 min | inc-214 baseline (overloaded) | 44 min |
| inc-221 fix (attempt 1) | 36.4M, 26 min | inc-221 theme fix | 39 min |

Eight runs, 343 agents, about 814M tokens. inc-221's first attempt (223M tokens, 2h 39m) was thrown away over one
environment problem (below); `../../deferred.md` now records the resume-from-stage gap that would have saved it.

## Performance

Judged against `.claude/skills/requirements-pipeline/references/machine-tuning.md` (measured standalone on 22
October: plants FIT 82s and animals FIT 234–265s at 4, ins FIT 13s at 3, full E2E 363s at 3). Overload signs: a rung over
1.5× its baseline, swap beyond the idle baseline, a shell start over 100 ms, a test timeout or FIT's 900s limit, Docker
quitting. Idle baseline: 2,494 MiB swap in use, 0 pages swapped out, worst shell 11 ms. Full working notes, every 30-
minute sample and each window's swap and shell readings: `workareas/machine-tuning/snagging-b/notes.md` (local, not
tracked).

### Every gate's FIT and E2E rungs

FIT animals / plants and E2E, workers in brackets, seconds; "env" is an environment fault, "code" a code fault, neither
load.

| Gate | animals FIT | plants FIT | E2E | Outcome | Peak swap out in the window | Worst shell |
|---|---|---|---|---|---|---|
| inc-217 a1 baseline | 248 (4) | 85 (4) | 372 (3) | red: animals unit, jsdom not installed (env) | ~20k pages | 34 ms |
| inc-217 a2 baseline | **311** (4) | 96 (4) | 353 (3) | green | **~68k** | 60 ms |
| inc-217 implementor FIT | 303 (3) | 106 (4) | – | green | 0 | 72 ms |
| inc-217 fixer FIT | 294 (3) | 96 (4) | – | green | 0 | 68 ms |
| inc-217 ladder | 327 (3) | 106 (4) | 458 (3) | green | 0 | 68 ms |
| inc-214 a1 baseline | 296 (3) | **414** (4) | **1,822** (3) | red: E2E test timeouts (load) | ~0 host; load 258 | **524 ms** |
| inc-214 a2 baseline | 323 (3) | 111 (3) | 466 (3) | green | ~34k | 142 ms |
| inc-214 implementor FIT | 351 (3) | 113 (3) | – | red: copy key (code) | ~5k | 16 ms |
| inc-214 fixer FIT | 320 (3) | 118 (3) | – | green | ~6.5k | 47 ms |
| inc-214 second fixer FIT | **895** (3) | 168 (3) | – | green: the laptop idle-slept | asleep | 105 ms |
| inc-214 ladder | 297 (3) | 99 (3) | 460 (3) | green | 0 | – |
| inc-216 baseline | 309 (3) | 102 (3) | 414 (3) | green | ~1.9k | 65 ms |
| inc-216 implementor FIT | 307 (3) | 109 (3) | – | green | ~1.9k | 65 ms |
| inc-216 ladder | 313 (3) | 105 (3) | 429 (3) | green | ~7k | 110 ms (push) |
| inc-219 baseline | 300 (3) | 100 (3) | 417 (3) | green | **0** | 48 ms |
| inc-219 implementor FIT | 317 (3) | 105 (3) | – | green | ~5k | 183 ms (unit start) |
| inc-219 fixer FIT | 317 (3) | 105 (3) | – | green | ~5k | 183 ms (unit start) |
| inc-219 ladder | 332 (3) | 108 (3) | 435 (3) | green | ~8.7k | 114 ms |
| inc-221 a1 baseline | 302 (3) | 100 (3) | 429 (3) | green | ~24k | 92 ms |
| inc-221 a1 implementor FIT | 377 (3) | 153 (3) | – | red: GOV.UK error colour (code) | ~8.7k | 18 ms |
| inc-221 a1 fixer FIT | 312 (3) | 113 (3) | – | green | ~28k | 194 ms (unit start) |
| inc-221 a1 ladder | 327 (3) | 116 (3) | 581 (3) | red: stale INS frontend clone (env) | – | – |
| inc-221 a2 baseline | 299 (3) | 97 (3) | 431 (3) | red: the mirror, old tests on the new INS frontend (env) | **~67k** (stack start) | 239 ms |
| inc-221 a3 baseline | 328 (3) | 110 (3) | 434 (3) | green, INS frontend pinned at 6132cb3 | 0 | 17 ms |
| inc-221 a3 implementor FIT | 326 (3) | 121 (3) | – | green | 0 | 25 ms |
| inc-221 a3 fixer FIT | 325 (3) | 121 (3) | – | green | ~46k | 169 ms (unit start) |
| inc-221 a3 ladder | 346 (3) | 122 (3) | 516, then 503 (3) | red, repaired: CPH test asserted a rule the page lacks (code) | ~58.6k | 186 ms |
| theme fixer FIT | 336 (3) | 124 (3) | – | green | ~42k | 191 ms (unit start) |
| theme fixer FIT, second | 347 (3) | 125 (3) | – | green | ~42k | 191 ms |
| theme ladder | 353 (3) | 125 (3) | 527, then 530 (3) | red, repaired (code) | 0 | 174 ms |

The suites grew during the build (animals FIT 477 to 622 tests, plants FIT 254 to 302, E2E 374 to 504 with laptop A's
work), so the later rungs' 1.1–1.4× over the standalone baseline is mostly more tests. FIT's 900s limit never fired; the
one near miss (895s) was the laptop asleep, not load.

### Tuning changes

| When | Setting | From | To | Evidence | What the next gates showed |
|---|---|---|---|---|---|
| 22 Oct 11:18 | animals FIT workers | 4 | 3 | inc-217 baseline: 311s (1.33×), ~68k pages swapped in the FIT layer, load 40 | 303s, 0 swapped, shell 72 ms; animals at 3 stayed 294–353s for the rest of the build |
| 22 Oct 14:32 | plants FIT workers | 4 | 3 | inc-214 baseline: plants FIT 414s (5×), load 258, shell 524 ms, E2E timed out | plants 111s and E2E 466s green; plants stayed 97–125s after |

Two more changes outside `machine.json`, both agreed with Sam:

- **The loop's stages now use the machine's counts.** Probes, plan checks and reviewers ran `test:fit:ci` directly at
  its `--workers=100%` (10 browsers), swapping 208k pages in 20 seconds on 22 October. From inc-214's relaunch every
  stage run used 3 workers and those bursts stopped (PR #145).
- **The settings live in the workspace**, in the gitignored `config/machine.json`, and `tim build tune` measures a
  machine and writes it (PR #145, not merged). Its dry run on laptop B picked 3 for every rung, matching the hand-tuned
  file.

### `machine.json` as it ended

`config/machine.json` (gitignored; `~/.config/tim/machine.json` removed):

```json
{
  "parallelRepos": 1,
  "stackAfterLocal": true,
  "workers": {
    "trade-imports-plants-frontend/fit": 3,
    "trade-imports-animals-frontend/fit": 3,
    "trade-imports-ins-frontend/fit": 3,
    "trade-imports-ins-tests/e2e": 3
  }
}
```

### Recommendations (for Sam to decide; nothing committed)

- **`config/machine.example.json`:** take plants and animals FIT to 3. The example's 4/4 was measured with only the suite
  running; under a build (stack up, agents and unit runs beside the gate) 4 swapped and overloaded, and 3 held all day.
- **`machine-tuning.md`:** say the numbers are for a machine that is also running the build, not idle; measure with
  `tim build tune`; and note that the measured suites grow, so re-tune after a big merge.
- **`tim build tune`'s rule:** back off while a count still swaps, not just once. Its dry run kept animals at 3 although
  3 swapped 31,584 pages; 2 (417s) did not.
- **Unit runs have no worker cap.** After the FIT and E2E changes, unit gates (vitest takes every core) were the only
  thing pushing shell starts past 100 ms (up to 242 ms). A `unit` worker setting would close that.
- **Keep the machine awake.** The gate should hold an idle-sleep block while it runs; a one-minute system sleep setting
  turned a 300s FIT into 895s.
- **Stack starts are the largest single swapper** (up to 67k pages in one sample). Fewer stops and relaunches, which the
  resume work would bring, means fewer stack starts.
- **Check stack repos at the baseline.** A stack repo the row does not build, behind its origin, cost inc-221 a whole
  attempt; the baseline should warn, and a merge row's ladder should get the stack its merged tests need.

## Handover

```
Resume the design-release-2-1 design snagging B build with the requirements-pipeline skill's BUILD phase.

workarea     shared/design-release-2-1/themes/design-snagging-b
branch       feat/EUDPA-720-design-release-2-1-design-snagging-b
lifecycle    branch
scope        design-release-2-1-design-snagging
executor     claude
jiraProject  null
epic         null
inDev        null
doneStatus   null
board        null
repos        {"frontend":{"path":"repos/trade-imports-animals-frontend","github":"DEFRA/trade-imports-animals-frontend"},"tests":{"path":"repos/trade-imports-ins-tests","github":"DEFRA/trade-imports-ins-tests"},"plantsfrontend":{"path":"repos/trade-imports-plants-frontend","github":"DEFRA/trade-imports-plants-frontend"}}
models       {}, the recommended split (think opus, code sonnet, light haiku)
stopAfter    all

Stopped: ci-red. Last landed inc-221 (animals #423, plants #114, tests #47; no Jira on the branch lifecycle).
0 todo remain, 0 blocked, 0 dropped.
Parked: none
Owed to a human: Sam, plants #114 SonarCloud S138 on picker-routes.js:52 from the theme review's commit d74ba1d; Sam's
23 Oct review of inc-221 (cheerio to jsdom; a no-JS transporter pick-and-save test) and laptop A's 7 newer test commits,
not yet on this branch.
Review checks for the end of the theme: 9 refuted findings across the theme; the theme engineering review's commits
animals 5e73ec2e, plants d74ba1d, tests 05e9db8; SCN-CYA-003-A unproven (overview-and-review's).
Refuted findings not yet reviewed: the 9 in run wf_b0b97d44-50f's refutedFindings.

Read workareas/shared/design-release-2-1/PROGRAMME-NOTES.md (none exists) and deferred.md before the first increment.
Raise Dynamic workflow size in /config first.
```
