# Germinal products: a category or a set of its own?

Researched 8 October 2026. Read-only. Animals frontend, animals backend, INS frontend, INS backend and plants frontend all read on `main` (animals frontend `4c2119da`, the same commit the DR2.1 animals traces were taken at). Prototype read at `04a073b`.

## Summary

**Recommendation: keep germinal products as a category inside the live-animals set (option A). Do not make it a sibling set.**

- **The prototype builds germinal products as a branch of one journey.** It uses the same URLs, the same views and the same GBN-AG reference. It has no germinal templates of its own. 6 of the 18 feature areas change in part, and the other 12 are shared unchanged.
- **The real data model agrees.** GBN-AG means "Animals and Germinals", and the schema expects mixed loads. The `GBN-GP` references appear only in the prototype's demo data, which req-1018 already leaves out.
- **A sibling set cannot share pages.** `set-isolation` stops one set importing another. A germinal set would need about 12 shared feature folders copied, or moved into the platform first. That is a large refactor that would conflict with almost every DR2.1 theme.
- **Very little of the backlog needs to change.** The 7 germinal journey rows stay where they are. What changes: one ruling, a rewrite of req-1668, 4 blockers lifted and 3 inconsistencies fixed.

## How sets work today

### What a set is

A set is "one whole obligation set: an L3 manifest, an L4 journey, an L1 gateway and its own mount prefix" (`src/server/app/docs/add-a-set.md:3-5`).

| Part | Where | What it owns |
|---|---|---|
| Identity | `sets/live-animals/set.js:6-7` | `SET_ID = 'live-animals'`, `SET_BASE = '/live-animals'`. The mount is always `'/' + setId` (`add-a-set.md:72-86`) |
| Gateway (L1) | `routes-live-animals.js:52-118` | Configures 8 setId-keyed seams: obligations, fulfilment registry, commodity reference, readiness, journey flow, dispatch, records and session (`:70-92`). Also sets up the sandboxed `onPreAuth` and entry guard (`:62-69`, `:94-107`), wraps every route (`:108-110`) and runs `assertSetConfigured` (`:114`) |
| Barrel and mount | `routes.js:1`, `src/server/router.js` | One export per gateway. `/` redirects to `DEFAULT_SET_BASE` |
| Obligations (L3) | `sets/live-animals/obligations/{index.js,sections/*}` | The manifest. Gates such as `applyTo: equalsGate(...)`, with purge-on-flip (`obligations/sections/import-reason.js:40-115`) |
| Journey (L4) | `sets/live-animals/journeys/linear/{config.js,flow/,features/}` | 18 feature folders (origin, commodities, import-reason, additional-details, addresses, cph-number, contact, transport, documents, hub, check-answers, declaration, confirmation, cancel-amend, delete-notification, notification-actions, dashboard, system). Also sections, task rows, cookies and layout. 246 production JS files under `sets/live-animals/` |
| Set-local services | `sets/live-animals/services/commodities` | The commodity catalogue, which already lists semen and embryos/ova codes (`stub.js:63-67,101-107`) |

### Rules that decide the question

- `set-isolation` (`.dependency-cruiser.cjs:60-68`): "A set is self-contained and cannot depend on another set".
- `journey-isolation` (`:49-58`): a journey cannot import a sibling journey, even inside the same set.
- `no-l2-to-sets` (`:13`): platform code never imports a set. A page can be shared between sets only if it is moved down into L2 (`shared/`, `flow/` and so on), and no feature page has been moved yet (`docs/architecture.md:36-50,63-67`).
- The gateway configures one journey flow per set (`routes-live-animals.js:77-86`). So a second journey inside the same set would need platform changes too.

### What the services around it assume

