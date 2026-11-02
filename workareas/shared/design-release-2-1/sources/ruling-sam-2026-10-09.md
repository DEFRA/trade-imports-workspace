# Ruling: Sam, 8 and 9 October 2026

8 October, on the germinal options (germinal/options.md) and the URL sweep:

> Prototype is the authority for how things look and feel not how they are architected. Same without other shit
> i've see with incremetns to change url paths. Duplication of pages via features is the architecture of this app,
> its accepted and desired. Option B.

9 October, on the option B questions, the MDM rows and the decision-page questions:

> Germinal typeCode: "sounds like the schema knows best here, prototype is likely mock data."
>
> What the germinal notification sends to PIMS: "I think the schema will need updating, but I don't know what the
> shape should be. Think just store in our db for now but raise a ticket non-increment to do the schema update after
> this all lands."
>
> Links to the germinal set landing on main before the set is built: "ye thats fine."
>
> Germinal E2E specs: "yea insside animals is fine its still that frontend."
>
> Rows waiting on MDM integration: "Basically blocking all this on integration aint the answer, but you may have
> spotted our stubs need a tidy up - either to match the real thing if the real thing now excists, or to just tidy up
> pure stub data."
>
> Stub tidy-up: "Yes to the stub tidy up."
>
> Port of exit: "for the approved for animals bit - show the whle list for now. Can refine it later if flag gets
> added."
>
> Port order: "Do check if the airport/seaport flag exists, if it doesn't, add a ticket for the future." Rail: "In its
> own group after seaports."
>
> Which MDM country block each list uses (keep GBNAG_SPS_EX): "ye"
>
> c-218, the commercial transporter's Northern Ireland search (keep the default): "yea sounds reasonable"
>
> c-217, address search in each environment: "address search isn't implemented anywhere yet? as far as I know theres
> some poc/spike work but it isbn't wrired in?" Then: "keep the theme but mark it blocked? like we wait for the
> spike/poc to land and then re-distil that area. we will want to do it but we cna;t get?"
>
> When an animal counts as identified: "lets roll with this for now assuming its a no-change"

"Option B" is option B of germinal/options.md, worked up in germinal/option-b-plan.md. Its recommendation of option A
is overruled. Where a claim below sets out a design choice from that plan that Sam did not rule on separately, it says
"option B plan": that choice stands because Sam chose option B, not because he ruled on it. The port findings behind
claims 30 to 33 were checked on 9 October against MDM's raw responses (mdm/captures/raw/, compared in
mdm/stub-tidy-up-spec.md): every port carries `traffic` (Airport, Port or Rail), and no port carries an
approved-for-animals flag.

## (a) Germinal products is a sibling set

1. Germinal products is its own set in trade-imports-animals-frontend, `SET_ID 'germinal-products'`, mounted at
   `/germinal-products`, beside live-animals. It has its own journey, obligations, flow, cookies, gateway
   (`routes-germinal-products.js`) and set services. Journey pages sit at
   `/germinal-products/notifications/{journeyId}/{slug}` and use the live-animals slugs. The prototype's flat paths
   and its `?category=` routing are not copied. Replaces the germinal clause of c-007 and the germinal half of
   req-1668. New.
2. Duplicating pages is the app's architecture, and it is desired. Each germinal page is a copy of its live-animals
   feature folder, taken after the live twin has been built by this programme, plus the prototype's germinal
   differences. Copying is never weighed as a cost. New.
3. Option B plan: the germinal set leaves out three pages: Additional details, CPH number and permanent address. Its
   certified-for answer is set to "Germinal products" when the draft is created and shows on review with no Change
   link. Temperature is always asked. Weight is a total gross weight in kilograms, held as a decimal. New.
4. Option B plan: each set holds one category, so a consignment mixing live animals and germinal products is never
   written. Every mixed-load criterion is dropped (in req-114, req-124, req-126, req-169, req-170, req-181 and
   inc-024). Each set's commodity catalogue holds only its own commodities, so the 12 germinal lines now in the
   live-animals catalogue come out of it (req-092, restated per set). New.
5. Option B plan: germinal notifications keep GBN-AG references. GBN-GP references are demonstration data only
   (req-1018). New.
