# Design Release 2.1 coverage

Prototype: `~/git/defra/defra-design/GB-notification-service` at `c2078fb`
(26 November 2026). Suite: 156 tests, all passing, run on 27 November
2026. The route table below is generated from
`../sources/traces-prototype/index.json` and `../evidence/prototype/index.json`
by `npm run coverage`; "Visited by" counts every test whose trace requested the
route (redirect hops included).

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
| `/design-release-2.1/live-animals` | dashboard | 6 test(s), e.g. `about-the-consignment` › notification type › starting from a category dashboard skips the type question | live-animals--completed, live-animals--deleted, live-animals--drafts, live-animals--filters-open, live-animals--in-progress, live-animals--needs-action, live-animals--search, live-animals--status-amend |
| `/design-release-2.1/germinal-products` | dashboard | 2 test(s), e.g. `about-the-consignment` › germinal products: section 1 › create new on the germinal products dashboard goes straight to origin, labelled as germinal products | germinal-products--completed, germinal-products--drafts, germinal-products--in-progress |
| `/design-release-2.1/actions` | dashboard-actions | 1 test(s), e.g. `dashboard` › at a glance drill-downs › action needed lists notifications needing action | actions--live-animals, actions |
| `/design-release-2.1/changes` | dashboard-changes | 1 test(s), e.g. `dashboard` › at a glance drill-downs › status updated lists changes in the past 24 hours | changes--germinal-products, changes |
| `/design-release-2.1/inspection` | dashboard-inspection | 1 test(s), e.g. `dashboard` › at a glance drill-downs › inspection required lists consignments due at the BCP | inspection--guidance-open, inspection |
| `/design-release-2.1/create-notification` | redirect | 119 test(s), e.g. `about-the-consignment` › germinal products: section 1 › create new on the germinal products dashboard goes straight to origin, labelled as germinal products | — |
| `/design-release-2.1/notification-type` | notification-type | 113 test(s), e.g. `about-the-consignment` › main import reason › a reason is optional to proceed | notification-type--error, notification-type |
| `/design-release-2.1/origin-of-the-import` | origin-of-the-import | 124 test(s), e.g. `about-the-consignment` › germinal products: section 1 › create new on the germinal products dashboard goes straight to origin, labelled as germinal products | origin-of-the-import--amend, origin-of-the-import--country-search-open, origin-of-the-import--error-region-code, origin-of-the-import--germinal, origin-of-the-import--region-code-prefix, origin-of-the-import--region-code-reveal, origin-of-the-import--template-section-edit, origin-of-the-import |
| `/design-release-2.1/what-are-you-importing` | what-are-you-importing | 106 test(s), e.g. `about-the-consignment` › germinal products: section 1 › germinal commodity search: semen, ova and embryos with common and Latin names | what-are-you-importing--error, what-are-you-importing--germinal-error, what-are-you-importing--germinal-one-selected, what-are-you-importing--germinal-search-embryos, what-are-you-importing--germinal-search-results, what-are-you-importing--germinal, what-are-you-importing--help-open, what-are-you-importing--one-selected, what-are-you-importing--plants-no-results, what-are-you-importing--search-results, what-are-you-importing--two-selected, what-are-you-importing |
| `/design-release-2.1/prototype/reason-for-import` | redirect | 1 test(s), e.g. `about-the-consignment` › main import reason › the prototype seed route jumps straight to the reason page | — |
| `/design-release-2.1/reason-for-import` | reason-for-import | 94 test(s), e.g. `about-the-consignment` › germinal products: section 1 › germinal commodity search: semen, ova and embryos with common and Latin names | reason-for-import--error-internal-market, reason-for-import--error-temporary-admission-real-date, reason-for-import--error-temporary-admission, reason-for-import--error-transhipment, reason-for-import--error-transit, reason-for-import--germinal-error-internal-market, reason-for-import--germinal-error-transit, reason-for-import--germinal-internal-market-reveal, reason-for-import--germinal, reason-for-import--internal-market-reveal, reason-for-import--temporary-admission-reveal, reason-for-import--transhipment-reveal, reason-for-import--transit-reveal, reason-for-import |
| `/design-release-2.1/consignment-details` | consignment-details | 75 test(s), e.g. `about-the-consignment` › germinal products: section 1 › germinal reasons: internal market and transit only, with consignment wording | consignment-details--error-required, consignment-details--error-whole-number, consignment-details--germinal-error-invalid, consignment-details--germinal-error-required, consignment-details--germinal, consignment-details--two-commodities, consignment-details |
| `/design-release-2.1/consignment-gross-weight` | consignment-gross-weight | 5 test(s), e.g. `description-of-the-goods` › commodity details › germinal products: quantity in units or pieces, optional number of packages and storage temperature | consignment-gross-weight--error-invalid, consignment-gross-weight--error-required, consignment-gross-weight |
| `/design-release-2.1/animal-identification-details` | animal-identification-details | 66 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination start with a UK postcode | animal-identification-details--all-animals-saved, animal-identification-details--animal-1-of-2, animal-identification-details--animal-2-of-2, animal-identification-details--cat, animal-identification-details--error-no-identifier, animal-identification-details--germinal-error, animal-identification-details--germinal, animal-identification-details--horse, animal-identification-details--pig, animal-identification-details--poultry |
| `/design-release-2.1/additional-animal-details` | additional-animal-details | 8 test(s), e.g. `description-of-the-goods` › additional details › cattle: certification purpose and unweaned animals | additional-animal-details--cattle, additional-animal-details--poultry |
| `/design-release-2.1/arrival-details` | arrival-details | 33 test(s), e.g. `description-of-the-goods` › additional details › cattle: certification purpose and unweaned animals | arrival-details--amend, arrival-details--error, arrival-details--port-search-open, arrival-details |
| `/design-release-2.1/transit-countries` | transit-countries | 10 test(s), e.g. `eudpa-691` › A2 opened from the hub: Arrival details returns to the hub on Save and continue | transit-countries--two-countries, transit-countries |
| `/design-release-2.1/transport-details` | redirect | 1 test(s), e.g. `transport-and-arrival` › transporter details › the legacy transport-details path redirects to the transporter page | — |
| `/design-release-2.1/transporter` | transporter | 21 test(s), e.g. `eudpa-691` › B1 opening run: Transit countries with none added continues to the transporter, and the hub reads To do | transporter--germinal, transporter--selected, transporter--transporter-added, transporter |
| `/design-release-2.1/transporter/add` | transporter-add | 6 test(s), e.g. `address-book` › add an address to the address book › transporter: hands over to the add-a-transporter pages | transporter-add--error, transporter-add |
| `/design-release-2.1/transporter/add/private` | transporter-add-private | 3 test(s), e.g. `transport-and-arrival` › add a transporter › private transporter: cancel leaves the journey for the dashboard | transporter-add-private--details, transporter-add-private--error, transporter-add-private--manual-error, transporter-add-private--manual, transporter-add-private--postcode-error, transporter-add-private--postcode, transporter-add-private--results-error, transporter-add-private--results |
| `/design-release-2.1/transporter/add/commercial` | transporter-add-commercial | 1 test(s), e.g. `transport-and-arrival` › add a transporter › commercial transporter: authorisation number first, then a Northern Ireland postcode or manual entry | transporter-add-commercial--authorisation-error, transporter-add-commercial--error, transporter-add-commercial--manual-address, transporter-add-commercial--postcode, transporter-add-commercial--results, transporter-add-commercial |
| `/design-release-2.1/upload-documents` | upload-documents | 20 test(s), e.g. `documents` › upload documents › a complete document is listed with its virus check status, and removed after a confirmation page | upload-documents--error-real-date, upload-documents--error, upload-documents--file-chosen, upload-documents--one-document, upload-documents |
| `/design-release-2.1/upload-documents/:documentId/delete` | delete-document | 1 test(s), e.g. `documents` › upload documents › a complete document is listed with its virus check status, and removed after a confirmation page | upload-documents-doc-1795778281428-1-delete |
| `/design-release-2.1/roles-and-addresses` | roles-and-addresses | 25 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination start with a UK postcode | roles-and-addresses--cat-air-complete, roles-and-addresses--cat-empty, roles-and-addresses--cat-permanent-added, roles-and-addresses--cattle-air-complete, roles-and-addresses--cattle-empty, roles-and-addresses--complete, roles-and-addresses--germinal-semen-complete, roles-and-addresses--horse-sea-complete, roles-and-addresses--poultry-rail-complete, roles-and-addresses--remove-buttons, roles-and-addresses--same-as-applied, roles-and-addresses--same-as-shortcuts |
| `/design-release-2.1/place-of-origin` | consignment-address-select | 13 test(s), e.g. `consignment-parties` › add an address from the journey › place of origin: an international address entered by hand | place-of-origin--address-added, place-of-origin |
| `/design-release-2.1/consignor-or-exporter` | consignment-address-select | 12 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination start with a UK postcode | consignor-or-exporter--search, consignor-or-exporter |
| `/design-release-2.1/consignee` | consignment-address-select | 13 test(s), e.g. `consignment-parties` › add an address from the journey › consignee: a UK address found by postcode, then completed | consignee |
| `/design-release-2.1/importer` | consignment-address-select | 11 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination start with a UK postcode | importer |
| `/design-release-2.1/place-of-destination` | consignment-address-select | 11 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination start with a UK postcode | place-of-destination |
| `/design-release-2.1/place-of-origin/add-address` | consignment-add-address | 1 test(s), e.g. `consignment-parties` › add an address from the journey › place of origin: an international address entered by hand | place-of-origin-add-address--error, place-of-origin-add-address |
| `/design-release-2.1/consignor-or-exporter/add-address` | consignment-add-address | 1 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination start with a UK postcode | consignor-or-exporter-add-address |
| `/design-release-2.1/consignee/add-address` | consignment-add-address | 1 test(s), e.g. `consignment-parties` › add an address from the journey › consignee: a UK address found by postcode, then completed | consignee-add-address--found-address-error, consignee-add-address--found-address |
| `/design-release-2.1/importer/add-address` | consignment-add-address | 1 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination start with a UK postcode | importer-add-address--manual |
| `/design-release-2.1/place-of-destination/add-address` | consignment-add-address | 1 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination start with a UK postcode | place-of-destination-add-address--manual |
| `/design-release-2.1/consignee/find-address` | (shared find-address) | 1 test(s), e.g. `consignment-parties` › add an address from the journey › consignee: a UK address found by postcode, then completed | consignee-find-address--find-error-empty, consignee-find-address--find-error-partial, consignee-find-address--find |
| `/design-release-2.1/importer/find-address` | (shared find-address) | 1 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination start with a UK postcode | importer-find-address |
| `/design-release-2.1/place-of-destination/find-address` | (shared find-address) | 1 test(s), e.g. `consignment-parties` › add-address pages for the other roles › consignor is entered by hand; importer and place of destination start with a UK postcode | place-of-destination-find-address |
| `/design-release-2.1/consignee/find-address/select` | (shared find-address-select) | 1 test(s), e.g. `consignment-parties` › add an address from the journey › consignee: a UK address found by postcode, then completed | consignee-find-address-select--none-found, consignee-find-address-select--select-error, consignee-find-address-select--select |
| `/design-release-2.1/importer/find-address/select` | (shared find-address-select) | **not visited** | — |
| `/design-release-2.1/place-of-destination/find-address/select` | (shared find-address-select) | **not visited** | — |
| `/design-release-2.1/cph-number` | cph-number | 7 test(s), e.g. `consignment-parties` › consignment addresses › cat: permanent address replaces the CPH number | cph-number |
| `/design-release-2.1/permanent-address` | redirect | 2 test(s), e.g. `consignment-parties` › permanent address › cat: one choice per animal, same as destination or a new address | — |
| `/design-release-2.1/permanent-address/select` | permanent-address-animals | 3 test(s), e.g. `consignment-parties` › permanent address › cat: one choice per animal, same as destination or a new address | permanent-address-select--error-new-address, permanent-address-select--error-no-place-of-destination, permanent-address-select--new-address-reveal, permanent-address-select--select |
| `/design-release-2.1/permanent-address/enter-address` | redirect | 1 test(s), e.g. `consignment-parties` › permanent address › the enter-address path is retired and lands on the per-animal page | — |
| `/design-release-2.1/contact-address-for-consignment` | redirect | 1 test(s), e.g. `consignment-parties` › contact address for consignment › the contact address page sends the user to the review | — |
| `/design-release-2.1/notification-hub` | notification-hub | 19 test(s), e.g. `about-the-consignment` › what are you importing › save and return to overview keeps the selection without validating | notification-hub--cat-air-complete, notification-hub--cattle-air-complete, notification-hub--copied, notification-hub--empty, notification-hub--from-template, notification-hub--germinal-semen-complete, notification-hub--horse-sea-complete, notification-hub--new-template, notification-hub--poultry-rail-complete, notification-hub--template |
| `/design-release-2.1/review-notification` | review-notification | 20 test(s), e.g. `consignment-parties` › consignment addresses › picking an address for every role, then the CPH number | review-notification--action-required, review-notification--actions-menu, review-notification--amend-resumed, review-notification--amend, review-notification--cancel-amend-modal, review-notification--cat-air-complete, review-notification--cattle-air-complete, review-notification--completed, review-notification--draft, review-notification--germinal-semen-complete, review-notification--horse-sea-complete, review-notification--incomplete, review-notification--just-submitted, review-notification--poultry-rail-complete, review-notification--submitted, review-notification--template |
| `/design-release-2.1/declaration` | declaration | 9 test(s), e.g. `journeys` › notification journeys end to end › cattle by air: identification, unweaned question, CPH number | declaration--error, declaration |
| `/design-release-2.1/notification-submitted` | notification-submitted | 8 test(s), e.g. `journeys` › notification journeys end to end › cattle by air: identification, unweaned question, CPH number | notification-submitted--amended, notification-submitted--cat-air, notification-submitted--cattle-air, notification-submitted--germinal-semen, notification-submitted--horse-sea, notification-submitted--poultry-rail |
| `/design-release-2.1/notifications/delete` | delete-notification | 1 test(s), e.g. `manage-notifications` › delete a notification › confirm the deletion; the dashboard shows a success banner | notifications-delete |
| `/design-release-2.1/notifications/amend` | amend-notification | 5 test(s), e.g. `dashboard` › category dashboards › germinal products: quantity in units or pieces, and amend examples that open in amend | notifications-amend--amend-confirm |
| `/design-release-2.1/notifications/cancel-amend` | redirect | 2 test(s), e.g. `manage-notifications` › amend a submitted notification › cancel an amendment from the amend review | — |
| `/design-release-2.1/notifications/copy-as-new` | redirect | 2 test(s), e.g. `manage-notifications` › amend and copy guards › cancel-amend with no amendment in progress, and unknown references, return to the dashboard | — |
| `/design-release-2.1/notifications/make-template` | redirect | **not visited** | — |
| `/design-release-2.1/notifications/make-template/cancel` | redirect | **not visited** | — |
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
| `/design-release-2.1/address-book/add` | (shared address-book-add) | 6 test(s), e.g. `address-book` › add an address to the address book › branch: a UK address found by postcode, with the branch address use | address-book-add--error, address-book-add |
| `/design-release-2.1/address-book/add/lookup` | (shared address-book-lookup / consignment-add-address) | 3 test(s), e.g. `address-book` › add an address to the address book › branch: a UK address found by postcode, with the branch address use | address-book-add-lookup--branch, address-book-add-lookup--destination-picked, address-book-add-lookup--origin-and-consignor-error, address-book-add-lookup--origin-and-consignor |
| `/design-release-2.1/address-book/add/find-address` | (shared find-address) | 2 test(s), e.g. `address-book` › add an address to the address book › branch: a UK address found by postcode, with the branch address use | address-book-add-find-address--destination-consignee-importer-error, address-book-add-find-address--destination-consignee-importer |
| `/design-release-2.1/address-book/add/find-address/select` | (shared find-address-select) | 1 test(s), e.g. `address-book` › add an address to the address book › destination, consignee or importer: a UK address found by postcode | address-book-add-find-address-select--destination-select |
| `/design-release-2.1/address-book/add/usage` | (shared address-book-add-usage) | 1 test(s), e.g. `address-book` › add an address to the address book › the usage step is only reachable with an address pending | — |
| `/design-release-2.1/address-book/:addressId` | (shared address-book-view) | 1 test(s), e.g. `address-book` › an address book entry › view, edit and save | address-book-green-valley-farm-sanpetru-0 |
| `/design-release-2.1/address-book/:addressId/edit` | (shared address-book edit) | 1 test(s), e.g. `address-book` › an address book entry › view, edit and save | address-book-green-valley-farm-sanpetru-0-edit--error, address-book-green-valley-farm-sanpetru-0-edit |
| `/design-release-2.1/address-book/:addressId/delete` | delete-address | 1 test(s), e.g. `address-book` › an address book entry › delete: confirm, then the list says it was deleted | address-book-green-valley-farm-sanpetru-0-delete |
<!-- routes:end -->