| Service | Does it know about more than one set or category? | Evidence |
|---|---|---|
| Animals frontend platform | Yes. It is built for several sets in one process, proven with a test fixture (`test/fixtures/second-set.js`, `co-residency.test.js`). No real second set exists | `add-a-set.md:35-70` |
| Animals frontend records | No. `list` calls `/notifications` with no set or category filter | `services/persistence/records/real/lifecycle/read.js:21-37` |
| Animals backend | No. One notification shape with no category field. Every reference is `GBN-AG` | `NotificationBase.java:12-49`, `ReferenceNumberGenerator.java:20,28` |
| INS backend read model | No. The record holds reference, status, origin, commodity and dates only | `AggregatedNotification.java:21-31` |
| INS frontend | No. Every dashboard row links to the live-animals set | `common/constants/journey-set-bases.js:1-3`, `features/dashboard/view-model/list.js:88-102`, `features/address-book/journey-registry.js:14` |
| Tests repo | Partly. It has one seam for set bases | `page-objects/shared/sets.ts` (`liveAnimals`, `highRiskPlants`) |
| Plants frontend (precedent) | One set per repo (`sets/high-risk-plants`), with its own backend and its own E2E domain. So far every real set has been a separate service, not a sibling in the same repo | `repos/trade-imports-plants-frontend/src/server/app/sets/` |
| GBN-AG schema | GBN-AG means "Animals and Germinals". It expects mixed loads such as "live animals plus germinals", with germinal lines weighed in `KGM` | `trade-imports-schemas/README.md:21`, `schemas/profiles/imports/README.md:71,183,232`, `gbn-ag-data-dictionary.md:28,96,115` |

### What a new sibling set costs end to end

| Area | Work |
|---|---|
| Frontend platform | `sets/germinal-products/` (set.js, obligations, journey, services), `routes-germinal-products.js`, the barrel, the `router.js` mount, 4 new cookie names, set-local unit-test setup (`add-a-set.md:126-228`) |
| Frontend test matrix | A Playwright project, a vitest exclude and a webpack entry (`add-a-set.md:230-245`) |
| Shared pages | Either copy about 12 feature folders, or move them into L2 first (see option C) |
| Animals backend | A category field, which every option needs. Also a category filter on `GET /notifications`, so neither set lists the other's drafts |
| INS backend and frontend | A category field in the read model, which every option needs. Also `SET_BASES.GERMINAL_PRODUCTS`, row links chosen by category, and a germinal entry in the address-book return registry |
| Tests repo | `SET_BASES.germinalProducts`, page objects that take a base, and specs for the germinal set |
| OpenSpec | A new prefix `openspec/specs/germinal-products/` with its own journey-flow, obligations, pages, lifecycle and dashboard capabilities. Today only `admin`, `ins`, `live-animals` and `plants` exist |
| E2E domain | Either a new project or a second base inside `animals` (`docs/reference/e2e-domain-coverage.md`) |
| Notification and CHED type | None, unless it becomes its own notification. It stays GBN-AG (CHED-A family) |

## What the prototype and the requirements say

### The prototype treats germinal products as a branch of one journey

| Fact | Evidence (`app/routes.js` at `04a073b` unless stated) |
|---|---|
| One type value, `germinal-products`, stored on the same session as live animals | `normaliseNotificationType` `:72-123`, `getNotificationType` `:195-213` |
| The type question offers it second: "Germinal products (semen, ova, embryos)" | `NOTIFICATION_TYPE_OPTIONS` `:125-131` |
| A category start skips the question: `/create-notification?category=germinal-products` then `/origin-of-the-import` | `:11106-11121` |
| The same page URLs and views for both. There is no germinal view folder. `app/views/design-release-2.1/` has one copy of each page | `git ls-tree 04a073b app/views` |
| A germinal draft gets a `GBN-AG-26-…` reference. `GBN-GP-…` appears only in seeded demo data | `generateDesignReleaseNotificationReference` `:7820-7849`, `app/data/dashboard-notifications.js:21-249` |
| Changing the type on return clears the selected species. The notification stays the same one | `POST /notification-type` `:11135-11171` |
| `/live-animals` and `/germinal-products` are the same dashboard page with a different category | `:11547-11553`, `:6695-6727` |
| Branches turn on `hasGerminalProductsOnly` or `isGerminalProductCommodity` (more than 60 call sites) | `:832`, `:4448` |

### Pages that differ, and pages that are shared

| Feature area (real folder) | Germinal difference | Rows |
|---|---|---|
| commodities/search | Germinal catalogue (15 items) and its hint. Each category's search shows only its own commodities | inc-016 |
| commodities/consignment-details | Gross weight and packages per species, one temperature question, one row per commodity | inc-017 |
| commodities/animal-identification | One donor form per species (donor, two dates, ID mark) with a date picker | inc-052, inc-053 |
| import-reason | Only 2 reasons and 4 purposes | inc-024 |
| additional-details | Skipped. Certified for is set to "Germinal products" | inc-024 |
| hub, check-answers, delete-notification | Packages and kilograms cards, germinal read-back, Number row | inc-099, inc-105, inc-125 |
| origin, addresses, cph-number, contact, transport (arrival, transit, transporters), documents, declaration, confirmation, cancel-amend, notification-actions, dashboard, system | **Shared.** The only differences are rules keyed on commodity codes that already apply to live animals, such as the CPH rule (req-574) and transit countries (req-800) | — |

