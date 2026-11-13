# Theme engineering and style review — findings not fixed

EUDPA-796, identification and permanent address. Six reviewers (engineering and style per repo), adversarial verify, then judge.
Raw 62, confirmed 49, refuted 13. Fixed on the branch: 16. Recorded here: the rest.

## n2 — DEFER — major/patterns

**frontend:src/server/app/sets/live-animals/journeys/linear/features/addresses/party-edit/address-rules.js:28**

`AUTOCOMPLETE_TOKENS` and `FIELD_CLASSES` were added here for the permanent address page to read, and the doc comment says they are "as party-edit.njk's inputs are built" — but `party-edit.njk` still hard-codes `autocomplete: "organization"`, `classes: "govuk-!-width-two-thirds"`, `"govuk-input--width-10"` etc. inline on all eight inputs. One rule (which autocomplete token and width class each address field carries) is now written in two places, and the comment describes another module.

*Proposed fix:* Have `party-edit.controller.js` build its field list from `AUTOCOMPLETE_TOKENS`/`FIELD_CLASSES` and have `party-edit.njk` loop over that list — the way `permanent-address/template.njk` loops over `card.addressFields` — then delete the hard-coded tokens and classes from the template and the "as party-edit.njk's inputs are built" comment.

*Judge:* The duplication is real, but the remedy rewrites party-edit.njk and its controller to loop over a field list — a restructure of a page this theme does not otherwise change, with regression risk on eight live inputs. With the misleading comment deleted (finding 26, fix-now), what is left is two literal sources that a later change can unify.

## n6 — DEFER — minor/naming

**frontend:src/server/app/sets/live-animals/journeys/linear/features/permanent-address/cards.js:33**

The permanent address form names its first field `nameOrOrganisationName` while the shared party model that `address-rules.js`, `formValuesOf` and `partyFrom` own names it `name` — both with the identical label "Name or organisation name". Bridging the two costs `PARTY_SOURCE_FIELD` plus the same `PARTY_SOURCE_FIELD[x] ?? x` one-liner written three times (`cards.js:73`, `cards.js:81`, and `partyFieldFor` in `validate.js:29`).

*Proposed fix:* Rename the page's field to `name` to match `FIELD_RULES`, then delete `PARTY_SOURCE_FIELD`, `partyFieldFor` and the two inline `?? field` lookups; `addressFormValuesOf` collapses to picking `ADDRESS_FIELDS` straight out of `formValuesOf(party)`.

*Judge:* Real "one concept, one name" tension, but the rename touches cards.js, validate.js, answers.js, copy keys, specs and tests, and it would put the page's field vocabulary at odds with the pre-existing transporter pages that already use nameOrOrganisationName. That is a call to make deliberately, not a pre-merge patch; two of the finding's supporting rationales were also struck by the verifier.

## n8 — DEFER — nit/tests

**frontend:src/server/app/sets/live-animals/journeys/linear/features/permanent-address/permanent-address.fit.spec.js:22**

The error-page-title assertion recipe — `const { serviceName, govukSuffix, errorTitlePrefix } = sharedCopy.layout` plus `` expect(page).toHaveTitle(`${errorTitlePrefix}${title} - ${serviceName} - ${govukSuffix}`) `` — is now repeated verbatim in four fit specs (`permanent-address`, `contact`, `cph-number`, `page-title`), three of them written or extended by this theme. `fit/live-animals-journey.js` has no helper for it.

*Proposed fix:* Add `expectErrorPageTitle(page, pageTitle)` (and a plain `expectPageTitle`) to `fit/live-animals-journey.js`, and replace the four local destructures and template literals with calls to it.

*Judge:* True shared-helper duplication that this theme tripled, but the fix adds two helpers and edits four slow fit specs for no behavioural gain; a title-format change fails loudly rather than silently. Worth doing in a later test-support pass.

## n9 — DEFER — nit/structure

**frontend:src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/consignment/species/identifier-columns.js:2**

This file imports `scopedFields` from `animal-identification.controller.js`, which exists only to re-export it (`export { scopedFields }` at controller line 31, now its sole re-export after `IDENTIFIER_LABELS` was dropped). Every other importer — including the permanent address feature this theme added (`permanent-address/cards.js:3`) — imports it from `identifier/fields.js` directly.

*Proposed fix:* Import `scopedFields` from `../../../../../commodities/animal-identification/identifier/fields.js` here and delete the `export { scopedFields }` re-export from `animal-identification.controller.js`.

