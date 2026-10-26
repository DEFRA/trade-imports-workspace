# Ruling: Sam, 8 October 2026

> Prototype is the authority for how things look and feel not how they are architected. Same without other shit
> i've see with incremetns to change url paths. Duplication of pages via features is the architecture of this app,
> its accepted and desired. Option B.

<!--
DRAFT. Saved here, not in sources/, until Sam has read it and answered the three placeholders at the foot.
Once he has:
  1. Add his approval words to the quote above, verbatim (for example "Approved as drafted, with ..."). The
     extractor checks every claim against the quote, and many claims below spell out what "Option B" means, so the
     approval has to be in the quote for them to stand.
  2. Replace each PLACEHOLDER with a numbered claim, or delete it if the default stands and Sam says so.
  3. Copy this file to ../sources/ruling-sam-2026-10-08.md and apply the sources.json edits at the foot.
"Option B" is option B of germinal/options.md. Its recommendation of option A is overruled.
-->

## (a) Germinal products is a sibling set

1. Germinal products is its own set in trade-imports-animals-frontend, `SET_ID 'germinal-products'`, mounted at
   `/germinal-products`, beside live-animals. It has its own journey, obligations, flow, cookies, gateway
   (`routes-germinal-products.js`) and set services. Journey pages sit at
   `/germinal-products/notifications/{journeyId}/{slug}` and use the live-animals slugs. The prototype's flat paths
   and its `?category=` routing are not copied. Replaces the germinal clause of c-007 and the germinal part of
   req-1668. New.
2. Copying is desired. Each germinal page is a copy of its live-animals feature folder, taken after the live twin
   has been built by this programme, plus the prototype's germinal differences. Copying is the app's architecture
   and is never weighed as a cost. New.
3. The germinal set leaves out three pages: Additional details, CPH number and permanent address. Its
   certified-for answer is set to "Germinal products" when the draft is created and shows on review with no Change
   link. Temperature is always asked. Weight is a total gross weight in kilograms, held as a decimal. New.
4. Each set holds one category, so a consignment mixing live animals and germinal products is never written. Every
   mixed-load criterion is dropped (in req-114, req-124, req-126, req-169, req-170, req-181 and inc-024). Each set's
   commodity catalogue holds only its own commodities, so the 12 germinal lines now in the live-animals catalogue
   come out of it (req-092, restated). New.
5. Germinal notifications keep GBN-AG references. GBN-GP references are demonstration data only (req-1018). New.
6. The animals backend stores the notification's category on the notification record (absent means live-animals).
   The set passes it when it creates the draft, the frontend's cross-set guard reads it (each set opens only its own
   category's notifications), and it is published on the notification event the INS backend reads. INS takes the
   category from that field, otherwise live-animals. Each trade line also carries its GBN-AG `typeCode`
   (LIVE_ANIMAL, or the germinal value) for PIMS. There is no backend list filter: each set's root redirects to its
   INS list. New.
7. The decimal kilogram quantity and each line's gross weight go through every hop: the animals backend, the
   dynamics gateway, and a new PIMS profile version in trade-imports-schemas
   (`schemas/profiles/imports/gb/pims`). The gateway merges first, then schemas, then the backend, then the
   frontend. New.
8. Where the germinal set keeps donor details is decided from the real model (per-line identifiers as GBN-AG has
   them, or the species), not from the prototype's shape. New.
9. Germinal is offered and unblocked. The type question offers Germinal products second and starts the germinal
   set. The INS germinal list's "Create new" starts the germinal set. The INS home's germinal section, the germinal
   list and the germinal cards are built (req-979, req-1736, req-1737 and req-1738 are no longer blocked). Templates
   carry their type, and each template card links to its own set. This sets aside req-003's "left off the
   list" and inc-148 criterion 3. New.
10. Changing type between live animals and germinal products works as it does for plants: choosing another type
    starts that type's own notification. The prototype's single draft that changes type is not copied, and nothing
    is cleared on the abandoned notification (inc-150). New.
11. Every requirement with a live half and a germinal half is split into two requirements, one per set, so each
    sits in exactly one increment: req-013, req-114, req-126, req-182, req-201, req-203, req-209, req-234, req-248,
    req-249, req-574, req-699, req-798, req-800, req-879, req-1032, req-1369 and req-1444. New.