Mixed live and germinal consignments: the GBN-AG schema allows them, but DR2.1's search does not offer them once a type is set (`getSearchCommodities` `:219-233`). The backlog's "a mix keeps the full lists" criteria (inc-017, inc-024) are defensive rules, not a journey anyone can walk.

### Requirements and backlog contradict each other

| Item | Says | Conflict |
|---|---|---|
| `sources.json` goal | Covers "the GBN-AG animals notification in both its live-animals and germinal-products types" | — |
| req-1668 (out of scope) | Germinal journey, "package and weight totals" and "GBN-GP references" are not built | Contradicts the goal and 7 adopted rows. GBN-GP is demo data only (req-1018) |
| req-003 / c-007 / inc-148 | Germinal is left off the type question "until a real service takes it" | Once inc-016 lands, the animals frontend does take it |
| req-1314 vs inc-154 | req-1314 leaves germinal off the template type question, but inc-154's criterion lists it | The two disagree |
| req-979, req-1736, req-1737, req-1738 (inc-145, inc-172) | Blocked because "no service builds one today" | inc-016 builds it, and inc-130 and inc-135 already carry a read-model category |
| inc-128 gate | "the two category sections" | Its own req-971 lists three: Live animals, Germinal products, Plants |

## Options

### A. Category inside the live-animals set (recommended)

**In code.** The notification stores a `category` (`live-animals` or `germinal-products`). The frontend uses it as an obligation field set at the start, and the animals backend stores it and publishes it in its event. Germinal differences become gates on it, using `equalsGate`/`includesGate` with purge-on-flip, the same mechanism that `purposeInInternalMarket` and `exitDate` use today. The germinal catalogue joins `sets/live-animals/services/commodities`. Set id and URLs stay `/live-animals`. The INS read model takes the category for the `/germinal-products` list and home section. The INS row links need no change, because every GBN-AG notification opens in the same set.

**In the backlog.** No new theme. The germinal rows stay in the theme that owns their code: commodities-and-reason (016, 017, 024), identification-and-permanent-address (052, 053), overview-and-review (099, 105), ins-dashboard (141, 145, 172), type-question-and-templates (148, 154, 161). Changes:
- inc-016 and inc-017 lose their open question. inc-016 also publishes the category in the animals backend's notification event (its `touches` already include the backend).
- inc-145 and inc-172 move from blocked to todo. inc-172 depends on inc-016 and inc-017. inc-145 depends on inc-134 and inc-016. Both cross-theme links already exist through the theme chain (ins-dashboard → overview-and-review → commodities-and-reason).
- inc-141 takes back req-1736.
- inc-148 offers Germinal products second and routes it to the animals frontend's start with the germinal category. It gains a dependency on inc-016.
- req-1314 is aligned with inc-154.
- The inc-128 gate wording becomes three sections.
- New rows: none needed. A re-distil may split out "category stored and published" if inc-016 gets too big to review.

**Risks.**
- Germinal URLs read `/live-animals/notifications/…`. This is cosmetic, but researchers may notice it.
- The live-animals obligations manifest grows a category branch in 6 areas. That matches how the prototype is built, and the obligation model is designed for it.
- If germinal products later need their own rules engine or their own CHED, splitting them out is a refactor. Storing the category now keeps that path open.

**Open questions for Sam.**
1. Should the type question (create and template) offer Germinal products, as DR2.1 does? Default: yes.
2. Should the set id and URLs stay `live-animals`? Default: yes, because renaming moves every URL and the tests repo's base.

### B. A sibling set, `germinal-products`, in the animals frontend with copied pages

