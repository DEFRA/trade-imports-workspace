# Origin Page Specification

## Purpose

Asks where the consignment comes from. The page is titled "Origin of the import".

## Requirements

### Requirement: The page asks for the country of origin
**ID**: REQ-PLANTS-ORIGIN-001
The system MUST ask the user for the country of origin, offering a searchable country field labelled "Country of origin" with no hint, and a save-and-continue action, and MUST leave the country unanswered when the page is first opened.

#### Scenario: The page presents its question and controls unanswered
**ID**: SCN-PLANTS-ORIGIN-001-A
- **GIVEN** the user has reached the origin of the import page without answering it before
- **WHEN** the page loads
- **THEN** it asks for the country of origin with a searchable field and a save-and-continue action
- **AND** no country is shown as chosen

### Requirement: The country field is a searchable list that filters as the user types
**ID**: REQ-PLANTS-ORIGIN-002
The system MUST offer the country of origin as a searchable field that filters to matching countries as the user types (matching ignores case and accents, and the matched letters show in bold), MUST offer the whole list as soon as the field is opened before anything is typed, and MUST show the chosen country's name in that field when the user returns to the page.

#### Scenario: Typing part of a country's name offers the matching country
**ID**: SCN-PLANTS-ORIGIN-002-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** they type part of a country's name into the country field
- **THEN** the matching country is offered for them to choose

#### Scenario: Opening the country field offers the full list
**ID**: SCN-PLANTS-ORIGIN-002-B
- **GIVEN** the user is on the origin of the import page
- **WHEN** they open the country field without typing anything
- **THEN** every origin country and territory is offered

#### Scenario: The chosen country's name is shown again on return
**ID**: SCN-PLANTS-ORIGIN-002-C
- **GIVEN** the user has chosen a country and saved the page
- **WHEN** they return to the origin of the import page
- **THEN** the country field shows the chosen country's name

#### Scenario: An accented search finds a country listed without the accent
**ID**: SCN-PLANTS-ORIGIN-002-D
- **GIVEN** the user is on the origin of the import page with JavaScript
- **WHEN** they type "Réunion" into the country field
- **THEN** "Reunion" is offered, with "Reunion" in bold

### Requirement: The country field offers select text and every origin country the service primes, and submits a country code
**ID**: REQ-PLANTS-ORIGIN-003
The system MUST offer select text inviting the user to select a country ahead of every origin country and territory the service primes (for example the Canary Islands), and MUST submit the chosen country's or territory's code rather than the text typed into the search field, taking those countries, their territories and their names from the reference data service's SPS origin block, listed by name.

#### Scenario: The country list holds select text ahead of the primed origin countries
**ID**: SCN-PLANTS-ORIGIN-003-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** the country list is read in full
- **THEN** its first entry invites the user to select a country, and it holds every origin country and territory the service primes besides

#### Scenario: Choosing a country submits and keeps its code
**ID**: SCN-PLANTS-ORIGIN-003-B
- **GIVEN** the user is on the origin of the import page
- **WHEN** they choose a country and save the page
- **THEN** the country's code is what the notification keeps, not the text typed into the search field

#### Scenario: The country list holds the reference data service's SPS origin countries and their territories, by name
**ID**: SCN-PLANTS-ORIGIN-003-C
- **GIVEN** the user is on the origin of the import page
- **WHEN** the country list is read in full
- **THEN** besides the select text it holds exactly the countries and territories the reference data service serves for the SPS origin block, by their served names, in alphabetical order

### Requirement: A search matching no country says so
**ID**: REQ-PLANTS-ORIGIN-004
The system MUST tell the user when a country search matches nothing.

#### Scenario: A country search with no matches shows a no-results message
**ID**: SCN-PLANTS-ORIGIN-004-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** they type into the country field a term that matches no country
- **THEN** a message tells them nothing matches

### Requirement: The country field works without client-side JavaScript
**ID**: REQ-PLANTS-ORIGIN-005
The system MUST keep an ordinary country list underneath the searchable field, so a user without JavaScript can still choose a country, and MUST have that underlying list carry the code the page submits.

#### Scenario: An ordinary country list remains available beneath the searchable field
**ID**: SCN-PLANTS-ORIGIN-005-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** the page is examined without relying on the searchable field
- **THEN** an ordinary country list is present, holding the same countries and carrying the code that is submitted

