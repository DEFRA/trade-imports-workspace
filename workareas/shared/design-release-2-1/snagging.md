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
- **To confirm:** the contact can pick any country, as the prototype's page allows. Is that intended, or should the consignment contact be United Kingdom only, like the destination side? Low priority: built as the prototype behaves. A Branch address added from the address book now takes the United Kingdom alone, while the consignment contact, saved as a Branch address, offers every country: should they match?

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

### S-09. 'Address type' as the uses question's legend for Destination and Branch

- **Ticket:** [EUDPA-711](https://eaflood.atlassian.net/browse/EUDPA-711), [ins-frontend #71](https://github.com/DEFRA/trade-imports-ins-frontend/pull/71). inc-071.
- **Page:** the INS add form after choosing 'Destination, Consignee or Importer' or 'Branch'.
- **Prototype:** [consignment-add-address.html#L65](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/design-release-2.1/consignment-add-address.html#L65): `{% if showAddressLookup %}Address type{% else %}What can this address be used for?{% endif %}`.
- **Built:** as the prototype: 'Address type' for those two types, 'What can this address be used for?' for 'Origin or Consignor' (`copy.en.js` `uses.legendByAddressType`).
- **To ask:** keep 'Address type' for those two types, or use 'What can this address be used for?' for every type, since the options are uses and the type was chosen on the page before?

### S-10. The section break before the uses question for Destination and Branch entered by hand

- **Ticket:** [EUDPA-711](https://eaflood.atlassian.net/browse/EUDPA-711), [ins-frontend #71](https://github.com/DEFRA/trade-imports-ins-frontend/pull/71). inc-071.
- **Page:** as S-09.
- **Prototype:** Destination and Branch use the search layout. [consignment-add-address.html#L51-L59](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/design-release-2.1/consignment-add-address.html#L51-L59) includes the search fields for them (`{% if showAddressLookup %}`), and only the other branch (`{% else %}`) has `<hr class="app-consignment-add-address-page__section-break">` before the uses question. The source does show these two types entered by hand: the search fields' 'Enter address manually' button ([consignment-uk-add-address-fields.html#L81](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/partials/design-release-2.1/consignment-uk-add-address-fields.html#L81)) reveals `#consignment-manual-address`, which holds the address and contact fields ([#L96-L99](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/partials/design-release-2.1/consignment-uk-add-address-fields.html#L96-L99)), and `data-reveal-with-address` ([#L9](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/partials/design-release-2.1/consignment-uk-add-address-fields.html#L9)) reveals the uses question straight after them, with no section break. What the source does not show is the form with no search box above the manual fields.
- **Built:** with the search deferred, these two types show the address and contact fields with no search box, and the code keeps the visible section break every address-book add has (`add.njk:29`, `<hr class="govuk-section-break govuk-section-break--l govuk-section-break--visible">`), as 'Origin or Consignor' has in the prototype. This is a choice the code made for a case the source does not show.
- **To ask:** should Destination and Branch entered by hand keep the section break before the uses question, as built and as 'Origin or Consignor' has it, or drop it, as the source's manual entry under the search shows?

### S-11. One label per address use, or three

- **Ticket:** [EUDPA-711](https://eaflood.atlassian.net/browse/EUDPA-711), [ins-frontend #71](https://github.com/DEFRA/trade-imports-ins-frontend/pull/71). inc-068 review, findings 9 and 16.
- **Page:** the INS address book list (its Type column and its Type filter) and the INS add form's uses question, 'What can this address be used for?'.
- **Prototype:** three labels for the same use. The Type column ([address-book.js#L8-L15](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/data/address-book.js#L8-L15)) says 'Place of origin', 'Place of destination', 'Branch'. The Type filter ([address-book-address-types.js#L4-L37](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/data/address-book-address-types.js#L4-L37)) says 'Place of Origin', 'Place of Destination', 'Branch Address'. The uses question's options ([address-book-origin-uses.js](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/data/address-book-origin-uses.js)) say 'Place of origin' and 'Consignor', and the criteria for the Destination and Branch forms (inc-071) say 'Place of destination', 'Consignee', 'Importer' and 'Branch address'.
- **Built:** all three, as the design source has them (`copy.en.js` `list.uses` for the column and the filter, and `uses.options` for the question, and the Welsh).
- **To ask:** should the column, the filter and the uses question use one label per use, and which: the column's ('Place of origin', 'Branch'), the filter's ('Place of Origin', 'Branch Address') or the question's ('Place of origin', 'Branch address')? The answer also decides which words a search by type matches. The GOV.UK style guide asks for sentence case with no unnecessary capitals ([capitalisation](https://www.gov.uk/guidance/style-guide/a-to-z-of-gov-uk-style#capitalisation)), which disagrees with the filter's 'Place of Origin', 'Place of Destination' and 'Branch Address' (raised again by the theme's engineering review, findings 24 and 28).

### S-12. What Clear search clears when a Type is chosen

- **Ticket:** [EUDPA-711](https://eaflood.atlassian.net/browse/EUDPA-711), [ins-frontend #71](https://github.com/DEFRA/trade-imports-ins-frontend/pull/71). inc-068 review, findings 17 and 27.
- **Page:** the INS address book list.
- **Prototype:** no Clear search link ([address-book.html](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/address-book.html)); it came back from the designer's 26 October answer (Settled, below), which did not cover the Type filter.
- **Built:** Clear search keeps the chosen Type and drops only the search text (`list.controller.js:150`), and shows only when there is search text. The spec records this as SCN-INS-ADDR-028-E.
- **To ask:** (a) should Clear search keep the chosen Type, as built, or clear every filter? (b) Should a way to clear the filters show when only a Type is chosen?

### S-13. Pressing Enter on the Type filter

- **Ticket:** [EUDPA-711](https://eaflood.atlassian.net/browse/EUDPA-711), [ins-frontend #71](https://github.com/DEFRA/trade-imports-ins-frontend/pull/71). inc-068 review, finding 23; the third open question on inc-068 in the theme backlog.
- **Page:** the INS address book list's 'Filter addresses' disclosure.
- **Requirement:** inc-068's criteria 2 and 8 say pressing Enter on the Type select submits the filter, with JavaScript on or off.
- **Built:** a standard GOV.UK select. Choosing a Type changes nothing until the Search button is pressed, or Enter in the search field. Browsers do not submit a form on Enter in a native select, so with JavaScript off the criterion cannot hold, and nothing tests it.
- **To ask:** (a) the filter submits only from the Search button or Enter in the search field, as built and as GOV.UK forms behave; or (b) a small script also submits on Enter in the Type select, with JavaScript on only?

### S-14. The order of a Destination, Consignee or Importer address's uses

- **Ticket:** [EUDPA-711](https://eaflood.atlassian.net/browse/EUDPA-711), [ins-frontend #71](https://github.com/DEFRA/trade-imports-ins-frontend/pull/71). inc-071 review.
- **Page:** the INS add form's uses question, and the address book list's Type filter on the Destination, Consignee and Importer tab.
- **Prototype:** two orders. The uses question ([address-book-destination-uses.js#L1-L17](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/data/address-book-destination-uses.js#L1-L17)) lists 'Place of destination', 'Consignee', 'Importer'. The Type filter ([address-book-address-types.js#L4-L37](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/data/address-book-address-types.js#L4-L37)) lists 'Consignee', 'Importer', 'Place of Destination'.
- **Built:** both, as the prototype has them: the filter in the address book's own order (`services/address-book/address-types.js` `USES_BY_ADDRESS_TYPE`), and the question with the place use first (`add.controller.js` `useItemsOf`).
- **To ask:** should the question and the filter list the uses in one order, and which: place first ('Place of destination', 'Consignee', 'Importer') or 'Consignee', 'Importer', 'Place of destination'? One order would let the code hold it in one place.

### S-15. The screen-reader name of the address book's tabs

- **Ticket:** [EUDPA-711](https://eaflood.atlassian.net/browse/EUDPA-711), [ins-frontend #71](https://github.com/DEFRA/trade-imports-ins-frontend/pull/71). The theme's engineering review, finding 18.
- **Page:** the INS address book list's three tabs.
- **Prototype:** draws the tabs as GOV.UK tabs with no navigation label ([address-book.html#L147-L162](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/address-book.html#L147-L162)).
- **Built:** the tabs are an MoJ sub navigation, whose navigation landmark needs a name for screen-reader users. The code chose 'Address types' (`copy.en.js` `list.tabsLabel`, Welsh 'Mathau o gyfeiriad').
- **To ask:** keep 'Address types', or use another name such as 'Address categories' or 'Address book'?

### S-16. One caption or two across the add-an-address flow

- **Ticket:** [EUDPA-711](https://eaflood.atlassian.net/browse/EUDPA-711), [ins-frontend #71](https://github.com/DEFRA/trade-imports-ins-frontend/pull/71). EUDPA-711 review, ins-frontend item 15.
- **Page:** the INS address type page (step 1 of adding an address) and the add form that follows it (step 2).
- **Prototype:** two captions. The type page says 'Add a new address' ([address-book-add.html#L37](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/address-book-add.html#L37)); the add form says 'Add new address' ([consignment-add-address.html#L39](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/views/design-release-2.1/consignment-add-address.html#L39)), as the ticket's acceptance criteria do.
- **Built:** both, as the prototype has them: the type page's caption is 'Add a new address' ([address-type.njk#L8](https://github.com/DEFRA/trade-imports-ins-frontend/blob/b8c877f/src/server/app/features/address-book/address-type/address-type.njk#L8), [copy.en.js#L89](https://github.com/DEFRA/trade-imports-ins-frontend/blob/b8c877f/src/server/app/features/address-book/copy/copy.en.js#L89)) and the add form's is 'Add new address' ([add.njk#L9](https://github.com/DEFRA/trade-imports-ins-frontend/blob/b8c877f/src/server/app/features/address-book/add/add.njk#L9), [copy.en.js#L125](https://github.com/DEFRA/trade-imports-ins-frontend/blob/b8c877f/src/server/app/features/address-book/copy/copy.en.js#L125)). A trader sees the caption change between step 1 and step 2.
- **To ask:** (a) both pages 'Add a new address', the words of the list's button; (b) both pages 'Add new address', as the ticket's criteria say; or (c) keep the two as built?

### S-17. Can a branch address also be a consignee, importer or place of destination?

- **Ticket:** [EUDPA-711](https://eaflood.atlassian.net/browse/EUDPA-711), [ins-frontend #71](https://github.com/DEFRA/trade-imports-ins-frontend/pull/71), [address-book #20](https://github.com/DEFRA/trade-imports-address-book/pull/20). Raised in the 5 November review of address types and roles.
- **Page:** the INS add form's 'Choose an address type' step and its roles question, and the party pickers that offer addresses by role.
- **Prototype:** Branch is its own category holding only 'Branch address' ([address-book.js#L51-L55](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/data/address-book.js#L51-L55)). The prototype files the consignment 'contact' type under Destination, Consignee and Importer, not under Branch ([address-book.js#L33-L42](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/data/address-book.js#L33-L42)).
- **Built:** an address has one type, and its roles come from that type only. A Branch address can be a branch address and nothing else. The journey's consignment contact asks for a branch address. A trader whose own office is also the importer or consignee has to add that address twice: once as Branch, and once as Destination, Consignee or Importer. Both sides are fixed to the United Kingdom, so one address holding both raises no location conflict.
- **To ask:** (a) keep Branch separate, as built, so such a trader holds two entries; or (b) let a Branch address also be a consignee, importer or place of destination, making 'Branch address' one more UK role? The answer also decides whether a send-side role and a receive-side role can ever share an address. As built they cannot, since one would be abroad and the other in Great Britain.

### S-18. Should a send-side address offer United Kingdom as its country?

- **For:** product, not the designer. Paul asks before EUDPA-711 is delivered. The service handles imports from outside the UK into the UK, so a send-side address may be outside the UK by definition, unless a UK-based consignor (for example a dealer selling animals that start in France) counts as the consignor in import terms.
- **Ticket:** [EUDPA-711](https://eaflood.atlassian.net/browse/EUDPA-711), [ins-frontend #71](https://github.com/DEFRA/trade-imports-ins-frontend/pull/71). Raised in the 5 November review of address types and roles.
- **Page:** the INS add form for an 'Origin or Consignor' address (Place of origin, Consignor), and its edit page.
- **Prototype:** the manual-entry country list adds United Kingdom to the reference countries on purpose: `buildAddressBookCountryItems` ([routes.js#L10412-L10423](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/routes.js#L10412-L10423)), used for the manual form at [routes.js#L10145-L10157](https://github.com/defra-design/GB-notification-service/blob/04a073baefcd0a9994f003bb811a30f68dfa8e40/app/routes.js#L10145-L10157). Destination and Branch addresses offer United Kingdom only.
- **Built:** as the prototype: an Origin or Consignor address offers every country, United Kingdom included (`address-countries.js`). Nothing stops a place of origin or consignor being saved in the UK. The address book API accepts any country for any type.
- **To ask:** (a) keep United Kingdom in the list, as the prototype has it, for example for a consignor based in the UK; or (b) leave it out, since animals imported into Great Britain start their journey abroad? If (b), should the API refuse a UK send-side address as well, and what about Northern Ireland, the Channel Islands and the Isle of Man?

## Settled

| Question | Answer | Where it landed |
|---|---|---|
| EUDPA-710: where the search guidance 'Search by name, address or country' goes | A hint under the 'Search' label, not a placeholder (26 October) | ins-frontend `3639400` |
| EUDPA-710: how a trader sees an active search and gets back to the full list | Reinstate 'Clear search'; removing it was an error (26 October) | ins-frontend `3639400`, ins-tests `abf5b9f` |
| EUDPA-709: the name field's label | 'Name or organisation' throughout, errors included (23 October) | EUDPA-709, merged |
| EUDPA-709: the blank country option | 'Select a country' on add and edit (23 October) | EUDPA-709, merged |
| EUDPA-708: the delete warning | 'Deletions are permanent and you cannot undo this.', as regular text (23 October) | EUDPA-709, merged |