**In code.** Add a new `sets/germinal-products/` with its own manifest (no additional-details obligations, a narrowed import reason, a germinal commodity details page and donor identification), its own gateway and mount `/germinal-products`, cookies and test-matrix entries. The 12 shared folders (origin, addresses, cph-number, contact, transport ×5, documents, declaration, confirmation, amend, cancel-amend, delete, notification-actions, hub, check-answers, dashboard) are copied, because `set-isolation` forbids imports. The animals backend gains a category and a list filter. The INS frontend gains `SET_BASES.GERMINAL_PRODUCTS`, links chosen by category and a germinal address-book return. OpenSpec gains a `germinal-products` prefix.

**In the backlog.** A new theme `germinal-set-foundation` (set skeleton, gateway, router, configs, tests repo `sets.ts`, INS `journey-set-bases.js` and the address-book registry), plus a theme `germinal-products-journey` that owns `sets/germinal-products/**`.
- inc-016, 017, 024, 052, 053, 099 and 105 move into it, rewritten as "the germinal set's …". inc-024's mixed-consignment criteria are dropped.
- About 12–15 new rows are needed, one per copied page (origin, arrival, transit, transport, transporters, documents, roles and addresses, CPH, contact, hub, review, declaration, confirmation, amend, cancel and delete), each depending on its live-animals twin. Every later DR2.1 change to a shared page must be made twice.
- inc-145 and inc-172 move to todo. inc-141 takes back req-1736. inc-148, 154 and 161 route germinal to `/germinal-products`.

**Risks.**
- Two copies of every shared page drift apart. That goes against how the prototype is built and doubles the work on every shared-page row.
- The animals backend list must filter by category, or each set shows the other's drafts until the dashboard moves to INS (c-159).
- Most rows land late, because the new theme depends on nearly every live-animals theme.

**Open questions for Sam.**
1. Is a copy of 12 pages acceptable, or is it option C?
2. Which mount and E2E domain should it use?

### C. A sibling set, after moving the shared pages into the platform (L2)

**In code.** First move the shared feature folders out of `sets/live-animals/journeys/linear/features/` into an L2 home that the dependency rules allow both sets to import. This includes their controllers, templates, copy and fulfilment bindings, which today take set-local obligations through L1 configuration. Then add the germinal set as in B, but without the copies.

**In the backlog.** A wave-0 platform theme, `shared-journey-pages`, owns every shared feature folder. Every other frontend theme (origin-page, arrival-and-transit, documents, transporters, consignment-parties, overview-and-review, manage-notifications) then either depends on it or loses its folders to it. That breaks the "boundaries by feature folder, built in parallel" rule (`SHAPE.md` "Themes"). Then the B themes follow, with no copied-page rows.

**Risks.**
- It is a platform redesign that no DR2.1 requirement asks for.
- Every DR2.1 frontend theme waits on it, or conflicts with it.
- Nobody has yet designed how a feature binds to two sets' obligations.

**Open questions for Sam.**
1. Is this refactor wanted for its own sake? It could make sense if more animal categories are coming. If not, there is no case for it.

### D. A separate service (own frontend and backend, GBN-GP)

This follows the plants pattern: a new repo pair and a new reference prefix. **Rejected.** GBN-AG is defined as "Animals and Germinals" and expects mixed loads. GBN-GP exists only in the prototype's demo data (req-1018). It would add two repos, a CDP service pair, a stack service and an E2E domain to a programme whose goal is to bring existing services up to DR2.1.

### Options compared

| | A. Category | B. Set, copied pages | C. Set, shared L2 | D. Separate service |
|---|---|---|---|---|
| Matches the prototype's structure | Yes | No | Partly | No |
| Matches the GBN-AG schema (mixed loads) | Yes | Partly | Partly | No |
| New themes | 0 | 2 | 3 or more | Many |
| Rows moved | 0 | 7 | 7 | All germinal rows |
| New rows | 0–1 | About 12–15 | About 3–5, plus the refactor | Many |
| Shared pages built once | Yes | No | Yes | No |
| Blocks other themes | No | No | Yes (wave 0) | No |
| Lifts the req-979 and req-1736–1738 blockers | Yes | Yes | Yes | Only once the service exists |

## Recommendation

**Option A.**

- The prototype is the default under the 7 October ruling, and it builds germinal products as one journey with a category.
- The real data model (GBN-AG, "Animals and Germinals") says the same.
- The set boundary is the wrong tool here. It exists to keep unrelated obligation sets apart, and it forbids sharing the 12 pages germinal products reuse unchanged.
- Storing the category now keeps a later split (B or C) open if a future release gives germinal products their own pages or CHED.