### Requirement: A complete origin answer is accepted
**ID**: REQ-PLANTS-ORIGIN-006
The system MUST accept a chosen country of origin, saving it without error.

#### Scenario: Choosing a country saves without error
**ID**: SCN-PLANTS-ORIGIN-006-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** they choose a country the notification may name and save and continue
- **THEN** the answer is saved and no error summary is shown

### Requirement: Saving without a country is refused on either save control, focusing the field
**ID**: REQ-PLANTS-ORIGIN-007
The system MUST refuse to save from the origin page when no country has been chosen, on save and continue and on save and return to overview alike, showing an error that names the missing country of origin, and MUST focus the country field when the user follows the error.

#### Scenario: Saving with nothing chosen shows the error and focuses the field
**ID**: SCN-PLANTS-ORIGIN-007-A
- **GIVEN** the user is on the origin of the import page with no country chosen
- **WHEN** they save and continue
- **THEN** an error summary is shown, naming the missing country of origin
- **WHEN** they follow the error
- **THEN** the country field is focused

#### Scenario: Save and return to overview with no country chosen shows the error
**ID**: SCN-PLANTS-ORIGIN-007-B
- **GIVEN** the user is on the origin of the import page with no country chosen
- **WHEN** they save and return to overview
- **THEN** an error summary is shown, naming the missing country of origin, and nothing is saved

### Requirement: A ware-potato consignment shows its origin-scope guidance
**ID**: REQ-PLANTS-ORIGIN-008
The system MUST show the ware-potato origin-scope guidance when the notification carries a ware-potato commodity line, and MUST NOT show that guidance when the notification's lines do not call for it.

#### Scenario: Ware-potato guidance is shown for a ware-potato consignment
**ID**: SCN-PLANTS-ORIGIN-008-A
- **GIVEN** a notification carries a ware-potato commodity line
- **WHEN** the user opens the origin of the import page
- **THEN** the ware-potato scope guidance is shown

#### Scenario: Ware-potato guidance is withheld when the lines do not call for it
**ID**: SCN-PLANTS-ORIGIN-008-B
- **GIVEN** a notification's commodity lines do not include ware potatoes
- **WHEN** the user opens the origin of the import page
- **THEN** the ware-potato scope guidance is not shown

### Requirement: The page offers a full set of save controls and is reachable from Overview
**ID**: REQ-PLANTS-ORIGIN-009
The system MUST offer save-and-continue, save-and-return-to-overview and cancel-and-return-to-overview on this page, and MUST reach it from the Overview origin task row. The page ends the same way on a draft and while amending.

#### Scenario: The page is reachable from the Overview origin row
**ID**: SCN-PLANTS-ORIGIN-009-A
- **GIVEN** the user is on Overview with a notification that has reached origin
- **WHEN** they open the origin task row
- **THEN** the origin of the import page is shown

#### Scenario: Save and return to overview saves the country without continuing the journey
**ID**: SCN-PLANTS-ORIGIN-009-B
- **GIVEN** the user is on the origin of the import page
- **WHEN** they choose a country and select save-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows that country still chosen

#### Scenario: Cancel and return to overview reaches Overview without saving
**ID**: SCN-PLANTS-ORIGIN-009-C
- **GIVEN** the user is on the origin of the import page
- **WHEN** they choose a country and select cancel-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows no country chosen

### Requirement: The back link opens the commodities list after Save and continue, and otherwise goes to where the user came from
**ID**: REQ-PLANTS-ORIGIN-010
The system MUST send the user to the commodities list when they follow the back link from this page after reaching the page by Save and continue, to the review when the page was opened from a Change link on the review, including from the error summary's link on the review, and to Overview when the page was opened from Overview, as `plants/journey-flow` describes.

#### Scenario: On a draft opened from a Change link, the back link opens the review
**ID**: SCN-PLANTS-ORIGIN-010-D
- **GIVEN** the review of a draft notification
- **WHEN** the user follows the Change link for the country of origin and then the back link
- **THEN** the review is shown

#### Scenario: The back link opens Overview when the page was opened from Overview
**ID**: SCN-PLANTS-ORIGIN-010-B
- **GIVEN** the user opened the origin of the import page from Overview
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: After Save and continue, the back link opens the commodities list
**ID**: SCN-PLANTS-ORIGIN-010-C
- **GIVEN** the user reached the origin page from the commodities list by saving and continuing
- **WHEN** they follow the back link
- **THEN** the commodities list is shown

