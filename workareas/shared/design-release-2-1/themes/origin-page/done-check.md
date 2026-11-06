# Origin page theme: done check

Design Release 2.1, origin page theme. Checked against `main` on 3 November 2026, including Ian's re-distil of the same day.

## The answer

**No, not yet.** 13 of 53 requirements fall short: 12 are partly met and 1 is not met.

Only 2 rows of real work belong to this theme:

- making the country of origin required on the live animals origin page
- sending Back to the overview when the page was opened from there

Most of the other shortfalls are the germinal products set or the notification type page. Neither exists on `main`, and other themes build them.

| Verdict | Count |
|---|---|
| Met | 39 |
| Partly met | 12 |
| Not met | 1 |
| Not applicable (waiting on design) | 1 |
| Total | 53 |

What the answer rests on:

- Each of the 53 requirements was checked against `main` in the animals frontend, plants frontend, tests repo and performance tests, then checked again by a second agent.
- 51 of 53 are proved by a test on `main`. The 2 with no test are the ones not built.
- Plants is fully met. Every shortfall is in animals.

## What falls short

### Ian's two new requirements

Ian's 3 November re-distil added 2 requirements to this theme. Both are partly met.

| Requirement | What it asks | What `main` lacks |
|---|---|---|
| req-032: a country is mandatory | With no country, both save buttons keep the trader on the page, save nothing and show an error in the summary and inline | Live animals saves a page with no country and moves on. Two tests assert that behaviour and must be turned round. The 'To do' task row part already works |
| req-2124: Save and return makes the same checks | Save and return to overview refuses anything Save and continue refuses | The region code and internal reference checks already run for both buttons. The missing-country check is the gap, the same one as req-032. Plants already does all of it |

### Rows the build loop would need

Each row is a thin vertical slice.

| Row | Requirements | What it delivers | Repos |
|---|---|---|---|
| 1. Country of origin is required on the live animals origin page | req-032, req-2124, req-1743 | A missing country is refused on both buttons with 'Select a country from the list', in the summary and inline. The other answers stay on the page, including a typed region code. Turn round the FIT test 'an unanswered country saves the rest of the page and moves on', the controller test and the e2e 'saves what the user has when submitted without a country'. Add an e2e test of both buttons refusing a blank country. Retake the visual baseline if the page changes | animals frontend, tests repo |
| 2. Back goes to the overview when origin was opened from there | req-013 (overview part) | Back follows where the page was opened from, not whether the notification has answers. Today, a notification with no answers opened from the overview sends Back to the list | animals frontend, tests repo |
| 3. Prove the country type-ahead's look and announcements | req-018, req-1909 (test gaps only) | Tests that the search button is blue with a white icon, and that the polite live region announces the result count and the chosen country. The code already does both | animals frontend, plants frontend, tests repo |

Plants appears only in row 3. Plants already makes the country mandatory, and its origin page has no region code or Back link rule in these requirements.

Row 1 also covers req-1743, a region code typed with no country. Once a missing country is refused, the refused page keeps the typed code and nothing is saved, which is what req-1743 asks. Today the code is dropped and the page saves.

### Not built here: handed to other themes

| Requirement | What it asks | Why it falls short | Owner |
|---|---|---|---|
| req-1740 (not met) | Back links on the germinal origin page | No germinal products set on `main` | germinal products theme |
| req-015, req-016, req-018, req-030, req-032, req-2124, req-1909 (germinal parts) | No hint, placeholder, search button, '(parent)' labels, mandatory country, same checks on Save and return, and announcements, on the germinal origin page | No germinal products set. It will pick up the shared type-ahead parts automatically | germinal products theme |
| req-013 (type question and template parts) | Back to the type question, or to the template review | No notification type page and no live animals template editing on `main` | type question theme, templates theme |
| req-054, req-057 (type page parts) | 'Error: ' title, accessible build and Welsh on the type page | No notification type page on `main`. The origin halves are met | type question theme |

### Close without building

| Requirement | Why |
|---|---|
| req-042: server draws the region code prefix, with or without JavaScript | req-040 replaced it with a prefix shown only with JavaScript, and `main` follows req-040. Record req-042 as superseded for the no-JavaScript case. Nothing to build |
| req-020: the prototype's own screen-reader wording | Applies only if design rules against the component's own announcements (question 13). Not applicable until design answers |

## Met but untested

None. Every met requirement has a test on `main`.

Some met requirements have parts that no test checks. The code does them.

