# Design Release 2.1 coverage

Prototype: `~/git/defra/defra-design/GB-notification-service` (main as pulled
on 7 October 2026). Suite: 103 tests, all passing. The route table below is
generated from `../sources/traces-prototype/index.json` and
`../evidence/prototype/index.json` by `npm run coverage`; "Visited by" counts
every test whose trace requested the route (redirect hops included).

## Routes

Every GET route the DR2.1 mount copies from `app/routes.js` that a user can land
on. Views marked "(shared …)" have no DR2.1 override and render the root view
inside the mount.

<!-- routes:start -->
| Route | View (DR2.1 override unless marked) | Visited by | Evidence states captured |
|---|---|---|---|
| `/design-release-2.1` | dashboard-home | 6 test(s), e.g. `dashboard` › overall dashboard › /dashboard redirects to the overall dashboard, or to live animals with a query | dashboard |
| `/design-release-2.1/index` | (shared index) | 1 test(s), e.g. `dashboard` › overall dashboard › the prototype index lists every design release | index |
| `/design-release-2.1/dashboard` | redirect | 1 test(s), e.g. `dashboard` › overall dashboard › /dashboard redirects to the overall dashboard, or to live animals with a query | — |
| `/design-release-2.1/live-animals` | dashboard | 6 test(s), e.g. `about-the-consignment` › notification type › starting from a category dashboard skips the type question | live-animals--completed, live-animals--deleted, live-animals--drafts, live-animals--filters-open, live-animals--in-progress, live-animals--search |
| `/design-release-2.1/germinal-products` | dashboard | 1 test(s), e.g. `dashboard` › category dashboards › germinal products: packages instead of animals | germinal-products--in-progress |
| `/design-release-2.1/actions` | dashboard-actions | 1 test(s), e.g. `dashboard` › at a glance drill-downs › action needed lists notifications needing action | actions--live-animals, actions |
| `/design-release-2.1/changes` | dashboard-changes | 1 test(s), e.g. `dashboard` › at a glance drill-downs › status updated lists changes in the past 24 hours | changes--germinal-products, changes |
| `/design-release-2.1/inspection` | dashboard-inspection | 1 test(s), e.g. `dashboard` › at a glance drill-downs › inspection required lists consignments due at the BCP | inspection--guidance-open, inspection |
| `/design-release-2.1/create-notification` | redirect | 67 test(s), e.g. `about-the-consignment` › germinal products: section 1 › category start, germinal search hint and the reduced list of reasons | — |
| `/design-release-2.1/notification-type` | notification-type | 65 test(s), e.g. `about-the-consignment` › main import reason › a reason is optional to proceed | notification-type--error, notification-type |
| `/design-release-2.1/origin-of-the-import` | origin-of-the-import | 72 test(s), e.g. `about-the-consignment` › germinal products: section 1 › category start, germinal search hint and the reduced list of reasons | origin-of-the-import--amend, origin-of-the-import--country-search-open, origin-of-the-import--error-region-code, origin-of-the-import--region-code-prefix, origin-of-the-import--region-code-reveal, origin-of-the-import--template-section-edit, origin-of-the-import |
| `/design-release-2.1/what-are-you-importing` | what-are-you-importing | 61 test(s), e.g. `about-the-consignment` › germinal products: section 1 › category start, germinal search hint and the reduced list of reasons | what-are-you-importing--error, what-are-you-importing--germinal-search-results, what-are-you-importing--help-open, what-are-you-importing--one-selected, what-are-you-importing--plants-no-results, what-are-you-importing--search-results, what-are-you-importing--two-selected, what-are-you-importing |
| `/design-release-2.1/prototype/reason-for-import` | redirect | 1 test(s), e.g. `about-the-consignment` › main import reason › the prototype seed route jumps straight to the reason page | — |
| `/design-release-2.1/reason-for-import` | reason-for-import | 52 test(s), e.g. `about-the-consignment` › germinal products: section 1 › category start, germinal search hint and the reduced list of reasons | reason-for-import--error-internal-market, reason-for-import--error-temporary-admission-real-date, reason-for-import--error-temporary-admission, reason-for-import--error-transhipment, reason-for-import--error-transit, reason-for-import--germinal, reason-for-import--internal-market-reveal, reason-for-import--temporary-admission-reveal, reason-for-import--transhipment-reveal, reason-for-import--transit-reveal, reason-for-import |
| `/design-release-2.1/consignment-details` | consignment-details | 41 test(s), e.g. `about-the-consignment` › main import reason › a reason is optional to proceed | consignment-details--error-required, consignment-details--error-whole-number, consignment-details--germinal-error-invalid, consignment-details--germinal-error-required, consignment-details--germinal, consignment-details--two-commodities, consignment-details |
| `/design-release-2.1/animal-identification-details` | animal-identification-details | 24 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination search UK addresses | animal-identification-details--all-animals-saved, animal-identification-details--animal-1-of-2, animal-identification-details--animal-2-of-2, animal-identification-details--germinal-error, animal-identification-details--germinal |
| `/design-release-2.1/additional-animal-details` | additional-animal-details | 17 test(s), e.g. `description-of-the-goods` › additional details › cattle: certification purpose and unweaned animals | additional-animal-details--cattle, additional-animal-details--poultry |
| `/design-release-2.1/arrival-details` | arrival-details | 18 test(s), e.g. `description-of-the-goods` › additional details › cattle: certification purpose and unweaned animals | arrival-details--amend, arrival-details--error, arrival-details--port-search-open, arrival-details |
| `/design-release-2.1/transit-countries` | transit-countries | 5 test(s), e.g. `journeys` › notification journeys end to end › germinal products: bovine semen with donor identification | transit-countries--two-countries, transit-countries |
| `/design-release-2.1/transport-details` | redirect | 1 test(s), e.g. `transport-and-arrival` › transporter details › the legacy transport-details path redirects to the transporter page | — |
| `/design-release-2.1/transporter` | transporter | 14 test(s), e.g. `journeys` › notification journeys end to end › cattle by air: identification, unweaned question, CPH number | transporter--transporter-added, transporter |
| `/design-release-2.1/transporter/add` | transporter-add | 5 test(s), e.g. `address-book` › add an address to the address book › transporter: hands over to the add-a-transporter pages | transporter-add--error, transporter-add |
| `/design-release-2.1/transporter/add/private` | transporter-add-private | 2 test(s), e.g. `transport-and-arrival` › add a transporter › private transporter: cancel leaves the journey for the dashboard | transporter-add-private--error, transporter-add-private |
| `/design-release-2.1/transporter/add/commercial` | transporter-add-commercial | 1 test(s), e.g. `transport-and-arrival` › add a transporter › commercial transporter: authorisation number, address search or manual entry | transporter-add-commercial--error, transporter-add-commercial--manual-address, transporter-add-commercial |
| `/design-release-2.1/upload-documents` | upload-documents | 15 test(s), e.g. `documents` › upload documents › a complete document is listed with its virus check status, and can be removed | upload-documents--error-real-date, upload-documents--error, upload-documents--file-chosen, upload-documents--one-document, upload-documents |
| `/design-release-2.1/roles-and-addresses` | roles-and-addresses | 20 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination search UK addresses | roles-and-addresses--cat-air-complete, roles-and-addresses--cat-empty, roles-and-addresses--cat-permanent-added, roles-and-addresses--cattle-air-complete, roles-and-addresses--cattle-empty, roles-and-addresses--complete, roles-and-addresses--germinal-semen-complete, roles-and-addresses--horse-sea-complete, roles-and-addresses--poultry-rail-complete, roles-and-addresses--same-as-applied, roles-and-addresses--same-as-shortcuts |
| `/design-release-2.1/place-of-origin` | consignment-address-select | 8 test(s), e.g. `consignment-parties` › add an address from the journey › place of origin: an international address entered by hand | place-of-origin--address-added, place-of-origin |
| `/design-release-2.1/consignor-or-exporter` | consignment-address-select | 8 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination search UK addresses | consignor-or-exporter--search, consignor-or-exporter |
| `/design-release-2.1/consignee` | consignment-address-select | 8 test(s), e.g. `consignment-parties` › consignment addresses › picking an address for every role, then the CPH number | consignee |
| `/design-release-2.1/importer` | consignment-address-select | 8 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination search UK addresses | importer |
| `/design-release-2.1/place-of-destination` | consignment-address-select | 8 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination search UK addresses | place-of-destination |
| `/design-release-2.1/place-of-origin/add-address` | consignment-add-address | 1 test(s), e.g. `consignment-parties` › add an address from the journey › place of origin: an international address entered by hand | place-of-origin-add-address--error, place-of-origin-add-address |
| `/design-release-2.1/consignor-or-exporter/add-address` | consignment-add-address | 1 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination search UK addresses | consignor-or-exporter-add-address |
| `/design-release-2.1/consignee/add-address` | consignment-add-address | 1 test(s), e.g. `consignment-parties` › add an address from the journey › consignee: a UK address found by search, then completed | consignee-add-address--lookup-error, consignee-add-address--lookup-picked, consignee-add-address--lookup-results, consignee-add-address--lookup |
| `/design-release-2.1/importer/add-address` | consignment-add-address | 1 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination search UK addresses | importer-add-address |
| `/design-release-2.1/place-of-destination/add-address` | consignment-add-address | 1 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination search UK addresses | place-of-destination-add-address |
| `/design-release-2.1/cph-number` | cph-number | 4 test(s), e.g. `consignment-parties` › consignment addresses › cat: permanent address replaces the CPH number | cph-number |
| `/design-release-2.1/permanent-address` | redirect | 2 test(s), e.g. `consignment-parties` › permanent address › cat: one choice per animal, same as destination or a new address | — |
| `/design-release-2.1/permanent-address/select` | permanent-address-animals | 3 test(s), e.g. `consignment-parties` › permanent address › cat: one choice per animal, same as destination or a new address | permanent-address-select--error-new-address, permanent-address-select--error-no-place-of-destination, permanent-address-select--new-address-reveal, permanent-address-select--select |
| `/design-release-2.1/permanent-address/enter-address` | redirect | 1 test(s), e.g. `consignment-parties` › permanent address › the enter-address path is retired and lands on the per-animal page | — |
| `/design-release-2.1/contact-address-for-consignment` | contact-address-for-consignment | 8 test(s), e.g. `consignment-parties` › consignment addresses › picking an address for every role, then the CPH number | contact-address-for-consignment--error, contact-address-for-consignment |
| `/design-release-2.1/notification-hub` | notification-hub | 15 test(s), e.g. `about-the-consignment` › what are you importing › save and return to overview keeps the selection without validating | notification-hub--cat-air-complete, notification-hub--cattle-air-complete, notification-hub--copied, notification-hub--empty, notification-hub--from-template, notification-hub--germinal-semen-complete, notification-hub--horse-sea-complete, notification-hub--new-template, notification-hub--poultry-rail-complete, notification-hub--template |
| `/design-release-2.1/review-notification` | review-notification | 13 test(s), e.g. `consignment-parties` › contact address for consignment › choose the contact address | review-notification--action-required, review-notification--amend-modal, review-notification--amend, review-notification--cancel-amend-modal, review-notification--cat-air-complete, review-notification--cattle-air-complete, review-notification--completed, review-notification--draft, review-notification--germinal-semen-complete, review-notification--horse-sea-complete, review-notification--incomplete, review-notification--just-submitted, review-notification--poultry-rail-complete, review-notification--submitted, review-notification--template |
| `/design-release-2.1/declaration` | declaration | 8 test(s), e.g. `journeys` › notification journeys end to end › cattle by air: identification, unweaned question, CPH number | declaration--error, declaration |
| `/design-release-2.1/notification-submitted` | notification-submitted | 7 test(s), e.g. `journeys` › notification journeys end to end › cattle by air: identification, unweaned question, CPH number | notification-submitted--amended, notification-submitted--cat-air, notification-submitted--cattle-air, notification-submitted--germinal-semen, notification-submitted--horse-sea, notification-submitted--poultry-rail |
| `/design-release-2.1/notifications/delete` | delete-notification | 1 test(s), e.g. `manage-notifications` › delete a notification › confirm the deletion; the dashboard shows a success banner | notifications-delete |
| `/design-release-2.1/notifications/amend` | redirect | 3 test(s), e.g. `manage-notifications` › amend a submitted notification › cancel an amendment from the amend review | — |
| `/design-release-2.1/notifications/cancel-amend` | redirect | 2 test(s), e.g. `manage-notifications` › amend a submitted notification › cancel an amendment from the amend review | — |
| `/design-release-2.1/notifications/copy-as-new` | redirect | 2 test(s), e.g. `manage-notifications` › amend and copy guards › cancel-amend with no amendment in progress, and unknown references, return to the dashboard | — |
| `/design-release-2.1/templates` | dashboard-templates | 9 test(s), e.g. `templates` › a saved template › delete: confirm, then the list says it was deleted | templates--deleted, templates--saved, templates |
| `/design-release-2.1/templates/create` | create-template | 3 test(s), e.g. `templates` › create a new template › a template with no name is saved as "Untitled template" | templates-create |
| `/design-release-2.1/templates/save` | redirect | 1 test(s), e.g. `templates` › create a new template › a template with no name is saved as "Untitled template" | — |
| `/design-release-2.1/templates/discard` | delete-template | 2 test(s), e.g. `templates` › create a new template › discard a template being created | templates-discard |
| `/design-release-2.1/templates/:templateId` | view-template | 4 test(s), e.g. `templates` › a saved template › change one section: save and return goes back to the template | templates-arena-aintree--updated, templates-arena-aintree |
| `/design-release-2.1/templates/:templateId/change/:section` | redirect | 1 test(s), e.g. `templates` › a saved template › change one section: save and return goes back to the template | — |
| `/design-release-2.1/templates/:templateId/use` | redirect | 1 test(s), e.g. `templates` › a saved template › use: starts a new draft notification from the template | — |
| `/design-release-2.1/templates/:templateId/edit` | redirect | 1 test(s), e.g. `templates` › a saved template › edit: opens the template on its own task list | — |
| `/design-release-2.1/templates/:templateId/delete` | delete-template | 1 test(s), e.g. `templates` › a saved template › delete: confirm, then the list says it was deleted | templates-arena-aintree-delete |
| `/design-release-2.1/address-book` | (shared address-book) | 4 test(s), e.g. `address-book` › add an address to the address book › origin or consignor: an address entered by hand with its uses | address-book--address-added, address-book--branch, address-book--deleted, address-book--destination-consignee-importer, address-book--origin-and-consignor, address-book--page-2, address-book--search, address-book--transporter, address-book--updated |
| `/design-release-2.1/address-book/add` | (shared address-book-add) | 7 test(s), e.g. `address-book` › add an address to the address book › branch: the branch address use | address-book-add--error, address-book-add |
| `/design-release-2.1/address-book/add/lookup` | (shared address-book-lookup / consignment-add-address) | 4 test(s), e.g. `address-book` › add an address to the address book › branch: the branch address use | address-book-add-lookup--branch, address-book-add-lookup--destination-consignee-importer-error, address-book-add-lookup--destination-consignee-importer, address-book-add-lookup--destination-picked, address-book-add-lookup--from-contact, address-book-add-lookup--origin-and-consignor-error, address-book-add-lookup--origin-and-consignor |
| `/design-release-2.1/address-book/add/usage` | (shared address-book-add-usage) | 1 test(s), e.g. `address-book` › add an address to the address book › the usage step is only reachable with an address pending | — |
| `/design-release-2.1/address-book/:addressId` | (shared address-book-view) | 1 test(s), e.g. `address-book` › an address book entry › view, edit and save | address-book-green-valley-farm-sanpetru-0 |
| `/design-release-2.1/address-book/:addressId/edit` | (shared address-book edit) | 1 test(s), e.g. `address-book` › an address book entry › view, edit and save | address-book-green-valley-farm-sanpetru-0-edit--error, address-book-green-valley-farm-sanpetru-0-edit |
| `/design-release-2.1/address-book/:addressId/delete` | delete-address | 1 test(s), e.g. `address-book` › an address book entry › delete: confirm, then the list says it was deleted | address-book-green-valley-farm-sanpetru-0-delete |
<!-- routes:end -->