#### Scenario: The error summary's link to the origin page has a back link to the review
**ID**: SCN-PLANTS-ORIGIN-010-E
- **GIVEN** a review whose error summary names a saved country of origin that falls outside the commodity lines' scope
- **WHEN** the user follows the error summary's link and then the back link
- **THEN** the review is shown

### Requirement: Completing the origin page completes the origin task row
**ID**: REQ-PLANTS-ORIGIN-011
The system MUST show the Overview origin task row as completed once a country of origin has been saved.

#### Scenario: Saving a country completes the origin row
**ID**: SCN-PLANTS-ORIGIN-011-A
- **GIVEN** the user has chosen a country and saved the origin page
- **WHEN** they open Overview
- **THEN** the origin task row reads completed

### Requirement: The country question carries no hint, and its empty search box invites a search
**ID**: REQ-PLANTS-ORIGIN-012
The system MUST ask "Country of origin" with no hint text, with or without JavaScript, and MUST keep its own country list, guidance and errors. With JavaScript the empty search box MUST show the placeholder "Search for a country"; without JavaScript the country list MUST begin with its blank "Select a country" entry, and choosing a country there MUST save it.

#### Scenario: With JavaScript, the empty search box shows "Search for a country" and no hint
**ID**: SCN-PLANTS-ORIGIN-012-A
- **GIVEN** the user has reached the origin of the import page with JavaScript available and no country chosen
- **WHEN** the page loads
- **THEN** the country field, labelled "Country of origin", shows the placeholder "Search for a country"
- **AND** no hint text is shown for the country question

#### Scenario: Without JavaScript, the country list begins with "Select a country", shows no hint, and saves the chosen country
**ID**: SCN-PLANTS-ORIGIN-012-B
- **GIVEN** the user has reached the origin of the import page without JavaScript
- **WHEN** they read the country list, choose a country from it and save and continue
- **THEN** the list, labelled "Country of origin", began with its blank "Select a country" entry and no hint text was shown
- **AND** returning to the page shows that country chosen

### Requirement: With JavaScript, the country search has a joined search button
**ID**: REQ-PLANTS-ORIGIN-013
With JavaScript the system MUST show a square GOV.UK blue search button, with a white magnifying glass, joined to the country search box. The button MUST be hidden from assistive technology and not focusable, MUST NOT submit the page, and MUST put the caret in the box when clicked.

#### Scenario: The search button is GOV.UK blue with a white magnifying glass
**ID**: SCN-PLANTS-ORIGIN-013-A
- **GIVEN** the user has JavaScript and has reached the origin of the import page
- **WHEN** the page loads
- **THEN** the search button beside the country search box is GOV.UK blue
- **AND** its magnifying glass is white

#### Scenario: The search button is hidden from assistive technology, not focusable, and never submits
**ID**: SCN-PLANTS-ORIGIN-013-B
- **GIVEN** the user has JavaScript and has reached the origin of the import page
- **WHEN** they tab on from the country search box, then click the search button
- **THEN** the search button is not announced and does not take focus
- **AND** the caret moves into the country search box and the page is not submitted

### Requirement: With JavaScript, the country search announces its results
**ID**: REQ-PLANTS-ORIGIN-014
With JavaScript the system MUST describe the country search box with the accessible autocomplete's assistive hint, and MUST announce through a polite live region the number of results and, once a suggestion is highlighted, which country is highlighted.

#### Scenario: The search box is described by the assistive hint
**ID**: SCN-PLANTS-ORIGIN-014-A
- **GIVEN** the user has JavaScript and has reached the origin of the import page
- **WHEN** the country search box is read by a screen reader
- **THEN** it is described by "When autocomplete results are available use up and down arrows to review and enter to select. Touch device users, explore by touch or with swipe gestures."

#### Scenario: The number of results is announced after typing
**ID**: SCN-PLANTS-ORIGIN-014-B
- **GIVEN** the user has JavaScript and has reached the origin of the import page
- **WHEN** they type text that matches one country
- **THEN** a polite live region announces "1 result is available."

#### Scenario: The highlighted country is announced
**ID**: SCN-PLANTS-ORIGIN-014-C
- **GIVEN** the user has typed text that matches one country
- **WHEN** they move onto the suggestion with the down arrow
- **THEN** a polite live region announces "1 result is available." followed by the country's name, "1 of 1 is highlighted"