6. Option B plan: the animals backend stores the notification's category on the notification record (absent means
   live-animals). The set passes it when it creates the draft, the frontend's cross-set guard reads it (each set opens
   only its own category's notifications), and it is published on the notification event the INS backend reads. INS
   takes the category from that field, otherwise live-animals. There is no backend list filter: each set's root
   redirects to its INS list. New.
7. Each germinal trade line carries the GBN-AG `typeCode` the GBN-AG schema names: SEMEN for semen, EMBRYO for embryos
   and OVA for ova. Embryos and ova are separate items in the germinal catalogue. The prototype's single
   "Embryos/Ova" item is mock data and is not copied. Live trade lines carry LIVE_ANIMAL. Answers option B question 1
   (option-b-plan.md section 5), replacing its default of EMBRYO for every Embryos/Ova item. New.
8. The germinal notification publishes on GBN-AG only what the current PIMS profile (gbn-ag-pims v0.2.0 in
   trade-imports-schemas) already carries. Every germinal detail it has no field for is stored in the animals backend
   and shown in the service, but not published: temperature, donor name or ID, collection and production dates, the
   identification mark, and the decimal kilogram quantity and each line's gross weight (v0.2.0's quantity is a whole
   number and it has no gross weight). No new PIMS profile version is made in this programme, so neither
   trade-imports-schemas nor trade-imports-dynamics-gateway changes for the germinal set. The schema update is
   EUDPA-686, a Jira ticket outside the backlog, started after the programme lands. Answers option B question 2.
   Replaces the draft's claim that the decimal quantity and gross weight travel through the gateway to a new PIMS
   profile version (option-b-plan.md section 2, inc-017). New.
9. Option B plan: where the germinal set keeps donor details is decided from the real model (per-line identifiers as
   GBN-AG has them, or the species), not from the prototype's shape. New.
10. Option B plan: germinal is offered and unblocked. The type question offers Germinal products second and starts
    the germinal set. The INS germinal list's "Create new" starts the germinal set. The INS home's germinal section,
    the germinal list and the germinal cards are built (req-979, req-1736, req-1737 and req-1738 are no longer
    blocked). Templates carry their type, and each template card links to its own set. This sets aside req-003's
    "left off the list" and inc-148 criterion 3. New.
11. Links to the germinal set may land on `main` before the set itself is built: the INS germinal list's Create new,
    the INS home's germinal section and the type question's Germinal option land in earlier waves than the germinal
    theme. Answers option B question 3. New.
12. Option B plan: changing type between live animals and germinal products works as it does for plants: choosing
    another type starts that type's own notification. The prototype's single draft that changes type is not copied,
    and nothing is cleared on the abandoned notification (inc-150). New.
13. Option B plan: every requirement with a live half and a germinal half is split into two requirements, one per
    set, so each sits in exactly one increment: req-013, req-114, req-126, req-182, req-201, req-203, req-209,
    req-234, req-248, req-249, req-574, req-699, req-798, req-800, req-879, req-1032, req-1369 and req-1444. New.
14. Option B plan: the germinal set is one theme, `germinal-products`, in the last wave. It owns
    `sets/germinal-products/**` and the shared files listed in option-b-plan.md section 2, less the gateway and
    schemas touches claim 8 removes. Its Behaviour Spec prefix is `germinal-products`. INS-side germinal work (the set
    base, the address-book return entry, the type option, the lists) stays in the INS themes and is proven in the
    `ins` project. New.
15. The germinal set's end-to-end, accessibility and security specs live in the existing `animals` Playwright project,
    under `tests/animals/{e2e,a11y,security}/germinal-products/`. No new Playwright project is made. Answers option B
    question 4. New.

## (b) What the prototype decides

16. The prototype decides look and feel only: content, wording, layout, components, question order, and which
    questions are asked of which goods. Wherever a real service differs from Design Release 2.1 in look and feel, it
    changes to match. Replaces claim 1 of ruling:sam-2026-10-07.
