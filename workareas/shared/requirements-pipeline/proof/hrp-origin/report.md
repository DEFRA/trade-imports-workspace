# High-risk plants: origin and commodity

This report covers the requirements for the high-risk plants and plant products journey. It covers where the goods come from and what they are: category, genus and species, commodity code and quantity. It draws on 2 sources. The policy page (Confluence 6518997274) takes precedence over the IPAFFS CHED-PP trace set.

The result is 4 increments. Each one covers the frontend, backend and tests, and all 4 can be built now. Five questions are open. Each has a default, so none of them blocks building.

## 1. Questions for Sam

Most consequential first.

### Q1. What is the full list of goods categories the importer chooses from?

- **Default if nobody answers:** 4 categories, taken from the kinds of goods the policy page names: plants for planting; cut trees; wood and wood products, including isolated bark; other plants and plant products. The importer chooses one category for each commodity line. It is required.
- **Increments it touches:** inc-002. It also shapes Q2, because the category decides which other questions apply.
- **Sources:** the policy asks for a category but gives only 2 examples ("e.g. plants for planting or cut wood"). The trace slice has no category question to compare against. (c-002)

### Q2. Does the importer give genus and species for every commodity line, or genus for every line and species only for plants for planting?

- **Default if nobody answers:** every commodity line needs one genus-and-species pick from the reference data, whatever the category. Asking for more is safe. Asking for less is not. This default fits both readings of the policy and matches IPAFFS.
- **Increments it touches:** inc-003.
- **Sources:** the policy line reads "genus, species (for plants for planting)". Its punctuation does not say whether the bracket covers species alone or both. The first extract read it as covering both, and verification rejected that reading. IPAFFS asks for a genus-and-species pick for every plant commodity and will not continue until one is added. (c-001)

### Q3. What does the quantity count for each commodity line, and in which units?

- **Default if nobody answers:** each commodity line has one quantity. It is a whole number greater than zero, with a unit of either "number of items" or "kilograms". It is required on every line.
- **Increments it touches:** inc-004. The increment is kept on its own so an answer can reshape it without touching anything else.
- **Sources:** the policy says quantity "of the relevant goods, as detailed in paragraph 1", but paragraph 1 is not on the page. The trace slice does not cover quantity. (c-003)

### Q4. Have the policy leads confirmed that the "All other goods" data list is still current?

- **Default if nobody answers:** build to the list as it is published. Any later change becomes a new requirement.
- **Increments it touches:** all 4. It is written as a rule every increment keeps.
- **Sources:** the policy page says the list is "True at time of publishing" and names 2 policy leads to ask for an up-to-date list. No other source covers it. (c-007)

### Q5. Which error wording should a missing country of origin and a missing genus and species show?

- **Default if nobody answers:** the IPAFFS frontend wording in GOV.UK "Select …" style. The messages are "Select the country of origin of plants, plant product or other objects" and "Select at least one species". Each error has one message, shown in the error summary and beside the field.
- **Increments it touches:** inc-001 and inc-003.
- **Sources:** both positions come from the trace set. The IPAFFS frontend says "Select the …". A backend layer says only "Country of origin" or "Add the …". Nobody ever saw these errors on screen: the trace set copied the wording from source code. The policy says nothing about it. (c-006)

## 2. What precedence settled

- **Variety and class (c-004):** the policy won over IPAFFS. The policy's data list has no variety or class, so the IPAFFS variety and class page is not built.
- **UK region of origin (c-005):** the policy won over IPAFFS. The notification records a country only. It does not record the optional region that IPAFFS asks for UK countries.

## 3. The increments

| Id | Title | Acceptance criteria | Repos | Depends on | Status |
|---|---|---|---|---|---|
| inc-001 | The importer gives the country the goods originate from | 7 | frontend, backend, tests | none | todo |
| inc-002 | The importer adds a commodity line with its commodity code and category | 7 | frontend, backend, tests | inc-001 | todo |
| inc-003 | The importer finds and adds the genus and species of each commodity line | 7 | frontend, backend, tests | inc-002 | todo |
| inc-004 | The importer gives the quantity of each commodity line | 5 | frontend, backend, tests | inc-002 | todo |

Every increment keeps 4 rules:

- capture only what the policy list asks for
- ask the country of origin before any commodity question
- save every answer
- follow the GOV.UK error pattern

The consolidator combined 10 thin slices into these 4 increments. It kept quantity separate because it carries its own open question.

## 4. Coverage

| Source | Claims extracted | Held under verification | Missed claims added by the verifier | Requirements backed | Of which adopted |
|---|---|---|---|---|---|
| Policy page (confluence:6518997274) | 18 | 17 | 2 | 15 | 6 |
| IPAFFS trace set (trace:ched-pp) | 35 | 34 | 5 | 15 | 9 |

Verification dropped 2 claims:

- **conf-005** read the policy's genus and species line as applying only to plants for planting. The line is ambiguous, and that ambiguity became Q2.
- **trace-014** stated how the country list labels Ireland. The evidence came from a different page.

There are 26 requirements in total: 11 adopted, 1 question and 14 out of scope.

**Backed by both sources.** These 4 adopted requirements are the strongest in the backlog:

- req-001: the importer chooses the country of origin, and it is required
- req-006: the importer gives a commodity code for each commodity line
- req-008: the importer finds and adds a genus and species from reference data, and the notification records its EPPO code
- req-009: the importer can add more than one genus and species, and cannot remove the last one

**Resting on one source, by inference.** These adopted requirements have the weakest backing:

- **req-004:** the country of origin is shown back by name, not code. Its only backing is one IPAFFS claim (trace-011), which came from code, not from anything seen on screen.
- **req-007:** the importer chooses a category. Its only backing is the policy's own ambiguous line: one inferred claim and one gap. The list of categories is Q1.
- **req-003:** an error appears when no country is chosen. It rests on the trace set alone. Its wording claim is inferred, and the trace set records 2 gaps about it. This is Q5.

The IPAFFS trace set is the only source for how the questions are asked: page order, headings, copy and errors. The policy page is the only source for category and quantity.

## 5. Out of scope

14 requirements are out of scope.

**Excluded because the policy takes precedence over IPAFFS:**

- UK region of origin (req-013)
- the variety and class page (req-014)

**IPAFFS behaviour that neither the policy nor the goal asks for:**

- a maximum number of commodity lines, with warnings as it nears the limit (req-015). The limit's value is not known.
- species tick boxes for machinery and other non-plant goods, and the version with no species step (req-016). The goal is plants, and nobody has seen these on screen.
- routing and "Article 72" risk rules driven by the country of origin (req-017). These rules act on the data rather than capture it, and the trace records that nobody knows what the classification changes.
- no "Change" link for the country on the review page, and amending it after submission (req-018). Review and amend journeys are not in the goal, and this behaviour was inferred from code.

**Policy data that the goal does not cover:**

- expected landing date (req-019)
- destination or current location (req-020)
- consignor name and address (req-021)
- supplier identification number for plants for planting (req-022). The EPPO code on the same policy line is adopted through genus and species.
- tree size for cut trees (req-023). This is a natural next increment once categories exist.
- phytosanitary treatments for wood (req-024)
- intended use, which the policy marks as optional (req-025)

**Policy rules without an obligation to build:**

- 4 wood and origin combinations that carry extra caveats (req-026). The page does not say what the caveats require. The origin, category and genus data being built is what a later rule would check.

The potatoes list on the policy page was outside this run's scope from the start.