## DR2.1 override views (36 files in `app/views/design-release-2.1/`)

| Override | Rendered by | Visited |
|---|---|---|
| dashboard-home | `/` | yes |
| dashboard | `/live-animals`, `/germinal-products` | yes |
| dashboard-actions | `/actions` | yes |
| dashboard-changes | `/changes` | yes |
| dashboard-inspection | `/inspection` | yes |
| dashboard-templates | `/templates` | yes |
| notification-type | `/notification-type` | yes |
| origin-of-the-import | `/origin-of-the-import` | yes |
| what-are-you-importing | `/what-are-you-importing` | yes |
| reason-for-import | `/reason-for-import` | yes |
| consignment-details | `/consignment-details` | yes |
| animal-identification-details | `/animal-identification-details` | yes |
| additional-animal-details | `/additional-animal-details` | yes |
| arrival-details | `/arrival-details` | yes |
| transit-countries | `/transit-countries` | yes |
| transporter | `/transporter` | yes |
| transporter-add | `/transporter/add` | yes |
| transporter-add-private | `/transporter/add/private` | yes |
| transporter-add-commercial | `/transporter/add/commercial` | yes |
| upload-documents | `/upload-documents` | yes |
| roles-and-addresses | `/roles-and-addresses` | yes |
| consignment-address-select | `/place-of-origin`, `/consignor-or-exporter`, `/consignee`, `/importer`, `/place-of-destination` | yes |
| consignment-add-address | `/<role>/add-address` (all five), `/address-book/add/lookup` | yes |
| cph-number | `/cph-number` | yes |
| permanent-address-animals | `/permanent-address/select` | yes |
| permanent-address | nothing (see below) | **no — unreachable** |
| contact-address-for-consignment | `/contact-address-for-consignment` | yes |
| notification-hub | `/notification-hub` | yes |
| review-notification | `/review-notification` (journey, dashboard view, amend, template) | yes |
| declaration | `/declaration` | yes |
| notification-submitted | `/notification-submitted` | yes |
| delete-notification | `/notifications/delete` | yes |
| create-template | `/templates/create` | yes |
| view-template | `/templates/:templateId` | yes |
| delete-template | `/templates/:templateId/delete`, `/templates/discard` | yes |
| delete-address | `/address-book/:addressId/delete` | yes |

