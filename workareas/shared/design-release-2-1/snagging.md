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

## Settled

| Question | Answer | Where it landed |
|---|---|---|
| EUDPA-710: where the search guidance 'Search by name, address or country' goes | A hint under the 'Search' label, not a placeholder (26 October) | ins-frontend `3639400` |
| EUDPA-710: how a trader sees an active search and gets back to the full list | Reinstate 'Clear search'; removing it was an error (26 October) | ins-frontend `3639400`, ins-tests `abf5b9f` |
| EUDPA-709: the name field's label | 'Name or organisation' throughout, errors included (23 October) | EUDPA-709, merged |
| EUDPA-709: the blank country option | 'Select a country' on add and edit (23 October) | EUDPA-709, merged |
| EUDPA-708: the delete warning | 'Deletions are permanent and you cannot undo this.', as regular text (23 October) | EUDPA-709, merged |