12. The germinal set is one theme, `germinal-products`, in the last wave. It owns `sets/germinal-products/**` and
    the shared files listed in option-b-plan.md section 2. Its end-to-end, accessibility and security specs live in
    the `animals` Playwright project under `tests/animals/{e2e,a11y,security}/germinal-products/`. Its Behaviour
    Spec prefix is `germinal-products`. INS-side germinal work (the set base, the address-book return entry, the
    type option, the lists) stays in the INS themes and is proven in the `ins` project. New.

## (b) What the prototype decides

13. The prototype decides look and feel only: content, wording, layout, components, question order, and which
    questions are asked of which goods. Wherever a real service differs from Design Release 2.1 in look and feel,
    it changes to match. Replaces claim 1 of ruling:sam-2026-10-07.
14. The prototype never decides architecture: the split into sets, journeys and services, URL paths, query
    parameter and form field names, data-model shape, or code structure. No requirement is adopted, and no
    increment is built, because the prototype is built a certain way. Narrows claim 5 of ruling:sam-2026-10-07,
    which now reads: on look and feel, the prototype wins by default over what the real services do today.
    Replaces claim 5 of ruling:sam-2026-10-07.
15. An architecture change is adopted only for a reason of its own: a DR1 judgement, a real constraint
    (persistence, validation, authentication, cross-service behaviour), or a kept look-and-feel requirement that
    cannot be met without it. The change is then designed in the real service's conventions, not copied from the
    prototype. Claim 6 of ruling:sam-2026-10-07 stands for look and feel. New.
16. No increment changes an existing real URL path or code structure to match the prototype. A new page takes the
    real service's path shape where one exists. Where the real service has no shape to follow (such as the INS
    drill-down pages `/actions`, `/changes` and `/inspection`), the prototype's path for that new page is
    acceptable. Acceptance criteria assert pages, headings and destinations, not literal paths or query strings.
    New.

## (c) URL and architecture changes not adopted