*Judge:* A two-path import and a dead re-export, but this is a move of where code lives with no behavioural or divergence risk, and the import path it uses still resolves to the same pure function. Fold it into the next change in that area.

## n10 — DEFER — nit/tests

**frontend:src/server/app/contract.test.js:316**

The permanent address contract case imports `cardKeyFor` from the feature but then hand-builds every control name by inlining `fieldNameFor`'s body — `` [`option-${key}`] ``, `` [`nameOrOrganisationName-${key}`] `` and six more — rather than calling the exported `fieldNameFor` the feature's own tests use.

*Proposed fix:* Import `fieldNameFor` alongside `cardKeyFor` and build the payload keys with it, as `permanent-address/controller.test.js` does.

*Judge:* Half-derived payload keys in a contract test are a genuine inconsistency, but the surrounding contract cases deliberately spell the literal wire format and the change buys no new coverage. Low value against a re-review.

## n11 — DEFER — nit/tests

**frontend:src/server/app/sets/live-animals/journeys/linear/features/permanent-address/permanent-address.fit.spec.js:32**

`const MICROCHIP_FIELD = '#animalIdentifierMicrochip-0'` is declared here and identically in `features/commodities/fit/identification.fit.spec.js:46`, and the same selector is written a third time inline inside the shared helper `identifyAnimalsByMicrochip` (`fit/live-animals-journey.js:995`) that this theme added.

*Proposed fix:* Export the microchip field locator (e.g. `identifierFieldFor(page, 'animalIdentifierMicrochip', lineIndex)`) from `fit/live-animals-journey.js` and have both specs and `identifyAnimalsByMicrochip` use it.

*Judge:* Real triplication of a field-id literal, but closing it needs a new exported locator helper and also touches a pre-existing spec outside this theme. No silent-failure risk — a selector change turns the specs red.

## n15 — DEFER — nit/tests

**backend:src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationControllerTest.java:381**

The two new fields are proved only in a MockMvc test whose service is stubbed with `any(NotificationDto.class)` and whose response is rendered from `savedNotification`, the object the test itself built. The assertions therefore prove Jackson can serialise `AnimalIdentifier` on the way out; nothing asserts that the posted JSON's `identificationDetails` and `description` were bound on the way in, which is what the test name (`post_shouldAcceptNotificationWithRegionOfOriginCodeAndPerUnitAnimalIdentifiers`) claims. No integration test covers per-unit identifiers at all — `AnimalIdentifier` appears in only three test files, none of them `NotificationIT`.

*Proposed fix:* Add the two fields to a real round trip in `NotificationIT` (post the notification, read it back, assert both values), rather than widening the stubbed controller test further.

*Judge:* The gap in this repo's own ladder is real, but the branch's new ins-tests E2E does exercise the full round trip through bind and persistence, so the stated silent-drop consequence does not hold. Adding the NotificationIT assertions is worthwhile but not merge-blocking.

## n20 — DEFER — minor/structure

**tests:flows/animals/journey.ts:613**

`answerPermanentAddresses` takes a second answer channel, `addressPerAnimal: PermanentAddressAnswer[]`, indexed by a flat `cardsAnswered` counter that runs across every line, beside the per-line `line.permanentAddress` the answers data already carries. The only caller passes it positionally from inside `walkCatsByAir` (journey.ts:1029-1032), so a mixed choice cannot be expressed in the answers at all.

*Proposed fix:* Let the answer type say it: make the line's permanent address answer a list (one entry per animal, falling back to a single entry for all), so a mixed choice is `{...MANDATORY_COMMODITY_LINES.domesticCat, permanentAddress: [{origin:'placeOfDestination'}, {...}]}` and `answerPermanentAddresses` needs one parameter.

*Judge:* Real structural wart — a positional per-card override array beside the per-line answer — but the remedy changes the answer type's shape, and the verifier showed the index-drift scenario cannot fire from the single caller. Needs a deliberate answer-model decision, not a pre-merge patch.

## n21 — DEFER — minor/patterns

**tests:tests/animals/e2e/pages/animal-identification.spec.ts:91**