### Ruling text for Sam to agree

File: `workareas/shared/design-release-2-1/sources/ruling-sam-2026-10-08.md`. Put its id first in `precedence`.

```markdown
# Ruling: Sam, 8 October 2026

> Germinal products: build them as Design Release 2.1 does, as a category of the
> one GBN-AG animals notification, not as a set or service of their own.

1. Germinal products are a category of the one GBN-AG animals notification. They are built inside the live-animals set of trade-imports-animals-frontend, as branches on the notification's category, and stored by trade-imports-animals-backend with a GBN-AG reference. They are not a separate set, journey, service or reference prefix. New.
2. Every notification stores its category, live animals or germinal products. The animals backend stores it and publishes it to the INS read model, so the INS lists, cards and home section can tell the two apart. New.
3. The "What are you importing?" question, when creating a notification and when creating a template, offers "Germinal products (semen, ova, embryos)" second, as Design Release 2.1 does. It continues to the animals frontend's start with the germinal-products category. Replaces the outcome of conflict c-007 where it says "Germinal products is left off the list, as no real service takes it, until one can".
4. Germinal products are in scope: their narrowed reasons, the missing additional details page, donor identification per species, and package and weight totals. Replaces the germinal-products part of req-1668. Plants for planting, potatoes and wood products stay out of scope.
5. Germinal notifications take GBN-AG references. The prototype's GBN-GP references are demonstration data and are not built (req-1018). New.
6. The germinal products list, its home section and its cards are built (req-979, req-1736, req-1737, req-1738). The blocker "no service builds one today" no longer applies. New.
7. The animals frontend's set keeps the id and URLs live-animals for both categories. New.
```

### `sources.json` changes

- **goal**: replace the opening parenthesis with "(the GBN-AG animals notification, whose live-animals and germinal-products categories are one journey in the animals frontend's live-animals set, its dashboard, templates and address book)". The rest of the goal stays as it is.
- **sources**: add `ruling:sam-2026-10-08` (kind `ruling`, scope "whole file", role "the owner's decisions: outranks every other source"). Optional: add `repo:schemas` (`repos/trade-imports-schemas`, scope "the GBN-AG README and data dictionary lines on germinals and mixed loads", role "the notification's regulatory payload: a real constraint the prototype cannot express"), so the re-distil can cite the schema directly.
- **precedence**: `ruling:sam-2026-10-08` first.
- **repos, reposWhy, themes, repo:frontend scope**: no change.

## Rows and requirements to revisit (under option A)

| Id | Today | What happens |
|---|---|---|
| req-1668 | Out of scope, including germinal | Rewritten to cover plants for planting, potatoes and wood only (ruling claim 4) |
| req-003 | Germinal left off the type question | Re-adopted with Germinal products second (claim 3) |
| c-007 | Outcome leaves germinal off | Germinal clause overruled (claim 3). The re-distil records the ruling's conflict |
| req-1314 | Template type question leaves germinal off | Same options as req-003, so it now includes germinal |
| req-979, req-1736, req-1737, req-1738 | Blocked | `blockedBy` removed (claim 6) |
| inc-016 | Open question: are germinal products in? | Question removed. Also stores and publishes the category (claim 2). The gate stays |
| inc-017 | The same open question | Question removed |
| inc-024, inc-052, inc-053, inc-099, inc-105, inc-125, inc-161 | todo | No change |
| inc-141 | Live animals half only | Takes req-1736 back. Depends on inc-016 for real germinal data |
| inc-145 | Blocked | todo. Depends on inc-134 and inc-016 |
| inc-172 | Blocked | todo. Depends on inc-130, inc-141, inc-016 and inc-017 |
| inc-148 | Germinal left off | Offers germinal, routed to the animals frontend's start with the category. Depends on inc-016 |
| inc-154 | Criterion lists germinal, but req-1314 does not | Consistent once req-1314 changes |
| inc-128 | Gate says "two category sections" | Three sections (req-971). The germinal section's cards stay in inc-145 |
| inc-130, inc-135 | Category in the read model "in case the event lacks it" | The category now definitely comes from the animals backend's event (claim 2) |

After the ruling: re-distil (HANDOVER.md step 3), check that `tim backlog check` and `tim distil coverage` pass, then split.