## Not reached, and why

- **`permanent-address.html` override** — `renderPermanentAddressPage` is never
  called. `GET` and `POST /permanent-address` both reset the answer and redirect
  to `/permanent-address/select` (the per-animal page), and
  `/permanent-address/enter-address` redirects there too. Dead view in DR2.1.
- **`POST /upload-documents/virus-check/:documentId`** — a JSON endpoint, not a
  page. The client script posts to the *unprefixed* path, so under DR2.1 it hits
  the root session and never marks the DR2.1 document as passed (asserted in
  `documents` › "a complete document is listed…").
- **`/address-book/add/usage` page content** — only renders with an address
  pending from a usage category; in DR2.1 the uses are chosen on the details
  page itself, so the route only ever redirects (to `/address-book/add`). The
  redirect is covered; the page is not.
- **Dashboard pagination and filter results** — the seeded data has at most a
  handful of notifications per tab, so no notification pagination renders. The
  additional filters panel is opened and captured, but the date-range and
  status filters are not exercised for their effect.
- **`POST /intro/sign-in`** — under `/intro`, out of scope for DR2.1.

## Behaviour worth knowing (each asserted by a spec unless marked)

1. **New first question.** DR2.1 asks "What are you importing?" (notification
   type: live animals, germinal products, plants for planting, potatoes, wood
   products) before origin. `/notification-type` only exists for a DR2.1 session.
   Starting from a category dashboard skips it. Plants/potatoes/wood reach a
   commodity search that offers nothing.