## DR2.1 override views (39 files in `app/views/design-release-2.1/`)

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
| consignment-gross-weight | `/consignment-gross-weight` (germinal only) | yes |
| animal-identification-details | `/animal-identification-details` | yes |
| additional-animal-details | `/additional-animal-details` | yes |
| arrival-details | `/arrival-details` | yes |
| transit-countries | `/transit-countries` | yes |
| transporter | `/transporter` | yes |
| transporter-add | `/transporter/add` | yes |
| transporter-add-private | `/transporter/add/private` (postcode, results and details steps) | yes |
| transporter-add-commercial | `/transporter/add/commercial` (authorisation, postcode, results and details steps) | yes |
| upload-documents | `/upload-documents` | yes |
| delete-document | `/upload-documents/:documentId/delete` | yes |
| roles-and-addresses | `/roles-and-addresses` | yes |
| consignment-address-select | `/place-of-origin`, `/consignor-or-exporter`, `/consignee`, `/importer`, `/place-of-destination` | yes |
| consignment-add-address | `/<role>/add-address`, the details step after `/<role>/find-address`, `/address-book/add/lookup` | yes |
| cph-number | `/cph-number` | yes |
| permanent-address-animals | `/permanent-address/select` | yes |
| permanent-address | nothing (see below) | **no — unreachable** |
| contact-address-for-consignment | nothing (see below) | **no — unreachable** |
| notification-hub | `/notification-hub` | yes |
| review-notification | `/review-notification` (journey, dashboard view, amend, template) | yes |
| amend-notification | `/notifications/amend` | yes |
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
- **`contact-address-for-consignment.html` override** — `GET` and `POST
  /contact-address-for-consignment` redirect a DR2.1 session to
  `/review-notification`, and the hub and review no longer list a contact
  address. Dead view in DR2.1.
