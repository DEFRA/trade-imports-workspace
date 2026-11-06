# Team review calibration

Human reviewer themes from PRs that Cursor implemented and then fixed
after thread feedback:

| Ticket | Repos | Reviewers |
|--------|-------|-----------|
| **EUDPA-669** | animals-backend #115, animals-frontend #432, ins-backend #27, ins-tests #55 | Paul Hodgson, Martyn (esynergy) |
| **EUDPA-760** | animals-frontend [#457](https://github.com/DEFRA/trade-imports-animals-frontend/pull/457), ins-tests [#80](https://github.com/DEFRA/trade-imports-ins-tests/pull/80) | Hamid (@amieljemei) — [22-item review](https://github.com/DEFRA/trade-imports-animals-frontend/pull/457#issuecomment-6610342697) |

Use this doc in **fresh and refresh** file review, **consistency** review,
and when **implementing GitHub review threads** (with or without an items-table row).
It does not override ticket AC or `.claude/rules/code-quality.md`.

**Scope is ticket-shaped, not one checklist for every PR.** Applying Paul’s
commodity sections (§1–§8) on an origin-only PR is a review error — Hamid
flagged that on EUDPA-760 when commodity calibration “seeped” into
country-of-origin review.

---

## Which sections apply (read this first)

| PR / file is mainly about… | Apply | Do **not** apply |
|---|---|---|
| **EUDPA-760** — country of origin, `origin/`, `lib/validate/`, `pageValidation`, origin FIT, `origin.spec.ts`, `page-design.md` for origin | **§9–§16** (Hamid / journey validation) | **§1–§8** (commodity / EUDPA-669) |
| **EUDPA-669** — `commodities[]`, notification Mongo/API, GBN-AG mappers, species display, backend save/list, commodity e2e | **§1–§8** (Paul / Martyn) | §9–§16 unless the same PR also changes journey validation |
| Both in one PR set | Both parts, each on the files that match its scope | — |

**Paths that mean “§9–§16 only” for FILE_REVIEWER:**  
`features/origin/`, `lib/validate/`, `page-validation.js`, `origin.fit.spec.js`, `tests/animals/e2e/pages/origin.spec.ts`, origin rows in `page-design.md`.

**Paths that mean “§1–§8 may apply”:**  
`commodit`, `Notification.java`, `commodities[]`, GBN-AG, outbox, ins-backend upsert, species/commonName mappers, etc.

When posting a **PR review reply**, cite only the section(s) that match that
PR’s diff — do not paste or summarise Part A on an origin-only PR.

---

## Part A — Commodity and persistence (EUDPA-669 only)

---

## 1. Legacy Mongo shapes (Paul)

**Theme:** Do not add read paths, expanders or fallbacks for the old
single `commodity` field. Existing notifications in lower envs are
transient test data with TTL.

**Raise a finding when the PR:**

- Keeps dual `commodity` + `commodities[]` on the model without ticket AC requiring it.
- Adds `NotificationCommodities`-style expansion from one legacy root name to many complements.
- Falls back in GBN-AG mappers when `commodityCode` is blank “for legacy reads”.

**Must:** One persisted shape (`commodities[]`); save clears or stops writing the old field; mappers assume journey-valid complements unless AC says otherwise.

**One way:** Remove legacy helpers and tests that exist only to prove the shim; delete fallbacks in `TradeLineItem` classification.

**Disposition:** Often **Fix**, not Discuss, when the ticket does not mandate backward compatibility without migration.

---

## 2. Test fixtures must be journey-valid (Paul)

**Theme:** Test-only constructors or builders that allow `null`
`name`, `commodityCode` or `description` hide regressions. A valid
submitted notification always carries identity fields the frontend sends.

**Raise a finding when:**

- A convenience constructor exists only so old tests compile after new fields.
- Copy, service or IT tests build complements with identity fields unset but assert only totals or type.
- A shared assert helper (`assertNotificationMappedFields`, contract tests) gains new extracted fields while POST fixtures still omit them.

**Must:** Test data uses realistic values (e.g. name + `0102` + description); round-trip tests prove identity fields survive save, update and copy.

**One way:** Remove narrow constructors; use `builder()` or shared fixtures; extend IT POST bodies when assert helpers change.

**Severity:** **Major** for IT/integration gaps; **Critical** if nothing would fail when save drops a field the AC requires.

**EUDPA-669 example:** `post_shouldMapAllFieldsToNotificationAndSave` had to set `commodityCode` and `description` after `assertNotificationMappedFields` started checking them.

---

## 3. `null` vs empty list contract (Paul)

**Theme:** Prefer `commodities: []` and `species: []` for “not chosen yet”.
`null` on lists usually means a bug (DTO omit, save overwrite, Lombok
`@Builder` ignoring field initialisers).

**Raise a finding when:**

- Many null-guards on lists without a single normalisation at the save/API boundary.
- `@Builder` on entities with list defaults but no `@Builder.Default`.
- Frontend sends omitted `commodities` and backend `setCommodities(dto.getCommodities())` overwrites with `null`.

**Must:** Empty list means valid draft with none chosen; null must not survive save. Contract owned at boundary (backend `requireNonNullElse(..., List.of())` and/or frontend always sends `[]`, plus `@Builder.Default` where builders are used).

**One way:** Paul’s three-point checklist on `Notification`, `setNotificationDetails`, and caller null-check removal — plus one IT that saves a draft without commodities and gets `[]` back.

**Note:** Optional GBN-AG scalar fields may still map to `null` to omit from JSON — that is separate from list contracts.

---

## 4. Persist what the user was shown (Martyn)

**Theme:** Review page, Mongo, outbox event and INS read model must
agree on user-visible labels (especially `species[].commonName` and
commodity display names).

**Raise a finding when:**

- Mapper prefers stale fixture lookup (`_capture/fixtures/commodities.json`) or CN-keyed hardcodes over `speciesCommonName` / reference data.
- Constant names contradict values (`DOMESTIC_CATTLE = 'Cattle or Cow'`).
- E2E or persistence specs encode a deliberate mismatch with reference data without an AC exception.
- Review UI is tested against reference data while persistence tests assert a different string.

**Must:** Persistence path prefers the field the journey set when the user made a choice; tests and ins-tests assert against reference data helpers, not wrong literals carried from stub snapshots.

**One way:** Fix `commonNameFrom` (or equivalent) order; remove misleading `COMMODITY_NAMES_BY_CODE` entries (e.g. every `01061900` species named “Cat”); regenerate characterisation oracles; update ins-tests to drop `GBN_AG_CATTLE_COMMON_NAME`-style drift constants.

**Severity:** **Critical** when Review and Mongo disagree on the same submitted journey.

**Cross-repo:** CONSISTENCY reviewer must trace frontend mapper → animals-backend store → outbox → ins-backend upsert → dashboard/list.

---

## 5. Save path vs list and downstream projections

**Theme:** Changing what save writes is not done until every read path
that product uses shows it.

**Raise a finding when:**

- Save sets `commodities[]` but paginated list / `NotificationView` / dashboard marshal still exposes only legacy fields.
- INS upsert reads GBN-AG paths that omit new fields (`description`, `commonName`) while detail save persists them.

**Must:** Every trader-visible list and cross-service projection updated in the same PR set or flagged **Suspicious** in consistency check.

**EUDPA-669:** `NotificationView` + SpEL + INS `description[0]` / `commonName` alignment.

---

## 6. Stub catalogues and partial MDM (Martyn)

**Theme:** Hardcoded `COMMODITY_DESCRIPTIONS` (or similar) is acceptable
only while ticket scope and AC say stub; still flag product impact.

**Raise a finding when:**

- Ticket AC implies dashboard/PIMS always see a description but stub covers a fraction of CN codes.
- No comment or AC note that live lookup (e.g. EUDPA-617) is deferred.

**Must:** Either stub called out in AC/review index with known gap, or lookup implemented for codes in scope.

**Severity:** **Major** when downstream shows raw CN codes to users without an documented exception.

---

## 7. Optional mapper nulls vs validation errors (Paul)

**Theme:** Paul often asks “is null an error?” on GBN-AG mapping lines.

**Default for this codebase:** Journey validation before submit; mapper
layer maps optional absent fields to omitted/null in the payload — not
automatically a finding.

**Raise a finding when:**

- Submit or save can persist a notification that violates GBN-AG or AC requirements with no upstream validation test.
- Ticket AC requires fail-fast at mapper time.

**Disposition:** **Discuss** or **Won't Fix** with “validated upstream” only when evidence exists (validation test or journey obligation).

---

## 8. Model naming (`CommodityComplement`) (Paul)

**Theme:** Name no longer matches the model (each entry is a full commodity, not a “complement”).

**Raise a finding when:** PR touches the type heavily and ticket allows rename.

**Severity:** **Minor** or **Discuss** — rename is a wide breaking change; note in consistency if peers use a different name.

---

## Part B — Journey validation and tests (EUDPA-760 and similar)

Do **not** apply Part A (§1–§8) on origin-only PRs.

---

## 9. One validator primitive — no `oneOfKnown` beside `requiredOneOf` (Hamid)

**Theme:** Mandatory membership in an allow-list is already
`requiredOneOf` (with an **empty-list guard**). Adding a second export
(`oneOfKnown`) or a manual blank branch in `countryRule` duplicates Joi,
drops the guard, and forces twin messages via `if/else` instead of Joi
error codes.

**Raise a finding when the PR:**

- Exports or uses `oneOfKnown` (or any second `required().valid(...)` helper) next to `requiredOneOf`.
- Branches on `(values.field ?? '').trim()` only to pick between two save-blocking schemas that differ by message only.
- Calls `countryRule(stored, values)` with a **positional boolean** instead of `{ stored }`.
- Uses `Joi.valid(...values)` without the empty-list custom error when `values` can be `[]` from reference data.

**Must:** One guarded `requiredOneOf`; blank vs off-list via `{ required, only }` messages (same pattern as `requiredMaxText`); stored reading uses `oneOf` + stale message where AC allows relax; **one call** on submit, matching `import-reason/validate.js`.

**One way:** Extend `requiredOneOf`; delete `oneOfKnown` and its tests; `stored ? oneOf(...) : requiredOneOf(..., { required, only })`.

**Severity:** **Major** (correctness if empty list accepts any string).

**EUDPA-760:** Hamid #2, #4–#6, #13–#17, #21 on PR #457.

---

## 10. Test titles, describes and refusal causes (Hamid)

**Theme:** Every `it` title states **only** what its assertions prove.
Every `describe` title matches **every** test inside. Each refusal test
has **one** named cause — not two rules that both fail.

**Raise a finding when:**

- Title claims “unknown vs blank” but both assert the same message.
- Title claims comparison to another pattern (`unlike requiredText with oneOf`) with no such assertion.
- A test under “save without X” posts a payload that **includes** X and fails on something else.
- Duplicate tests prove the same case (e.g. region max-length with FR and with AT).
- After a new mandatory field, a test still uses a **second** refusal cause (e.g. over-long internal ref **and** missing country) without asserting which rule fired.
- Accept-path test only asserts absence of error summary (`toHaveCount(0)`) — a 500 or stuck page passes.

**Must:** Retitle or move tests; pin combined-error cases when product requires both messages; accept path asserts **destination** (e.g. next page heading / URL), not only “no error summary”.

**EUDPA-760:** Hamid #3, #7, #8, #12; ins-tests #2–#4 on PR #80.

---

## 11. AC “message next to the field” — not summary-only (Hamid)

**Theme:** GDS ACs that say the user sees text **on the field** require
`#field-error` / `.govuk-error-message` in **FIT, controller unit tests,
and ins-tests e2e** — not only the error-summary link.

**Raise a finding when:**

- Refusal tests assert `getByRole('link', { name: … })` or summary text but not `#countryOfOrigin-error` (or equivalent).
- FIT and e2e both green while only the summary is asserted (Hamid: “grep finds only styling check”).
- `openspec/` coverage is **full** but no rendered-page test proves the field message.

**Must:** At least one FIT and one e2e (when the domain has e2e page specs) assert the inline message; optional: scope summary link to `getByRole('alert')`, use `sharedCopy.errorSummary.title` not a hard-coded heading string.

**Cross-repo:** Same AC row must be updated in ins-tests when frontend FIT changes — CONSISTENCY §3b.

**EUDPA-760:** Hamid #11, #22; ins-tests #1.

---

## 12. `pageValidation` stored vs submit (Hamid)

**Theme:** `fields(values, { stored })` may **relax** a rule on the stored
reading (blank allowed on GET) while changing only the message on
submit. Docs and tests must say so.

**Raise a finding when:**

- JSDoc on `pageValidation` says stored “only changes the message” but a field rule allows blank when `stored`.
- No test asserts **no country errors** on fresh GET with no seed after submit becomes mandatory.
- Changing submit to `requiredOneOf` without a GET test that would fail if someone makes stored required too.

**Must:** JSDoc: stored may relax or change message; one GET test with empty errors for first open (where AC says no error yet).

**EUDPA-760:** Hamid #9, #20.

---

## 13. Design docs and twin frontends (Hamid)

**Theme:** `page-design.md`, `pageValidation` contract, and **twin**
frontends (animals vs plants, import-reason vs origin) must describe the
**same rule** once the ticket changes save behaviour.

**Raise a finding when:**

- `page-design.md` still says optional/soft-save after mandatory save lands.
- Origin implements a third pattern while import-reason uses `stored ? oneOf : requiredOneOf`.
- Same validation, different error copy on twins without a ticket/content-design note.

**Must:** Update page-design for reachable states; align pattern across features; record intentional copy differences.

**EUDPA-760:** Hamid #17–#19, #18 (plants copy).

---

## 14. FIT journey order after mandatory fields (Hamid)

**Theme:** When save-and-continue starts refusing empty answers, the
**first valid save** in an opening-run FIT may navigate to a **different**
page than after soft-save (e.g. commodities not hub).

**Raise a finding when:**

- FIT expects a URL copied from an older flow where an earlier partial save had already happened.
- Mandatory-country FIT runs region-code scenarios before country without expecting country-required refusal.

**Must:** `toHaveURL` matches `nextRunTarget` / sibling tests in the same file after behaviour change.

**EUDPA-760:** Hamid #10 (fixed `3268bf4`), #5 FIT scenario with dual refusal.

---

## 15. Comments describe only the lines below (Hamid / house rule)

**Theme:** File-header comments that narrate other modules, scripts or
“why we did it” belong in `docs/`, not above config the comment does
not configure.

**Raise a finding when:** A new or extended header comment names callers,
npm scripts, or run order (e.g. `lighthouserc.cjs` describing
`seed-audit-targets.js` / `run-audit.js`).

**Must:** Delete or move rationale to docs; keep only what the adjacent lines do.

**EUDPA-760:** Hamid #1.

---

## 16. Items table vs human review row count (process — EUDPA-760 lesson)

**Theme:** Step 5a **merge** reduces many file findings to one “owner”
item — correct for implementor, **wrong for PR reply**. Hamid’s review
had **22 numbered rows**; a 7-row walker table looked like 15 items were
ignored.

**Orchestrator must:**

- After `aggregate-file-reviews.sh --write-items`, if a human posted a
  numbered review on the PR, **diff row counts**. Fetch:
  `gh api repos/DEFRA/{repo}/issues/comments/{id} --jq '.body'` and count `| N |` data rows.
- Ensure **each human row** has a matching item id OR an explicit
  `Merged` note pointing to an owner item (`review-mark.sh --disposition Merged --note "merged into #21"`).
- FILE_REVIEWER must raise **separate** findings per distinct Must in fresh review — do not rely on one generic “fix validators” item.
- PR follow-up: **`REVIEW_PR_RESPONSE.md`** — post **all human #s**, not compressed walker count.

---

## Implementing GitHub review threads in Cursor

When the user asks to fix review comments on a PR (not `walk review` items):

1. Fetch threads: `gh api repos/DEFRA/{repo}/pulls/{n}/comments` and/or review summaries.
2. Map each comment to a section above; prefer resolutions already agreed on the branch (legacy removed, fixtures fixed, etc.).
3. After code change, run targeted tests for that repo; for cross-layer bugs, reproduce Martyn’s table (reference data → Mongo → outbox → INS).
4. When a shared test assert grows new fields, grep for all callers of that assert and fix fixtures in the same commit.
5. Reply on GitHub threads with commit SHA; resolve when addressed.
6. Do not merge unless the user asked — workspace rule.

---

## Keeping this doc current

When a merged PR review introduces a **new recurring theme** (second
reviewer, same ask on a different ticket), add a numbered section here
with Must / One way / example PR. Link from the Cursor `review` host
skill so orchestrators spawn FILE_REVIEWER with this file loaded.