17. The prototype never decides architecture: the split into sets, journeys and services, URL paths, query parameter
    and form field names, data-model shape, or code structure. No requirement is adopted, and no increment is built,
    because the prototype is built a certain way. Claim 5 of ruling:sam-2026-10-07 now reads: on look and feel, the
    prototype wins by default over what the real services do today. Replaces claim 5 of ruling:sam-2026-10-07.
18. An architecture change is adopted only for a reason of its own: a DR1 judgement, a real constraint (persistence,
    validation, authentication, cross-service behaviour), or a kept look-and-feel requirement that cannot be met
    without it. The change is then designed in the real service's conventions, not copied from the prototype. Claim 6
    of ruling:sam-2026-10-07 stands, for look and feel. New.
19. No increment changes an existing real URL path or code structure to match the prototype. A new page takes the
    real service's path shape where one exists. Where the real service has no shape to follow (such as the INS
    drill-down pages `/actions`, `/changes` and `/inspection`, inc-132 to inc-146), the prototype's path for that new
    page is acceptable. Acceptance criteria assert pages, headings and destinations, not literal paths or query
    strings. New.

## (c) The URL and architecture findings (option-b-plan.md section 3)

20. Dropped: these are out of scope. req-271 and inc-025 (arrival details moving to `arrival-details`); req-477 and
    the move in inc-031 (documents moving to `upload-documents`); c-059, overruled, so the documents page stays at
    `accompanying-documents`; req-1016 and inc-128's `/dashboard` redirect (struck from c-159 too); req-1342 and
    inc-157 (template ids built from titles); req-1366 and inc-160 (the template's id on the notification); inc-163,
    req-1341 and req-1362 (the unlinked template edit mode); req-1355 and inc-158 criterion 8 (a POST on the template
    page); req-1354 and inc-159 criterion 5 (the section allow-list); req-1087 and inc-140 criteria 2 and 3 (moving
    the success banner to a session flash: `?deleted=1` stays on the redirect); the germinal half of req-1668. inc-026 to
    inc-029 no longer depend on inc-025. New.
21. Content kept, without the prototype's URL, field or data shape: req-1403 and inc-004 (no
    `action=review|continue|hub` field; `exit=hub` and `?change=1` stay); inc-061 (the form stays at
    `/address-book/add`, the type step takes a path of its own); inc-067, inc-068, inc-069, inc-070, inc-071, req-1121,
    req-1126 and req-1259 (the tab parameter and its values, and the search parameter `q`, are the INS service's to
    name); inc-066, inc-073 and req-1167 (the return parameter's name is the service's; the allow-list stays);
    inc-074, inc-075, inc-076, req-394, req-463, req-1203 and req-1206 (which service owns transporter records, and
    where their details page lives, follow the real services); req-775 and inc-094 criterion 4 (the contact edit route
    stays); req-935 and inc-115 (Create a new notification stays a real mechanism, not a GET start page); inc-111,
    req-892 to req-894, req-898, req-900 and req-911 (the view header is keyed on the real route and status; dashboard
    draft rows keep going to the hub); req-909, inc-113 and inc-119 (how action-required is stored is the real
    team's); inc-116 and req-910 (the completed tag waits for a real source of completion and is blocked on it);
    inc-121 and req-1416, inc-126 and req-1455 (`?cancelled=1` and `?deleted=1` stay; req-1479 keeps asserting
    them); req-1037, req-1092, inc-129
    criterion 5 and inc-141 criterion 2 (Create new links to the start of the create journey with the list's
    category, not `create-notification?category=`); req-1291, req-010, req-1293, req-1303, req-1313, req-1316,
    req-1320, req-1323, req-1325, req-1331, req-1333, req-1338, req-1347, req-1349, req-1353, req-1356, req-1373,
    req-1380, req-943, inc-151 and inc-153 to inc-165 (templates pages are named by page and section, never by
    `/templates/...` paths or `?from=` markers); inc-155, inc-164 and inc-169 (a template never offers documents or a
    declaration; the URL guards are not required); inc-148 and req-1314 (the error links to the first radio; the field
    name is the service's); req-746, inc-054 criterion 10 and inc-057 criterion 4 (the permanent address behaviour
    stays; copy or reference, and where it is stored, are the plan's); req-727 and inc-054 (the permanent address page
    takes a real slug in the `addresses` section); req-972 and req-987 (View dashboard and Back links point wherever
    the list lives); the germinal content of inc-016, inc-017, inc-024, inc-052, inc-053, inc-099, inc-100, inc-105,
    inc-106, req-092, req-127, req-181 and req-1444, built in the germinal set's copies (claims 1 to 4). New.
22. Kept for a real constraint or a DR1 judgement, not because Design Release 2.1 shows it: inc-044, because the
    transporter select page is dead and writes inconsistently; inc-129 and c-159, because Rhys's DR1 judgement moves
    the dashboard to the INS front door (c-159's "as the prototype shows" clause is struck); c-176, inc-059 and
    inc-079 (address uses) and inc-087 (address roles), because a kept question must persist and DR1 asked for
    role-filtered pickers, with the record's field shape the address book service's design; inc-014 (c-012: the
    catalogue is too big for the page); inc-067 to inc-069's server-side filters (c-169); inc-095 (c-121); inc-111 and
    inc-115's Back and return links (c-143); c-189 and inc-120 (POST with crumb; c-190); inc-124 and req-1439 (a real
    bug); inc-126 (c-198, the service split in DR1 p1-014); inc-042 (c-178, real addresses; blocked by claim 34); c-183, c-186, c-214, c-213, c-039, c-022, c-047 and c-066. New.
23. Not architecture, so unchanged by this ruling: inc-001, inc-002 (but see claim 39), inc-006, inc-007, inc-008,
    inc-009, inc-015, inc-018, inc-021, inc-037 to inc-039, inc-043, inc-045, inc-046, inc-057, inc-058, inc-080,
    inc-090, inc-091, inc-149, req-034, req-040, req-046, req-058, req-119, req-147, req-564, req-580, req-963,
    c-007's type question in INS, c-011, c-021, c-112, c-119, c-044, c-106, c-125, and every row in option-b-plan.md
    section 4. New.
24. Template mode offers only the types whose service stores templates: live animals and germinal products. The
    plants types are left out of template mode until plants has templates (inc-154 criterion 1). Option B plan. New.

## (d) Reference lists and MDM

25. No reference list waits on MDM integration. Countries and ports of entry already come from real MDM through
    trade-imports-reference-data (real MDM in CDP test; trade-imports-stub locally and in CDP dev). Every list is
    built now against reference-data as it is, and its content is what MDM serves. Where a list's content differs from
    Design Release 2.1, that is MDM's content to change, never a reason to block a row or edit a list in code. This
    takes the block off the requirements behind c-026, c-027, c-048, c-054, c-transporters-004, c-107 and c-177, which
    rested on DR1's MDM judgement (Rhys, 2026-09-07); the judgement still stands for who owns list content. New.
26. inc-006, req-147: build now. The destination select offers reference-data's `GBNAG_SPS_EX` countries plus their
    subdivisions, labelled "<territory> (<parent>)", alphabetically, as the origin page does. New.
27. inc-007, req-370: build now. The transit country search offers the `GBNAG_SPS_EX` countries plus their
    subdivisions, labelled the same way. New.
28. inc-008 (req-432) and inc-082 (req-644) are unblocked. Their premise that a hard-coded list exists is wrong: the
    private transporter's country list is the UK plus reference-data's `GBNAG_SPS_EX` block, and the INS Country select
    is reference-data's unfiltered `/countries`. Neither list is edited in code. New.
29. Each country list keeps the MDM block it uses today (`GBNAG_SPS_EX` where it is filtered). A change of block is a
    content question for the list's owner, not an MDM gap. New.
30. Ahead of claims 26 to 28, one new row sits at the head of the `reference-lists` theme: the stub tidy-up, as
    mdm/stub-tidy-up-spec.md sets it out. inc-006, inc-007, inc-008 and inc-082 depend on it, because it changes the
    names and counts their tests assert. It covers:
    - trade-imports-stub: regenerate `portsOfEntryResponse.json` and `countriesResponse.json` from MDM's raw responses
      in mdm/captures/raw/, keeping the full real records (ports with `traffic`, addresses and status in MDM's order,
      GB MID's non-breaking spaces kept; all 250 countries in MDM's order), never guessing a masked value; serve the
      fixtures without dropping fields the stub's models do not know; `CountriesController` filters by `blocks` as MDM
      does (32 records for the SPS call, 250 otherwise); `FileUtilsTest` updated, with a test for the filter.
    - trade-imports-animals-frontend: rerun `_capture/capture.js` so its fixtures are current, and remove the stale
      "endpoint not built" tag.
    - trade-imports-ins-frontend: replace the 4 hand-typed stub countries with a captured fixture.
    - trade-imports-ins-tests: derive `country-codes.ts`'s names from the recaptured fixture, delete the unused
      164-entry `row` list, and check every spec that counts an unfiltered country list (31 becomes 249 locally).
    The port duplicates and misspellings stay in the stub, because they are in MDM's real data. These parts are the
    stub-tidy-up spec and mdm/findings.md section 6 (rows 1, 2, 5, 6 and 8) that Sam accepted with "Yes to the stub
    tidy up"; where the two differ, the spec, checked against the raw captures, wins. New.
31. req-149: the port of exit selects (transit and temporary admission) offer the whole ports-of-entry list for now.
    MDM has no approved-for-animals flag, so no exit-only list is built. If MDM adds the flag the list can be refined
    later, outside this programme (deferred.md). Replaces req-149's "only the exit border control posts approved for
    animals" and c-027's block. New.
32. req-302 and req-303 are MDM's data, not code: the duplicate ports (Pembroke, Sheerness) and misspellings
    (`Teestort`, `TILBURY`, `Portsmouth  Port`) are in real MDM. Sam reports them to the MDM team. They leave the
    backlog for the MDM content report, as req-026 to req-030 did. No test pins a misspelling or a duplicate. New.
33. req-304 is built now. trade-imports-reference-data maps MDM's port `traffic` through to `/ports-of-entry`, and the
    port list is ordered airports first, then seaports, then rail, each group A to Z by name ignoring letter case, with
    non-breaking and doubled spaces normalised before comparing. No future ticket is needed for the port type. New.

## (e) Address search

34. Address search is blocked until the address lookup becomes a real feature. Today only the EUDPA-390 spike exists,
    gated to dev and local on a standalone page. The address search rows stay in the backlog, blocked on that: inc-042,
    the search part of inc-071, inc-072 and the search part of inc-081, with req-456, req-457, req-647 to req-654,
    req-1214 and req-1216 to req-1218. Once the lookup lands as a feature, that area is re-distilled. Manual address
    entry is not blocked and is built now. Answers c-217, replacing its default (the stub locally, the real lookup in
    CDP dev, off elsewhere). New.
35. The commercial transporter's Northern Ireland search uses the same INS backend address lookup, limited to
    Northern Ireland (BT) postcodes, with Northern Ireland addresses added to trade-imports-stub's lookup data. It is
    built when address search is built, so it is blocked with claim 34 (inc-042). Answers c-218 (the default). New.

## (f) When an animal counts as identified

36. One identifier is enough: a record with one identifier counts as identified, for the Complete status and for
    submit. This is what the code does today, what Design Release 2.1 (V4) shows and what DR1 inc-100 (EUDPA-579,
    animals frontend PR #320) built. There is no separate, stricter bar for Complete. New.
37. DR1 inc-103 (counting an animal as identified only once every identifier is filled in) is closed and not built.
    inc-147's blocker on it is removed, and req-905, req-906, req-908, req-931 and req-940 are weighed against
    claim 36. New.
38. The inc-100 rule for notifications with several lines (how many identification records are needed) is written
    into the Behaviour Spec under `openspec/`, which is silent on it today. New.

## (g) Overview-opened pages

39. A page opened from its overview task returns to the overview on Save and continue (req-1615). inc-002 criterion
    10, which says Roles and addresses opened from the overview still runs on to the CPH number page, contradicts
    criterion 4 and is removed. No `?from=hub` marker is added; only the live flow's fallback changes. New.

## (h) Repos

40. trade-imports-performance-tests joins inc-129, the one row that moves a route its k6 scripts use: the live-animals
    set root stops rendering the notification list. No other row needs it, because the move of the documents page to
    `upload-documents` is dropped (claim 20). New.