This change introduced card-scoped accessors on the page object (`cardEarTag`, `cardPassport`, `cardSaveControl`, …) and converted journey.ts and one new test to them (lines 136-145), but the other test it added in the same file reaches into the card raw: `bosTaurus.getByLabel('Ear tag', { exact: true })` and `bisonBison.getByRole('button', { name: 'Save and add another' })` (lines 91-97), as does the test it edited at lines 156 and 166. The a11y suite's card fills (tests/animals/a11y/notification-journey-conditional-pages.spec.ts:97-102) were left raw too.

*Proposed fix:* Use `animalIdentification.cardEarTag(card)`, `cardPassport(card)` and `cardSaveControl(card)` in the tests this change wrote or edited, and convert the a11y spec's card fills in the same pass so one mechanism addresses a card's fields.

*Judge:* Genuine inconsistency in the theme's own file, but a three-locator swap with no silent-failure risk: a label change turns these tests red loudly. The a11y limb of the proposed fix is out of this theme's diff and should be dropped.

## n22 — DEFER — minor/patterns

**tests:tests/animals/e2e/pages/permanent-address.spec.ts:48**

The spec retypes strings the page object already owns: 'Enter a new address' (lines 48, 95, 140) is `NEW_ADDRESS_OPTION` in page-objects/animals/permanent-address-page.ts:6, and 'Name or organisation name' (lines 49, 93, 141) is one of the labels `fillNewAddress` owns.

*Proposed fix:* Add card-scoped accessors to the page object — `newAddressOption(card)`, `placeOfDestinationOption(card)`, `cardField(card, 'name')` or a named getter per field — and have the spec assert through them, so the option and field labels are written once.

*Judge:* Locators belong on the page object, but the consequence is loud redness rather than a wrong result, and the fix needs new accessors plus five spec edits. Fold it into the next pass on that page object.

## n23 — DEFER — nit/patterns

**tests:page-objects/animals/permanent-address-page.ts:51**

`fieldErrorMessage(card, label)` is a second mechanism for locating a field's inline error: it is async, resolves the field id with `getAttribute('id')` and returns a `Promise<Locator>`, whereas the repo locates inline errors with plain getters over `#<fieldId>-error` (page-objects/animals/arrival-details-page.ts:52,56; accompanying-documents-page.ts:81) and has `fieldHint(fieldId)` on `NotificationPage` (page-objects/shared/base-page.ts) for the same id-plus-suffix shape. `getAttribute` can also answer null, which silently builds the selector `#null-error`.

*Proposed fix:* Add `fieldError(fieldId)` beside `fieldHint(fieldId)` on `NotificationPage`, and give this page a synchronous `cardFieldError(card, label)` that scopes `.govuk-error-message` to the labelled field's form group, so callers keep Playwright's lazy-locator shape and no `await` is needed before `expect`.

*Judge:* The suite already has an idiom for field errors (toHaveAccessibleDescription) and this adds a second route to it, but the verifier knocked down the #null-error and auto-retry arguments, and the id resolution is a reasoned response to per-card ids. Worth replacing later, not merge-blocking.

## n25 — DEFER — nit/style

**tests:page-objects/shared/base-page.ts:27**

The doc comment `/** An optional `return=` marker followed by an optional trail. */` sits above `OPTIONAL_RETURN_AND_TRAIL_PATTERN` and says only what the name already says.

*Proposed fix:* Delete the comment; the constant's name and the two parameter names below it carry the meaning.

*Judge:* A restating doc comment on an internal constant is a real breach, but it is one line of pure tidiness with no risk either way. Delete it the next time that file is opened.

## n30 — DEFER — minor/structure

**frontend:src/server/app/sets/live-animals/journeys/linear/features/permanent-address/template.njk:52**

The new template builds the `govukRadios` items inside the template with a push-plus-comma expression: `{% set radioItems = (radioItems.push({...}), radioItems) %}`. No other template in the repo does this — every other page hands `govukRadios` an `items` array the view model already built (`contact/template.njk:30` passes `contactOptions`; `transporter-add`, `import-reason`, `additional-details` all pass literals).

*Proposed fix:* Each card has exactly two options, so write the two item objects literally in the `govukRadios` call, putting `conditional: { html: newAddressHtml }` on the second; or have `buildCard` emit the finished `items` array and keep only the conditional html in the template. Either way drop the `radioItems` accumulator.

*Judge:* The comma-expression accumulator is the only one of its kind in the repo and origin/template.njk shows the house way, but this is readability on a working, fit-covered template. Rewrite it when that page is next opened.

## n31 — DEFER — minor/structure

**frontend:src/server/app/sets/live-animals/journeys/linear/features/addresses/controller.js:147**