- **`POST /upload-documents/virus-check/:documentId`** — a JSON endpoint, not a
  page. The client script posts to the *unprefixed* path, so under DR2.1 it hits
  the root session and never marks the DR2.1 document as passed (asserted in
  `documents` › "a complete document is listed…").
- **`/address-book/add/usage` page content** — only renders with an address
  pending from a usage category; in DR2.1 the uses are chosen on the details
  page itself, so the route only ever redirects (to `/address-book/add`). The
  redirect is covered; the page is not.
- **Dashboard pagination and the date-range filter** — the seeded data has at
  most a handful of notifications per tab, so no notification pagination
  renders. The status filter and "Needs action" are exercised; the date range
  is not.
- **"Needs action" through the filter form** — the checkbox posts
  `needsAction=1&needsAction=_unchecked`, which the prototype does not read as
  checked, so the filter only applies from the URL (`?needsAction=1`). The spec
  opens the URL directly.
- **Templates** — kept running at their existing coverage; no new template
  behaviour is asserted. So "Make template" from a notification's Actions menu
  (`/notifications/make-template` and its `/cancel`) is listed in the menu but
  not followed.
- **`/importer/find-address/select` and `/place-of-destination/find-address/select`**
  — the same lookup the consignee runs end to end; the importer and destination
  lookups are opened but not taken through to the address list.