| Requirement | Part with no test |
|---|---|
| req-021: picking a country closes the list | That the list closes. This comes from the library |
| req-022: 'No countries found' | That it is a single greyed-out row. There is no e2e test |
| req-031: country not on the list | The inline message, and any FIT or e2e test of the 'no longer available' message |
| req-034: origin task complete | Yes answered with no code held still leaves the task To do |
| req-035: region question | Neither radio is checked on a new notification (only the screenshot shows it) |
| req-037: region code box | Hidden under No or no answer, and the 5-character width |
| req-045: empty region code | The e2e test checks only that the summary appears |
| req-048: internal reference | That it is trimmed, and that a blank saves nothing |
| req-053: refused save | The hidden 'Error:' prefix on inline errors |
| req-055: server-validated form | `novalidate`, crumb and concurrency token. There is no animals test of the 500 re-render |
| req-1753: k6 suite keeps working | No test runs k6 against the frontend |

### Worth knowing

These are outside the requirements but turned up in the check.

- **A failed save says it worked.** Both origin pages show 'Your answers on this page have been saved' after a server failure, because the controller passes no error body of its own (req-055).
- **Port suggestions are bolded too.** That goes against ruling c-284. It is outside this theme.
- **'FR75' is stored as 'FR-FR75'.** Only 'FR-75' is recognised as a typed prefix (req-044). This is a gap only if a prefix typed without a hyphen was meant to count.
- **The Canary Islands are offered for ware potatoes** under Spain. They come from reference data, so req-1915 still holds.

## The old branch

The old branch (`feat/EUDPA-695-design-release-2-1-origin-page`) has nothing left that `main` needs.

Every behaviour and copy change it made is on `main`, often in a newer form. Two of its e2e tests were not carried across:

| Old e2e test | State on `main` |
|---|---|
| A region code typed with no country is kept on the page but saved only once a country gives it its prefix | Not ported. `main` has the opposite test. Row 1 rewrites it |
| The origin task reads Complete only once the region question is answered | Not ported. Unit and FIT tests prove it. Add it to row 1 if wanted |

The order-independent destination-country tests were rightly dropped.

### Its open PRs

All six are still open. All six can be closed.

| PR | Why it can close |
|---|---|
| animals frontend #403 | All its changes are on `main` |
| plants frontend #96 | All its changes are on `main` |
| tests repo #25 | On `main`, apart from the two e2e tests above. Row 1 covers the first |
| INS frontend #50 | No files differ from `main`. It holds only merged journey foundation and reference lists commits |
| reference data #28 | No files differ from `main`. Reference lists work, already merged |
| stub #21 | No files differ from `main`. Reference lists work, already merged |

## Not checked

None. Every requirement in this theme was checked.

Requirements for the notification type question, the reference data service and the stub belong to other themes, and were not checked here.

## Appendix: every requirement