`sections()` now mixes two ways of conditionally including a section in one array literal: the CPH section uses `...(cond ? [cphSection(...)] : [])` on line 144, and the permanent-address section immediately below uses `...[permanentAddressSection(...)].filter(Boolean)`, which depends on the builder returning `null`.

*Proposed fix:* Have `permanentAddressSection` keep its own guard but let the caller read like its neighbour — `...(anyLineNeedsPermanentAddress(answers, evaluation) ? [permanentAddressSection(...)] : [])` — or move the CPH guard inside `cphSection` too so both read the same way. One mechanism, not two in adjacent lines.

*Judge:* Two spellings of "maybe one section" in adjacent lines is a fair consistency point on new code, but behaviour is identical and the reader still sees both conditions in the same array literal. Low value against a re-review.

## n33 — DEFER — minor/style

**frontend:src/server/app/sets/live-animals/journeys/linear/features/permanent-address/controller.test.js:262**

The new controller test asserts bare HTTP status literals — `toBe(400)` at lines 262, 309, 371 and 408, and `toBe(500)` at line 725 — and bare cap literals `'a'.repeat(101)` / `'a'.repeat(100)` at lines 304, 322 and 331. The controller under test imports `HTTP_STATUS_BAD_REQUEST` and `HTTP_STATUS_INTERNAL_SERVER_ERROR` from `lib/http-status.js`, and the sibling `animal-identification.controller.test.js` imports the same constant.

*Proposed fix:* Import `HTTP_STATUS_BAD_REQUEST` and `HTTP_STATUS_INTERNAL_SERVER_ERROR` from `../../../../../../lib/http-status.js` and assert against them; name the county cap once (e.g. `const COUNTY_MAX_LENGTH = 100`) and write `COUNTY_MAX_LENGTH + 1`.

*Judge:* The cap literals are the stronger half, but twelve existing controller tests also assert bare status codes, so this is a repo-wide consistency gap rather than a clear breach introduced here. Worth a sweep, not a block.

## n34 — DEFER — minor/naming

**frontend:src/server/app/sets/live-animals/journeys/linear/features/permanent-address/controller.test.js:267**

`result.view.context.errorSummary.errorList.map((e) => e.text)` uses a single-character callback parameter.

*Proposed fix:* `.map((entry) => entry.text)`.

*Judge:* Real rule breach in new code and a one-character fix, but zero risk and zero reader confusion in a three-token callback. Pick it up with the next edit to that file.

## n35 — DEFER — minor/structure

**frontend:src/server/app/sets/live-animals/journeys/linear/features/permanent-address/cards.js:140**

`buildCards` and `buildCard` take the localised `copy` object as a positional parameter and thread it down to `identifierLinesOf` and `addressFieldInputsOf`, as does `summary.js`'s `summaryTextFor`. Two other modules in the same feature folder — `validate.js:18` and `controller.js:29` — each build their own `copyFor({ en, cy })` at module scope, which is the repo-wide pattern (`animal-label.js`, `address-rules.js`, every other feature).

*Proposed fix:* Build `const copy = copyFor({ en, cy })` at module scope in `cards.js` and `summary.js` and drop the `copy` parameter from `buildCards`, `buildCard`, `identifierLinesOf`, `addressFieldInputsOf` and `summaryTextFor`. That also takes `buildCard` from four positional parameters down to three.

*Judge:* Two ways of resolving copy in one feature folder is a legitimate structure point, but the fix changes five function signatures plus their tests for no behavioural gain, and the parameter has exactly one possible value so nothing is at risk meanwhile.

## n37 — DEFER — minor/naming

**frontend:src/server/app/sets/live-animals/journeys/linear/features/permanent-address/summary.js:13**

`summaryTextFor(cards, copy)` returns an object mapping each refused control's key to its summary text — a map, not a text. Its own `@returns` tag says so: "map of field key to summary text".

*Proposed fix:* Rename to `summaryTextByControl` (or `summaryTextsFor`) so the name says a map comes back, and drop the `@returns` wording that currently has to correct the name.

*Judge:* The name does mispredict — a singular value word over a map — and the @returns tag has to say so, but it is contained to one exported helper with a single caller and no correctness exposure. Rename in the next change to that module.

## n39 — DEFER — nit/naming

**frontend:src/server/app/model/obligations/evaluator.test.js:1369**