17. These are out of scope: req-271 and inc-025 (arrival details moving to `arrival-details`); req-477 and the
    address move in inc-031 (documents moving to `upload-documents`); req-1016 and inc-128's `/dashboard` redirect;
    req-1342 and inc-157 criterion 6 (template ids built from titles); req-1366 and inc-160 criterion 3 (the
    template's id on the notification); inc-163, req-1341 and req-1362 (the unlinked template edit mode); req-1355
    and inc-158 criterion 8 (a POST on the template page); req-1354 and inc-159 criterion 5 (the section allow-list);
    req-1087 and inc-140 criteria 2 and 3 (moving the success banner to a session flash); the germinal half of
    req-1668. c-059 is overruled: the documents page stays at `accompanying-documents`. inc-026 to inc-029 no longer
    depend on inc-025. New.
18. These keep their look and feel but drop the prototype's URL, field or data shape: req-1403 and inc-004 (no
    `action=review|continue|hub` field; `?change=1` stays); inc-061 (the form stays at `/address-book/add`, the
    type step takes a path of its own); inc-067, inc-068, inc-069, inc-070, inc-071, req-1121, req-1126 and
    req-1259 (the tab parameter and its values, and the search parameter `q`, are the INS service's to name);
    inc-066, inc-073, req-1167 (the return parameter's name is the service's; the allow-list stays); inc-074,
    inc-075, inc-076, req-394, req-463, req-1203 and req-1206 (which service owns transporter records and where
    their details page lives follow the real services); req-775 and inc-094 criterion 4 (the contact edit route
    stays); req-935 and inc-115 (Create a new notification stays a real mechanism, not a GET start page); inc-111,
    req-892 to req-894, req-898, req-900 and req-911 (the view header is keyed on the real route and status;
    dashboard draft rows keep going to the hub); req-909, inc-113 and inc-119 (how action-required is stored is
    the real team's); inc-116 and req-910 (the completed tag waits for a real source of completion and is blocked
    on it); inc-121 and req-1416, inc-126 and req-1455 (`?cancelled=1` and `?deleted=1` stay; req-1479 keeps
    asserting them); req-1037, req-1092, inc-129 criterion 5 and inc-141 criterion 2 (Create new links to the
    start of the create journey with the list's category, not `create-notification?category=`); req-1291,
    req-010, req-1293, req-1303, req-1313, req-1316, req-1320, req-1323, req-1325, req-1331, req-1333, req-1338,
    req-1347, req-1349, req-1353, req-1356, req-1373, req-1380, req-943, inc-151, inc-153 to inc-165 (templates
    pages are named by page and section, never by `/templates/...` paths or `?from=` markers); inc-155, inc-164
    and inc-169 (a template never offers documents or a declaration; the URL guards are not required); inc-148 and
    req-1314 (the error links to the first radio; the field name is the service's); req-746 and inc-054 criterion
    10, inc-057 criterion 4 (the permanent address behaviour stays; copy or reference, and where it is stored, are
    the plan's); req-727 and inc-054 (the permanent address page takes a real slug in the `addresses` section). New.
19. inc-044 is kept because the transporter select page is dead and writes inconsistently, not because Design
    Release 2.1 lacks it. inc-129 and c-159 are kept because Rhys's DR1 judgement moves the dashboard to the INS
    front door, not because the prototype shows it there. c-176 (address uses) and inc-087 (address roles) are
    kept because a kept question must persist and DR1 asked for role-filtered pickers; the record's field shape is
    the address book service's design. New.
20. Template mode offers only the types whose service stores templates: live animals and germinal products. The
    plants types are left out of template mode until plants has templates (inc-154 criterion 1). New.
21. trade-imports-performance-tests joins any increment that moves a route its k6 scripts use. inc-129 is one: the
    set root stops rendering the list. New.

## Placeholders: questions Sam has not answered

<!-- PLACEHOLDER 1: c-217, address search in each environment. Not answered.
     Default on the decision page: the stub locally, the real lookup in CDP dev, and switched off elsewhere until
     the lookup is set up there. Write Sam's answer as a numbered claim: "... Answers c-217." -->

<!-- PLACEHOLDER 2: c-218, the commercial transporter's Northern Ireland search. Not answered.
     Default: the same INS backend lookup filtered to BT postcodes, with Northern Ireland stub data added to
     trade-imports-stub. Write Sam's answer as a numbered claim: "... Answers c-218." -->

<!-- PLACEHOLDER 3: when an animal counts as identified (DR1 inc-103, deferred to the design authority; inc-147,
     req-905, req-906, req-908, req-931, req-940). Not answered.
     Default: one identifier is enough to submit, every identifier is needed for Complete, and missing ones are
     flagged on confirmation and the dashboard. Write Sam's answer as a numbered claim. -->

<!-- PLACEHOLDERS 4 to 7: the open questions in option-b-plan.md (germinal typeCode values, what is published to
     PIMS, the window on main, where germinal E2E specs live). Each has a default there. -->

## Proposed sources.json edits

Apply once the ruling is saved to `sources/`.

Add the source:

```json
{ "id": "ruling:sam-2026-10-08", "kind": "ruling", "locator": "workareas/shared/design-release-2-1/sources/ruling-sam-2026-10-08.md", "scope": "whole file", "role": "the owner's decisions: outranks every other source. The prototype decides look and feel only (content, wording, layout, components, question order); it never decides architecture (sets, journeys, services, URL paths, field names, data-model shape, code structure). Germinal products is a sibling set of live-animals in the animals frontend." }
```

Change the 7 Oct ruling's `role` to: "the owner's decisions, as narrowed by ruling:sam-2026-10-08: on look and feel
the prototype wins by default over what the real services do today; only a DR1 judgement on the same difference, or
a real constraint the prototype cannot express (persistence, validation, authentication, cross-service behaviour),
overrides it. The prototype never decides architecture."

`precedence`: put `"ruling:sam-2026-10-08"` first, before `"ruling:sam-2026-10-07"`. The rest is unchanged.

`goal`:

> Bring the real GB notification services (the GBN-AG animals notification as two sets in the animals frontend,
> live-animals and germinal-products, its dashboard, templates and address book) up to Design Release 2.1 of the GB
> notification service prototype in look and feel: content, wording, layout, components and question order. Wherever
> a real service differs from Design Release 2.1 in look and feel it changes to match, except where a DR1 judgement
> on that same difference, or a real constraint the prototype cannot express (persistence, validation,
> authentication, cross-service behaviour), overrides it. Architecture (sets, journeys, services, URL paths, data
> shapes, code structure) stays the real services'.

`scope`: stays `null`.

`repos`: add

```json
"gateway": "repos/trade-imports-dynamics-gateway",
"schemas": "repos/trade-imports-schemas",
"perftests": "repos/trade-imports-performance-tests"
```

`reposWhy`: append "; the germinal set's decimal kilogram quantity and gross weight travel through the dynamics
gateway (gateway) to a new PIMS profile version (schemas); the k6 performance suite (perftests) hard-codes routes
the dashboard move changes."