| Id | Requirement | Verdict | Tested | Evidence on `main` |
|---|---|---|---|---|
| req-012 | Title, caption 'About the consignment', heading 'Origin of the import' | Met | Yes | Origin copy and template, shared layout title. Section caption tests, page title FIT test, plants origin FIT test |
| req-013 | Back link by where the page was opened from | Partly | Yes | Back is chosen by whether there are answers. No type question page or template editing. FIT tests for dashboard and hub cases |
| req-014 | Label 'Country of origin' | Met | Yes | Both frontends' origin copy. Tests repo type-ahead test checks the accessible name |
| req-015 | No country hint | Partly | Yes | No hint in live animals or plants. No germinal set |
| req-016 | 'Search for a country' placeholder | Partly | Yes | Live animals and plants. No germinal set |
| req-018 | Decorative blue search button | Partly | Yes | Shared component in both frontends, type-ahead FIT tests. No germinal set. No test of the colours |
| req-019 | Matching letters in bold | Met | Yes | Shared suggestion template. FIT and e2e tests in both domains |
| req-020 | Prototype's own screen-reader wording | Not applicable | No | Waiting on design question 13. Library announcements kept |
| req-021 | Picking a country leaves its name in the box | Met | Yes | Library confirm and `onConfirmFor`. FIT and e2e tests |
| req-022 | 'No countries found' | Met | Yes | Copy and `tNoResults` in both frontends. FIT tests in both |
| req-023 | Country stored as its code | Met | Yes | `toAnswers` stores the code and the subdivision code. Controller, mapper, FIT and e2e tests |
| req-024 | Saved country shown again by name | Met | Yes | `fromAnswers`. FIT ES-CN reopen test, e2e territory test |
| req-025 | Places are what MDM serves for GBNAG_SPS_EX | Met | Yes | Countries service, stub fixture of 40 places. Controller, FIT and e2e list tests |
| req-030 | '<territory> (<parent>)' labels, sorted by label | Partly | Yes | Live animals fully met. No germinal set |
| req-031 | Unlisted and no-longer-available country errors | Met | Yes | `countryMessage` in validate. Controller and FIT tests |
| req-032 | Country of origin is mandatory | Partly | Yes | `oneOf` allows a blank. FIT and e2e assert the countryless save. To do row holds |
| req-034 | Task complete rules | Met | Yes | Origin obligations. FIT tests, task rows test |
| req-035 | Region question legend and radios | Met | Yes | Template and copy. FIT label-size test |
| req-036 | Region hint | Met | Yes | Copy. FIT and e2e tests |
| req-037 | Revealed region code box | Met | Yes | Template conditional. FIT and e2e tests |
| req-038 | Max length 5, autocomplete and spellcheck off | Met | Yes | Template and validate. FIT, controller and e2e tests |
| req-039 | Server refuses a code over 5 characters | Met | Yes | `regionCodeSuffixRule`. Controller, FIT and e2e tests |
| req-040 | JavaScript-only prefix follows the country | Met | Yes | Region code prefix module, `app-js-only`. FIT and e2e tests with and without JavaScript |
| req-041 | Empty prefix before a country is chosen | Met | Yes | Template always renders the prefix. Controller, FIT and e2e tests |
| req-042 | Server-drawn prefix with or without JavaScript | Partly | Yes | Holds with JavaScript. Without it the prefix is hidden by design. Superseded by req-040 |
| req-043 | Prefix is the country or parent code, hidden from screen readers | Met | Yes | `prefixFor`, `parentCountryCode`. FIT and e2e tests |
| req-044 | Code trimmed, upper-cased, stored as prefix-hyphen-suffix | Met | Yes | Validate. Controller, FIT and e2e tests |
| req-045 | Yes with an empty code is refused | Met | Yes | `requiredMaxText`. Controller and FIT tests |
| req-046 | No clears the code, review shows 'Not applicable' | Met | Yes | `regionCodeFrom`, check answers row. Controller, FIT and e2e tests |
| req-047 | Region question may be left unanswered | Met | Yes | `oneOf` with the default message. Controller and FIT tests |
| req-048 | Optional internal reference | Met | Yes | Template, validate, check answers. FIT and controller tests |
| req-049 | Internal reference hint without the length sentence | Met | Yes | Copy. FIT and e2e tests |
| req-050 | Internal reference over 58 characters refused | Met | Yes | `maxText` 58. FIT and controller tests |
| req-051 | Three save controls | Met | Yes | Shared save actions. FIT, opening run and controller tests |
| req-052 | Continues to 'What are you importing?' | Met | Yes | `kit.nextTarget`. Opening run and FIT tests |
| req-053 | Refused save is not stored, 400 | Met | Yes | Origin controller in both frontends. Controller, FIT and axe tests |
| req-054 | Accessible build of type and origin pages | Partly | Yes | Origin half met. No type page on `main` |
| req-055 | Server-validated form with crumb and token, 500 on failure | Met | Yes | Both templates and controllers. Plants controller 500 test |
| req-056 | Three questions at medium size | Met | Yes | Template classes. FIT label-size test |
| req-057 | Welsh for every new or changed string | Partly | Yes | Origin strings complete in both frontends. No type page on `main` |
| req-058 | Visual baseline updated | Met | Yes | Tests repo origin baseline, last changed by design snagging |
| req-1740 | Germinal origin page Back links | Not met | No | No germinal products set on `main` |
| req-1743 | Typed code with no country kept on the page | Partly | Yes | Page saves and drops the code. Kept only when another answer is refused |
| req-1753 | Path and field names unchanged for k6 | Met | Yes | Page slugs and field names in both frontends match the performance tests |
| req-1909 | Library's own screen-reader messages | Partly | Yes | Live animals and plants use the library. Assistive hint tested. No germinal set, no live-region test |
| req-1910 | Alpha phase banner with the real feedback link | Met | Yes | Shared layout and copy. Layout and banner tests |
| req-1911 | Plants origin page | Met | Yes | Plants origin feature. FIT, axe and e2e tests |
| req-1912 | Plants origin save and controls | Met | Yes | Plants controller and obligation. FIT, controller and e2e tests |
| req-1913 | Plants country errors | Met | Yes | `requiredOneOf`, stale country check. FIT, controller and e2e tests |
| req-1914 | Plants countries narrowed by commodity | Met | Yes | Origin constraints, check answers refusal. FIT and e2e tests |
| req-1915 | Ware potatoes inset | Met | Yes | Plants copy and controller. Controller and e2e tests |
| req-1916 | Plants list from GBNAG_SPS_EX, no divider | Met | Yes | Plants countries service and controller. Controller test |
| req-2124 | Save and return makes the same checks | Partly | Yes | Same validation for both buttons. Missing country not refused in live animals. No germinal set. Plants met |