The new local `allEighteenObligations` bakes a count into the name. It is built from `trivialAlwaysMandatoryObligations` plus `internalReferenceNumber`, so the count is already derivable and will be wrong the moment an obligation is added or dropped.

*Proposed fix:* `const alwaysInScopeObligations = [...]` — the name then stays true whatever the list's length.

*Judge:* A count baked into a local name is a real brittleness, but the surrounding describe and it titles already carry "18" from before this branch, so a half-rename leaves the file no clearer. Do the local and the titles together later.

## n40 — DEFER — nit/naming

**frontend:src/server/app/sets/live-animals/journeys/linear/features/permanent-address/answers.js:28**

One value carries two names inside this module: `answersFromPayload` names its first parameter `values` ("the posted values, with the page's normalisation applied") and then passes it to `answerFor(payload, key, …)` and `newAddressPartyValues(payload, key)`, which call it `payload`. `validate.js` meanwhile calls the raw, un-normalised request body `payload` too.

*Proposed fix:* Use one name for the normalised values throughout this module — `values` — and keep `payload` for the raw request body in `validate.js` only.

*Judge:* payload meaning the raw body in validate.js and the normalised values in answers.js is a genuine one-concept-two-names slip, but both are module-internal and the exported optionChosenFor legitimately takes either. Rename when that module is next opened.

## n41 — REJECT — nit/style

**frontend:src/server/app/sets/live-animals/journeys/linear/features/commodities/animal-identification/identifier/fields.js:14**

`const fallbackIdentifierFields = ['identificationDetails', 'description']` is a fixed literal list scoped inside `scopedFields`, written in lowerCamel, while the same file's other in-function constant is `IDENTIFIER_MAX_LENGTH` (line 27) and the new `cards.js` uses `INPUT_TYPES` the same way.

*Proposed fix:* `const FALLBACK_IDENTIFIER_FIELDS = ['identificationDetails', 'description']`.

*Judge:* The cited rule does not say what the finding claims: node code-style §13 requires a named constant for a meaningful literal, which this is, and its own example for a function-scoped literal is lowerCamel. What is left is casing taste, and the house rules mandate no casing convention.

## n42 — REJECT — nit/style

**frontend:src/server/app/sets/live-animals/journeys/linear/features/permanent-address/template.njk:23**

The card `<section>` takes `id="{{ card.key }}"`, and `cardKeyFor` renders `0-0`, so the page emits ids starting with a digit. The repo's comparable card (`_identification-card.njk:6`) uses `id="{{ card.anchor }}"` where the anchor is `identification-card-{index}`.

*Proposed fix:* Give the card a prefixed anchor in `buildCard` — e.g. `anchor: `permanent-address-card-${key}`` — and use it for the section id and the `aria-labelledby` target, keeping `card.key` for form field names.

*Judge:* The id is valid, the aria-labelledby resolves, and nothing in the page, specs or scripts selects it — the proposed prefixed anchor would add a field no code reaches, against "Build only what this change makes reachable". Add the anchor when something actually needs to target the card.

## n48 — RESOLVED BY n16 (was DEFER) — major/naming

**tests:flows/animals/journey.ts:597**

`saveAnimalWithFallbackDetails` does not do what its name and its sibling do: `saveAnimalWithPassport` (line 590) presses that card's own save control (`cardSaveControl`), while this one presses the page-level `saveAndContinue`, which saves the pending card AND leaves Identification details for Additional details. "Fallback details" is also vocabulary that appears nowhere on the page — the fields are labelled 'Identification details' and 'Description'.

*Proposed fix:* Split the two concerns and name them for what they change: `saveAnimalWithIdentificationDetails(card, answer)` pressing `cardSaveControl(card)` like its sibling, and let the caller press `saveAndContinue` itself when it wants to leave the page. Drop the `AnimalWithFallbackDetails` type name with it.