- **`POST /intro/sign-in`** — under `/intro`, out of scope for DR2.1.

## Behaviour worth knowing (each asserted by a spec unless marked)

1. **First question.** DR2.1 asks "What are you importing?" (notification
   type: live animals, germinal products, plants for planting, potatoes, wood
   products) before origin. `/notification-type` only exists for a DR2.1 session.
   "Create new" from a category dashboard skips it, and the status strip then
   reads "Draft / <type> - GBN-AG-26-…".
2. **References are always `GBN-AG-26-…`**, germinal notifications included
   (the seeded germinal ones are `GBN-GP-…`).
3. **Soft validation almost everywhere.** Optional to proceed: country of
   origin, reason (but a chosen reason's follow-ups are required), certification
   purpose/unweaned, arrival fields other than means of transport, transit
   countries, transporter, documents (unless a document type is picked), every
   address role, CPH (a partial number is silently dropped), permanent address
   (nothing chosen is accepted), number of germinal packages. Hard stops: type,
   region code when "Yes", commodity, quantity, temperature, total gross
   weight, at least one identifier per animal, means of transport, declaration.
   Completeness is enforced only by the hub and review ("Complete …" errors).
4. **Origin page has no "Save and return to overview" and no cancel link.**
5. **Germinal products** offer only Internal market and Transit (four purposes),
   ask quantity, an optional number of packages and temperature per commodity,
   then a separate "Total gross weight" page (kg, greater than 0), and have no
   additional-details page. The hub totals units/pieces and packages/boxes; the
   dashboard cards say "Quantity (unit/pieces)". The transporter page drops the
   live-animal authorisation guidance.
6. **Identification** names the species by its full label ("Domestic cattle
   (Bos taurus)") and asks a species-specific set of identifiers (cattle:
   passport, ear tag, identification number; horses: passport,
   microchip/transponder, equine name; cats: passport, microchip/transponder,
   tattoo; pigs: ear tag, identification number), at least one of them.
   Poultry is identified by flock. For poultry, additional details come after
   identification.
7. **Addresses:** consignee, importer and place of destination add a new
   address through a UK postcode lookup (find, select, then a prefilled details
   form); place of origin and consignor use a manual form. Each chosen address
   has a Remove button. There is no contact address step: the roles page
   continues to the review.
8. **Transporter:** once chosen, the transporter is shown on its own with
   Change and Remove. Adding a private transporter asks a name and a UK
   postcode, then an address from the list, then contact details (or "Enter
   address manually"). A commercial transporter asks the authorisation number
   first, then a postcode (example BT1 5GS) or manual entry fixed to Northern
   Ireland.
9. **Documents:** Remove opens a "Delete this document?" page.
10. **Manage a notification:** the review's Actions menu offers Amend, Make
    template, Copy as new and Delete for a submitted notification. Amend asks
    for confirmation first.
11. **Amending a seeded notification is silently blocked**: its arrival date
    and its port ("London Heathrow", where the arrival page saves "London
    Heathrow - LHR") are not in the formats the arrival page saves, so
    "Continue" on the amend review stays put with no error until both are
    re-entered.
12. **Mount leaks:** the transporter list's "View details" links and the virus
    check go to unprefixed `/address-book/…` and `/upload-documents/…` paths.
13. **The germinal amend example** (`GBN-GP-26-7K8M3H`) opens in amend with live
    cattle answers (Bison bison). Observed, not asserted.
14. **Cancel on "Add a private transporter"** ("Cancel and return to dashboard")
    leaves the journey for the overall dashboard.
15. **Delete notification** lands on the overall dashboard, which shows no
    banner; the "… has been deleted" banner appears on the category dashboard.
16. **Roles page shortcuts:** "Same as place of origin" (consignor) and "Same as
    consignee" (importer, place of destination) buttons appear once the source
    role is filled.
17. **Address book** is shared across releases (session keys
    `addressBookAddedAddresses`, `submittedNotifications`); success banners use
    sentence case ("Green valley farm address deleted").
18. **Templates:** "Create new template" asks the type, then the name, then runs
    the journey in template mode (no documents section, no declaration; those
    routes redirect). An unnamed template saves as "Untitled template". Changing
    one section of a saved template offers only "Save and return" and a banner
    "<name> has been updated". Fifteen templates are seeded, live and germinal.
19. **Overall dashboard** plants card, "View requirements" and "Manage account"
    links are `#` placeholders.
