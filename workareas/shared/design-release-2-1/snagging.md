# Design Release 2.1 snagging list

Design questions the build raised that the designer has not answered yet. Each one is built as the prototype or the
code has it until it is answered. When the designer answers, record it here, make the change on the ticket's branch,
and move the row to "Settled".

The prototype source is `defra-design/GB-notification-service` at commit `04a073b` (5 October 2026), the commit the
programme's `sources.json` pins. Design Release 2.1 has no address book view of its own there, so
`/design-release-2.1/address-book` renders the root `app/views/address-book.html`.

## Open

### S-01. Search button and Filter addresses marker (address book list)

- **Ticket:** [EUDPA-710](https://eaflood.atlassian.net/browse/EUDPA-710), [ins-frontend #65](https://github.com/DEFRA/trade-imports-ins-frontend/pull/65). Review item #24 in `workareas/reviews/EUDPA-710`.
- **Page:** the INS address book list, `/address-book`, only. The INS dashboard has its own search box (a text field and a plain button, no disclosure); ask whether it follows.
- **Prototype:** a custom chevron (∨) image beside 'Filter addresses' ([address-book.html#L58](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/address-book.html#L58)), and a custom-styled icon-only search button beside the field ([#L77-L79](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/address-book.html#L77-L79)).
- **Built:** the GOV.UK Details triangle (▸ ▾) beside 'Filter addresses', and a standard green GOV.UK button holding an inline SVG magnifier with 'Search' for screen readers only, on its own line under the field ([list.njk](https://github.com/DEFRA/trade-imports-ins-frontend/blob/3639400/src/server/app/features/address-book/list/list.njk)).
- **Designer so far (26 October):** "These should be standard components", linking the [GOV.UK publishing search component](https://components.publishing.service.gov.uk/component-guide/search) and the [Design System select](https://design-system.service.gov.uk/components/select/).
- **Still to ask:**
  1. Filter addresses: can we keep the standard GOV.UK triangle (▸ ▾), or do you want a custom chevron (∨) like the prototype's, which needs custom styling? If the chevron, is the select component's arrow the look you mean?
  2. Search button: do you want the publishing search component's look, a magnifier button joined to the box? It is not in GOV.UK Frontend, so it needs a little custom styling. Or is GOV.UK Frontend's text input with a plain 'Search' button fine?

### S-02. The address book list when the address book cannot be loaded

- **Ticket:** [EUDPA-710](https://eaflood.atlassian.net/browse/EUDPA-710), [ins-frontend #65](https://github.com/DEFRA/trade-imports-ins-frontend/pull/65). Review item #25 in `workareas/reviews/EUDPA-710`.
- **Page:** the INS address book list, `/address-book`.
- **Prototype:** no such state; the results line and table always render ([address-book.html#L164](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/address-book.html#L164)).
- **Built:** an error banner ('Sorry, there is a problem with the service. Try again in a few minutes.'), the heading, intro, 'Add a new address' button and the filter, with no results line, table or pagination ([list.njk](https://github.com/DEFRA/trade-imports-ins-frontend/blob/3639400/src/server/app/features/address-book/list/list.njk), [list.controller.js](https://github.com/DEFRA/trade-imports-ins-frontend/blob/3639400/src/server/app/features/address-book/list/list.controller.js)). A trader can still search a book that just failed to load.
- **To ask:** what does the page show when the list cannot be loaded? (1) keep as built; (2) also hide the 'Add a new address' button and the filter; (3) show the table with a message in place of the rows.

### S-03. One layout or two for the list's name and address cells

- **Ticket:** [EUDPA-710](https://eaflood.atlassian.net/browse/EUDPA-710), [ins-frontend #65](https://github.com/DEFRA/trade-imports-ins-frontend/pull/65). inc-202 review, finding 16; the open question on inc-202 in the theme backlog.
- **Page:** the INS address book list, `/address-book`.
- **Prototype:** two layouts, depending on how the row was made. Seeded rows split the name over lines ([address-book.html#L195-L202](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/address-book.html#L195-L202)) and put each address part on its own line ending in a comma ([#L222-L229](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/address-book.html#L222-L229)). A just-saved address (`routes.js` `buildAddressBookEntryFromManual`) shows its name and address each on one line.
- **Built:** every row one part per line with the name split, as the prototype's seeded rows ([list.controller.js](https://github.com/DEFRA/trade-imports-ins-frontend/blob/feat/EUDPA-710-design-release-2-1-address-book-list/src/server/app/features/address-book/list/list.controller.js), `address-lines.js`, `view-model/list.js`).
- **To ask:** (a) every row one part per line with the name split, as built; or (b) every row on one line, as the prototype shows a just-saved address?

### S-04. The country list on the add page reached from the consignment contact page

- **Ticket:** [EUDPA-706](https://eaflood.atlassian.net/browse/EUDPA-706), [ins-frontend #70](https://github.com/DEFRA/trade-imports-ins-frontend/pull/70). inc-078 follow-up; EUDPA-706 review, workspace finding 21.
- **Page:** the INS add page reached from a notification's 'Contact address for this consignment' page.
- **Prototype:** the contact does not use the journey's add page. Its add link goes to the address book's own add page with `from=contact-address` ([routes.js#L2388](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/routes.js#L2388), [#L11746-L11753](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/routes.js#L11746-L11753)), which renders the older `address-book-lookup` page. Design Release 2.1's own add details page is used only when an address category is chosen, and the contact's return sets none ([#L1336-L1343](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/routes.js#L1336-L1343), [#L11831-L11848](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/routes.js#L11831-L11848)). Its Country select lists every country, United Kingdom included, with no blank option, so the first country is selected until the trader changes it ([#L10365](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/routes.js#L10365), [#L10412-L10423](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/routes.js#L10412-L10423)). The United Kingdom-only list is for the five consignment roles on the journey's add page, not for the contact.
- **Built:** consignee, importer and place of destination get United Kingdom alone, selected. Place of origin, consignor and the consignment contact get 'Select a country' and the full list (`journey-registry.js`). The blank option follows the designer's 23 October answer for the address book's add and edit pages (see Settled).
- **To confirm:** the contact can pick any country, as the prototype's page allows. Is that intended, or should the consignment contact be United Kingdom only, like the destination side? Low priority: built as the prototype behaves.

### S-05. The cancel button on the consignment contact's add page

- **Ticket:** [EUDPA-706](https://eaflood.atlassian.net/browse/EUDPA-706), [ins-frontend #70](https://github.com/DEFRA/trade-imports-ins-frontend/pull/70). inc-080 review, finding 40; EUDPA-706 review, workspace findings 20, 21 and 25.
- **Page:** the INS add page reached from a notification's 'Contact address for this consignment' page.
- **Prototype:** the address book's own `address-book-lookup` page (see S-04). 'Back' and both buttons return to the contact page ([routes.js#L9805-L9840](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/routes.js#L9805-L9840), [#L9936-L9940](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/routes.js#L9936-L9940)). A primary 'Save and continue' button and a secondary button labelled 'Cancel and return to dashboard', because the label is chosen only by whether cancel goes to the address book ([#L10345-L10347](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/routes.js#L10345-L10347), [address-book-lookup.html#L141-L153](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/address-book-lookup.html#L141-L153)). The label names the dashboard, but the button goes to the contact page.
- **Built:** 'Back', a primary 'Save and continue' button and a secondary 'Cancel and return to address page' button, all returning to the contact page, and no cancel link ([add.njk#L40-L49](https://github.com/DEFRA/trade-imports-ins-frontend/blob/2f0a825/src/server/app/features/address-book/add/add.njk#L40-L49), [copy.en.js#L52-L56](https://github.com/DEFRA/trade-imports-ins-frontend/blob/2f0a825/src/server/app/features/address-book/copy/copy.en.js#L52-L56), [add.controller.js#L42-L54](https://github.com/DEFRA/trade-imports-ins-frontend/blob/2f0a825/src/server/app/features/address-book/add/add.controller.js#L42-L54)). The five roles get Design Release 2.1's set instead: 'Save and select' and 'Save and return to address page' buttons, and a 'Cancel and return to hub' link.
- **To ask:** only the cancel label differs from the prototype. (a) keep 'Cancel and return to address page', as built, since that is where it goes; (b) 'Cancel and return to dashboard', as the prototype's label; or (c) give the contact the roles' set?

### S-06. 'Hub' or 'overview' for the notification's overview page

- **Ticket:** [EUDPA-706](https://eaflood.atlassian.net/browse/EUDPA-706), [ins-frontend #70](https://github.com/DEFRA/trade-imports-ins-frontend/pull/70), [animals-frontend #448](https://github.com/DEFRA/trade-imports-animals-frontend/pull/448). EUDPA-706 review, workspace item 28, ins-frontend finding 45, animals-frontend finding 38.
- **Page:** every journey page that offers a way back to the notification's overview: the INS add page reached from a role picker, and the animals journey's pages.
- **Prototype:** Design Release 2.1 says 'hub' on its own pages ('Cancel and return to hub' on the add page and pickers, 'Save and return to hub' on the contact page: [consignment-add-address.html#L140](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/design-release-2.1/consignment-add-address.html#L140), [consignment-address-select.html#L248-L256](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/design-release-2.1/consignment-address-select.html#L248-L256), [contact-address-for-consignment.html#L97-L98](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/design-release-2.1/contact-address-for-consignment.html#L97-L98)). The page they land on is headed 'Overview' ([notification-hub.html#L24](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/design-release-2.1/notification-hub.html#L24)), and the prototype's older pages say 'overview' ([additional-animal-details.html#L96-L104](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/additional-animal-details.html#L96-L104)).
- **Built:** INS says 'Cancel and return to hub' ([copy.en.js#L57](https://github.com/DEFRA/trade-imports-ins-frontend/blob/2f0a825/src/server/app/features/address-book/copy/copy.en.js#L57)). Animals says 'Save and return to overview' and 'Cancel and return to overview' (`src/server/app/shared/copy.en.js:67-68`). A trader going from the animals journey to the INS add page meets both words for the same page.
- **To ask:** (a) 'overview' everywhere, matching the page heading; (b) 'hub' everywhere, as Design Release 2.1's new pages say; or (c) keep both as built?

### S-07. The blank country option and the name error on the journey's add page

- **Ticket:** [EUDPA-706](https://eaflood.atlassian.net/browse/EUDPA-706), [ins-frontend #70](https://github.com/DEFRA/trade-imports-ins-frontend/pull/70). EUDPA-706 review, workspace finding 10; inc-078's criteria.
- **Page:** the INS add page reached from the place of origin or consignor picker (the roles that get the full country list; see S-04).
- **Prototype:** Design Release 2.1's journey add page opens the Country select on 'Select one' ([routes.js#L4097-L4101](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/routes.js#L4097-L4101)), and a blank name gives 'Enter a name or organisation name' ([#L10495](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/routes.js#L10495)). inc-078's criteria quote both.
- **Built:** 'Select a country' and 'Enter a name or organisation' ([copy.en.js#L1](https://github.com/DEFRA/trade-imports-ins-frontend/blob/2f0a825/src/server/app/features/address-book/copy/copy.en.js#L1), [#L79](https://github.com/DEFRA/trade-imports-ins-frontend/blob/2f0a825/src/server/app/features/address-book/copy/copy.en.js#L79)), the wording the designer chose on 23 October for the address book's add and edit pages. That answer did not mention the journey's add page, which is the same page in INS.
- **To ask:** (a) the 23 October wording on the journey's add page too, as built (then inc-078's criteria are updated); (b) the Design Release 2.1 wording on the journey's add page only; or (c) the Design Release 2.1 wording on both?

### S-08. The status tag on the journey's add page while a notification is being amended

- **Ticket:** [EUDPA-706](https://eaflood.atlassian.net/browse/EUDPA-706), [ins-frontend #70](https://github.com/DEFRA/trade-imports-ins-frontend/pull/70). EUDPA-706 review, ins-frontend finding 29; inc-077's criteria.
- **Page:** the INS add page reached from a notification's party picker.
- **Prototype:** shows only the draft case. inc-077 (from the Design Release 2.1 trace) says the add page shows 'a Draft tag and the notification's reference, as the journey's own pages do'.
- **Built:** the add page always shows a blue 'Draft' tag beside the reference ([kit.js#L45-L51](https://github.com/DEFRA/trade-imports-ins-frontend/blob/2f0a825/src/server/app/shared/kit.js#L45-L51)), because the handshake carries no status. The animals journey's own pages show the tag for the notification's status: Draft in blue, Submitted in green, Amend in yellow, Deleted in grey ([animals kit.js#L35-L52](https://github.com/DEFRA/trade-imports-animals-frontend/blob/e3eef6bf/src/server/app/shared/kit.js#L35-L52)). The picker offers the add link whatever the status, amending included ([party-picker.controller.js#L87-L88](https://github.com/DEFRA/trade-imports-animals-frontend/blob/e3eef6bf/src/server/app/sets/live-animals/journeys/linear/features/addresses/party-picker/party-picker.controller.js#L87-L88)). So a trader amending a submitted notification sees a yellow 'Amend' tag on the picker, then a blue 'Draft' tag on the add page.
- **To ask:** on the add page reached while amending, (a) keep the 'Draft' tag, as built and as the prototype shows; (b) show the journey's own tag ('Amend', yellow), which means the handshake carries the status; or (c) show the reference with no status tag?

## Settled

| Question | Answer | Where it landed |
|---|---|---|
| EUDPA-710: where the search guidance 'Search by name, address or country' goes | A hint under the 'Search' label, not a placeholder (26 October) | ins-frontend `3639400` |
| EUDPA-710: how a trader sees an active search and gets back to the full list | Reinstate 'Clear search'; removing it was an error (26 October) | ins-frontend `3639400`, ins-tests `abf5b9f` |
| EUDPA-709: the name field's label | 'Name or organisation' throughout, errors included (23 October) | EUDPA-709, merged |
| EUDPA-709: the blank country option | 'Select a country' on add and edit (23 October) | EUDPA-709, merged |
| EUDPA-708: the delete warning | 'Deletions are permanent and you cannot undo this.', as regular text (23 October) | EUDPA-709, merged |