*Judge:* The verifier refuted the vocabulary objection ("fallback" is the behaviour spec's own term) and the proposed fix, which would reinstate a bug fixed on this branch — a one-animal card has no in-card save control. What survives is that the name does not say the helper leaves the page; a rename such as saveFallbackDetailsAndContinue is worth doing, but not at major severity on a single-caller test helper.

## n50 — DEFER — minor/structure

**tests:flows/animals/journey.ts:611**

`answerPermanentAddresses(commodityLineAnswers, addressPerAnimal)` takes two arrays of different shapes: the first is per commodity line, the second is a flat per-card list indexed by a `let cardsAnswered` counter that runs across lines. It also ignores `line.noOfAnimals` and counts rendered cards, while the seed path (`permanentAddressForm` in seed-form-steps.ts) derives the same card count from `line.noOfAnimals`. The three-line doc comment above it exists only to explain that pairing.

*Proposed fix:* Give the method one answer per card — e.g. `answerPermanentAddresses(line, answersInCardOrder)` called once per line, or let `PermanentAddressAnswer[]` hang off the commodity line itself — so the call site reads without a comment, and derive the card count the same way the seed form does.

*Judge:* Two arrays of different shapes with a cross-line counter is a real structure defect, but the fix reshapes the answer type and the second half of the proposed remedy (derive the card count from noOfAnimals) would break walkCatsByAir. Needs a considered answer-model change, same work as finding 20.

## n51 — DEFER — minor/structure

**tests:flows/animals/journey.ts:988**

`walkCatsByAir(document, afterPermanentAddressesSaved)` takes a mandatory callback purely so pet-cats-air-permanent-address.spec.ts:19 can run an `expect` in the middle of the walk; it is threaded through a second new hook, `afterParties` on `walkFromTransporterToReview` (line 838), and `toRolesAndAddresses` adds a third, `afterCommodity` (line 641). All three are named for when they run, not for what they do.

*Proposed fix:* Have the walk leave the consignment addresses page observable instead — return or stop at that point (a `walkCatsByAirToAddresses()` plus a `continueToReview()`), and let the spec assert between the two calls. If a hook must stay, make it optional and name it for the step it supplies, e.g. `answerPermanentAddresses`.

*Judge:* Assertions executed inside a flow are a documented review flag and the three hooks are named for when they run, but the exposure is one interstitial expectation and the downstream review assertions still catch a missing permanent address. Restructure the walk when the next spec needs a different cut of it.

## n53 — DEFER — minor/patterns

**tests:page-objects/animals/permanent-address-page.ts:51**

`fieldErrorMessage` reads the field's `id` attribute and builds a CSS selector from it (`card.locator(`#${fieldId}-error`)`), returning `Promise<Locator>` rather than a `Locator`.

*Proposed fix:* Assert the field's own description instead — `await expect(card.getByLabel(label, { exact: true })).toHaveAccessibleDescription('Enter a name or organisation name')` — and delete the helper, or at minimum return a plain `Locator`.

*Judge:* Same defect as finding 23: a second route to a field's inline error beside the suite's established toHaveAccessibleDescription idiom, with the null and retry arguments overstated. Replace the helper in a later pass on that page object.

## n55 — DEFER — minor/style

**tests:tests/animals/e2e/features/animal-identifiers-conditional.spec.ts:58**

`const overLongValue = 'D'.repeat(59);` is asserted against the message `'Identification details must be 58 characters or less'` two lines later — two bare numbers that have to agree, with nothing saying so.

*Proposed fix:* Name the limit once and derive both: `const IDENTIFICATION_DETAILS_LIMIT = 58`, `'D'.repeat(IDENTIFICATION_DETAILS_LIMIT + 1)`, and build the expected message from the same constant.

*Judge:* Two numbers that must agree with nothing saying so is a fair magic-number point, and the a11y spec in the same repo shows the house pattern — but the 58 sits inside an asserted user-visible copy string, which a spec has some reason to write literally. Tidy it with the next edit.

## n56 — DEFER — minor/tests

**tests:tests/animals/e2e/features/animal-identifiers-conditional.spec.ts:64**

The description answer is typed into the spec — `saveAnimalWithFallbackDetails(ostrichCard, { description: 'Dark plumage' })` — and the same literal is asserted at line 70, while the sibling value on the same card (`ostrichLine.identificationDetails`) comes from `MANDATORY_COMMODITY_LINES.ostrich`.

*Proposed fix:* Add `description` to the ostrich entry in `domain/animals/constants/journey-commodity-line-answers.ts` (the field already exists on `CommodityLineAnswer`) and read it from there in both the fill and the assertion.

*Judge:* Two of the three supports collapsed under verification — identificationForm never seeds either field and api-seed-parity never reaches an ostrich — so what remains is a consistency slip: one sibling answer from the fixture, one typed inline. Worth aligning when finding 16's answer-set work lands.

## n58 — DEFER — minor/tests

**tests:tests/animals/e2e/pages/permanent-address.spec.ts:129**

Inside one test the same four-step sequence appears twice: open 'Identification details' from the overview, `saveAnimalWithPassport(catCard, catLine)`, `saveAndReturnToOverview.click()`, wait for the overview heading (lines 112-115 and 129-132).

*Proposed fix:* Add one journey method, e.g. `saveOneAnimalFromOverview(card, line)`, and call it twice.

*Judge:* Eight lines of identical navigation inside one test does hide what is being proved, but both the Playwright guide and the house rule are phrased for sharing across tests. Extract it when a second spec needs the same sequence.

## n59 — DEFER — minor/structure

**tests:tests/animals/e2e/pages/permanent-address.spec.ts:48**

The spec reaches past the page object for locators it already owns: `getByRole('radio', { name: 'Enter a new address' })` at lines 48, 95 and 140, and `getByLabel('Name or organisation name', { exact: true })` at lines 49 and 141 — both literals are already held in `permanent-address-page.ts` as `NEW_ADDRESS_OPTION` and inside `fillNewAddress`.

*Proposed fix:* Add accessors to `AnimalsPermanentAddressPage` — `newAddressOption(card)` and `nameOrOrganisationName(card)` — and use them in the spec, keeping the copy strings in one place.

*Judge:* Same defect as finding 22 — the spec rebuilds locators from copy strings the page object already names. Real, but a copy change fails loudly, so it can ride with the next page-object pass.

## n60 — DEFER — minor/tests

**tests:tests/animals/e2e/pages/permanent-address.spec.ts:14**

The title 'A cat consignment walked from the consignment addresses page through a hand-entered save, back to the consignment addresses page' names the route rather than what the assertions prove — the test also asserts the inset summary text on the addresses page and that reopening the card keeps the chosen option and the typed name.

*Proposed fix:* Retitle for the outcome, e.g. 'saves a hand-entered permanent address, summarises it on the consignment addresses page, and shows it again when reopened'.

*Judge:* The title names the route while the assertions prove the summary text and the reopened card, and it is the only route-shaped title in the file — a true breach, but a retitle with no behavioural effect that can go with the next edit to that spec.

## n61 — DEFER — nit/style

**tests:tests/animals/e2e/pages/animal-identification.spec.ts:91**

The new test added at line 85 uses raw locators — `bosTaurus.getByLabel('Ear tag', { exact: true })`, `bisonBison.getByRole('button', { name: 'Save and add another' })` — while the other new test in the same file (line 129) uses the card accessors this branch introduced (`cardEarTag`, `cardSaveControl`).

*Proposed fix:* Use `animalsPages.animalIdentification.cardEarTag(...)` and `cardSaveControl(...)` in the new test at line 85 too, so the file's new code is consistent about where the labels live.

*Judge:* Same defect as finding 21: a new test bypassing the card accessors the same change introduced. Three locator swaps, no silent-failure risk, so it belongs with the next edit to that spec.

## n62 — DEFER — nit/naming

**tests:flows/animals/journey.ts:625**

`for (let animal = 1; animal <= cardCount; animal += 1)` names a 1-based card position `animal`, and the value is passed straight into `addressPage.card(line.species, animal)`.

*Proposed fix:* Name it for what it holds — `animalNumber` (matching the card's accessible name, 'Felis catus 1') or `cardNumber`.

*Judge:* animal names a 1-based card position and the loop body already dereferences a sibling entity, so the mispredict is real — but it is one local in one loop, and the repo has comparable counters elsewhere. Rename on the next touch.


---

## Note on n48

The judge deferred n48 (`saveAnimalWithFallbackDetails` does not do what its
name says) as a naming fix not worth the churn. The n16 fix-now work then
folded both `saveAnimalWithPassport` and `saveAnimalWithFallbackDetails` into
one `saveAnimalIdentifiers`, so neither name survives and the defect is gone.
Neither identifier appears anywhere in the repo.

## The one deferral worth a decision

n2 — `AUTOCOMPLETE_TOKENS` and `FIELD_CLASSES` in
`addresses/party-edit/address-rules.js` were added for the permanent address
page, while `party-edit.njk` still hard-codes the same autocomplete tokens and
width classes inline. Change a postcode width in one place and the other keeps
the old one. The judge deferred it because the remedy rewrites a template and
controller this theme does not otherwise touch, across eight live inputs. It is
a real duplication that a later change should unify, not a defect this theme
introduced.