2. **References are always `GBN-AG-26-…`**, germinal notifications included
   (the seeded germinal ones are `GBN-GP-…`).
3. **Soft validation almost everywhere.** Optional to proceed: country of
   origin, reason (but a chosen reason's follow-ups are required), certification
   purpose/unweaned, arrival fields other than means of transport, transit
   countries, transporter, documents (unless a document type is picked), every
   address role, CPH (a partial number is silently dropped), permanent address
   (nothing chosen is accepted). Hard stops: type, region code when "Yes",
   commodity, number of animals/packages/weight/temperature, means of transport,
   contact address, declaration. Completeness is enforced only by the hub and
   review ("Complete …" errors).
4. **Origin page has no "Save and return to overview" and no cancel link.**
5. **Germinal products** offer only Internal market and Transit (four purposes),
   have no additional-details page, take donor ID / collection date / production
   date / identification mark once per species (date and 58-character errors),
   and the hub totals packages and kilograms instead of animals.
6. **Identification:** a multi-animal panel with a blank identifier is silently
   not saved on "Save and finish" (no error). Observed in exploration, not
   asserted: a single cattle animal with only an ear tag stays "To do" on the hub
   yet the notification can still be submitted; the submitted page then says to
   complete the identifier information.
7. **Mount leaks:** the transporter list's "View details" links and the virus
   check go to unprefixed `/address-book/…` and `/upload-documents/…` paths.
8. **Copy slips:** the place-of-origin picker's search box is labelled "Enter a
   country / Enter each country that the consignment will travel through"
   (transit copy); the UK-lookup add-address pages list errors that link to
   fields still hidden behind the search.
9. **Cancel on "Add a private transporter"** ("Cancel and return to dashboard")
   leaves the journey for the overall dashboard.
10. **Delete notification** lands on the overall dashboard, which shows no
    banner; the "… has been deleted" banner appears on the category dashboard.
11. **Amending a seeded notification is silently blocked**: its June 2026
    arrival date is outside the 7-days-back to 6-months-ahead window, so
    "Continue" on the amend review just stays put with no error until the
    arrival details are re-entered.
12. **Templates:** "Create new template" asks the type, then the name, then runs
    the journey in template mode (no documents section, no declaration; those
    routes redirect). An unnamed template saves as "Untitled template". Changing
    one section of a saved template offers only "Save and return" and a banner
    "<name> has been updated".
13. **Roles page shortcuts:** "Same as place of origin" (consignor) and "Same as
    consignee" (importer, place of destination) buttons appear once the source
    role is filled.
14. **Address book** is shared across releases (session keys
    `addressBookAddedAddresses`, `submittedNotifications`); success banners use
    sentence case ("Green valley farm address deleted"). Ballymore Farm appears
    twice (origin and consignor).
15. **Overall dashboard** plants card, "View requirements" and "Manage account"
    links are `#` placeholders.
