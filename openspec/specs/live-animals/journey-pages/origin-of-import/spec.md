# Origin of the Import Page Specification

## Purpose

The journey's entry page, asking where the consignment is coming from. The page is titled "Origin of the import".

## Requirements

### Requirement: The page asks which country the consignment comes from and whether an origin code is needed
**ID**: REQ-ORIGIN-001
The system MUST ask the user which country the consignment is coming from, offering a country selector and a choice of whether an origin code is required, and MUST end the page with "Save and continue" alone, offering neither "Save and return to overview" nor "Cancel and return to overview". While the notification is being amended, REQ-FLOW-013 governs how the page ends instead.

#### Scenario: The page presents its question and controls
**ID**: SCN-ORIGIN-001-A
- **GIVEN** the user has started a notification and reached the origin of the import page
- **WHEN** the page loads
- **THEN** it asks where the consignment is coming from, offering a country selector and a choice of whether an origin code is required
- **AND** "Save and continue" is shown
- **AND** no "Save and return to overview" or "Cancel and return to overview" is offered

### Requirement: The country field is a searchable list that filters as the user types
**ID**: REQ-ORIGIN-002
The system MUST offer the country of origin as a searchable field that filters to matching countries as the user types, and MUST show the chosen country's name in that field when the user returns to the page.

#### Scenario: Typing part of a country's name offers the matching country
**ID**: SCN-ORIGIN-002-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** they type part of a country's name into the country field
- **THEN** the matching country is offered for them to choose

#### Scenario: The chosen country's name is shown again on return
**ID**: SCN-ORIGIN-002-B
- **GIVEN** the user has chosen a country and saved the page
- **WHEN** they return to the origin of the import page
- **THEN** the country field shows the chosen country's name

### Requirement: The country field offers the origin countries and territories the service accepts, and submits a code
**ID**: REQ-ORIGIN-003
The system MUST offer select text and the origin countries and territories the service accepts (for example the Canary Islands), MUST submit the chosen country's or territory's code rather than the text the user typed, and MUST take those countries, their territories and their names from the reference data service, each territory named with its country, listed alphabetically by the name shown.

#### Scenario: The country list holds select text, the accepted origin countries and their territories
**ID**: SCN-ORIGIN-003-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** the country list is read in full
- **THEN** its first entry invites the user to select a country, and the origin countries and territories follow it

#### Scenario: Choosing a country submits and keeps its code
**ID**: SCN-ORIGIN-003-B
- **GIVEN** the user is on the origin of the import page
- **WHEN** they choose a country and save the page
- **THEN** the country's code is what the notification keeps, not the text typed into the search field

#### Scenario: Choosing a territory submits and keeps its code and shows its name on return
**ID**: SCN-ORIGIN-003-C
- **GIVEN** the user is on the origin of the import page
- **WHEN** they choose the Canary Islands and save the page
- **THEN** the territory's code is what the notification keeps
- **AND** returning to the page shows "Canary Islands (Spain)" in the country field

#### Scenario: The country list holds the reference data service's origin countries and their territories, by name
**ID**: SCN-ORIGIN-003-D
- **GIVEN** the user is on the origin of the import page
- **WHEN** the country list is read in full
- **THEN** besides the select text it holds exactly the origin countries and territories the reference data service serves, each country by its served name and each territory as "<territory> (<country>)", in alphabetical order of the name shown

### Requirement: The country field offers its whole list on focus, before anything is typed
**ID**: REQ-ORIGIN-004
The system MUST offer the whole list of origin countries as soon as the user opens the country field, before anything is typed.

#### Scenario: Opening the country field offers the full list
**ID**: SCN-ORIGIN-004-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** they open the country field without typing anything
- **THEN** every origin country is offered

### Requirement: A search matching no country says so
**ID**: REQ-ORIGIN-005
The system MUST tell the user when a country search matches nothing.

#### Scenario: A country search with no matches shows a no-results message
**ID**: SCN-ORIGIN-005-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** they type into the country field a term that matches no country
- **THEN** a message tells them nothing matches

### Requirement: The country field works without client-side JavaScript
**ID**: REQ-ORIGIN-006
The system MUST keep an ordinary country list underneath the searchable field, so a user without JavaScript can still choose a country, and MUST have that underlying list carry the code the page submits.

#### Scenario: An ordinary country list remains available beneath the searchable field
**ID**: SCN-ORIGIN-006-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** the page is examined without relying on the searchable field
- **THEN** an ordinary country list is present, holding the same countries and carrying the code that is submitted

### Requirement: A complete origin answer is accepted
**ID**: REQ-ORIGIN-007
The system MUST accept an origin answer that names a country and answers whether an origin code is required, saving it without error.

#### Scenario: Choosing a country and answering the origin-code question saves without error
**ID**: SCN-ORIGIN-007-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** they choose a country and answer that no origin code is required, then save and continue
- **THEN** the answer is saved and no error summary is shown

### Requirement: Save and continue requires a country of origin
**ID**: REQ-ORIGIN-008
The system MUST refuse save and continue when the user has not chosen a country of origin, showing an error summary and a message on the country field, and MUST keep the user on the origin of the import page.

#### Scenario: Save and continue without a country is refused
**ID**: SCN-ORIGIN-008-A
- **GIVEN** the user is on the origin of the import page with no country chosen
- **WHEN** they save and continue
- **THEN** an error summary is shown
- **AND** a message is shown on the country of origin field
- **AND** the user remains on the origin of the import page

### Requirement: The page also asks for an optional internal reference, capped at 58 characters
**ID**: REQ-ORIGIN-009
The system MUST let the user give an optional internal reference for the notification, MUST reject one longer than 58 characters, and MUST preserve the value typed so it can be corrected. The reference MUST accept whatever punctuation the user's own records use, including hyphens, slashes, spaces and full stops. The field's hint MUST read "Enter any internal reference you want to use to identify this consignment, or leave blank." and MUST NOT state the limit, which the error names.

#### Scenario: An over-length internal reference is rejected with the value preserved
**ID**: SCN-ORIGIN-009-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** they type an internal reference longer than 58 characters and save and continue
- **THEN** an error names the internal reference and its limit
- **AND** the field is focused, still holding the value typed

#### Scenario: A punctuated internal reference is saved and shown as entered
**ID**: SCN-ORIGIN-009-B
- **GIVEN** the user is on the origin of the import page
- **WHEN** they type an internal reference containing hyphens, slashes, spaces and full stops, and save and continue
- **THEN** the reference is saved
- **AND** returning to the page shows it exactly as typed

#### Scenario: The internal reference hint invites a reference without stating the limit
**ID**: SCN-ORIGIN-009-C
- **GIVEN** the user is on the origin of the import page
- **WHEN** the page loads
- **THEN** the internal reference field's hint reads "Enter any internal reference you want to use to identify this consignment, or leave blank."
- **AND** no hint states the 58-character limit

### Requirement: The region of origin code has a maximum length of five characters
**ID**: REQ-ORIGIN-010
The system MUST stop the region of origin code box accepting more than five characters as the user types, with autocomplete and spellcheck turned off, and MUST still reject a longer region of origin code submitted without that cap, with an error naming the limit, preserving the value submitted.

#### Scenario: An over-length region code is rejected with the value preserved
**ID**: SCN-ORIGIN-010-A
- **GIVEN** the user has answered that a region code is required
- **WHEN** they submit a region code longer than five characters without the box's own cap and save and continue
- **THEN** an error names the region code's limit
- **AND** the field is focused, still holding the value typed
- **AND** the chosen country and the answer to whether a region code is required are still held

#### Scenario: Typing stops at five characters
**ID**: SCN-ORIGIN-010-C
- **GIVEN** the user has answered that a region code is required
- **WHEN** they type seven characters into the region code box
- **THEN** the box holds only the first five
- **AND** the box offers no autocomplete and no spellcheck

### Requirement: Answering that a region code is required but leaving it empty is rejected
**ID**: REQ-ORIGIN-011
The system MUST refuse to save from the origin page when the user has answered that a region code is required but left the code itself empty, showing an error that focuses the region code field.

#### Scenario: An empty region code is rejected when one is required
**ID**: SCN-ORIGIN-011-A
- **GIVEN** the user has chosen a country and answered that a region code is required
- **WHEN** they leave the region code empty and save and continue
- **THEN** they remain on the origin of the import page
- **AND** an error focuses the region code field, with the chosen country and the required answer still held

### Requirement: With JavaScript, the chosen country's code is shown as a fixed prefix beside the region code field
**ID**: REQ-ORIGIN-012
With JavaScript, the system MUST show the chosen country's code as a fixed prefix beside the region code field. The prefix MUST be empty before a country is chosen, when it is cleared and when the country has no code, fill in as a country is picked without saving, and show the saved or submitted code when the page is shown again or with an error. The prefix MUST be hidden from screen readers, and the field MUST be named by its label and described by the hint "Enter up to 5 characters.".

#### Scenario: With JavaScript, the country's code prefixes the region code field
**ID**: SCN-ORIGIN-012-A
- **GIVEN** the user has JavaScript, has chosen France, answered that a region code is required, typed "75" and saved
- **WHEN** they return to the origin of the import page
- **THEN** the region code field carries France's code as a fixed prefix
- **AND** the region code field holds "75"

#### Scenario: With JavaScript, the prefix follows whichever country was chosen
**ID**: SCN-ORIGIN-012-B
- **GIVEN** the user has JavaScript, has chosen Ireland, answered that a region code is required, and saved
- **WHEN** they return to the origin of the import page
- **THEN** the region code field carries Ireland's code as a fixed prefix, not France's

#### Scenario: With JavaScript, the prefix is empty before a country is chosen
**ID**: SCN-ORIGIN-012-C
- **GIVEN** the user has JavaScript and has chosen no country
- **WHEN** they answer that a region code is required
- **THEN** the revealed region code field shows an empty prefix in front of it

#### Scenario: With JavaScript, choosing a country fills the prefix without saving
**ID**: SCN-ORIGIN-012-D
- **GIVEN** the user has JavaScript and has answered that a region code is required
- **WHEN** they choose France
- **THEN** the prefix reads France's code with no save
- **WHEN** they then choose the Netherlands
- **THEN** the prefix reads the Netherlands' code with no save

#### Scenario: With JavaScript, choosing a territory fills the prefix with its country's code
**ID**: SCN-ORIGIN-012-E
- **GIVEN** the user has JavaScript and has answered that a region code is required
- **WHEN** they choose "Canary Islands (Spain)"
- **THEN** the prefix reads ES with no save

#### Scenario: With JavaScript, clearing the country empties the prefix
**ID**: SCN-ORIGIN-012-F
- **GIVEN** the user has JavaScript, has answered that a region code is required and has chosen France
- **WHEN** they clear the country
- **THEN** the prefix is empty

#### Scenario: With JavaScript, a refused page shows the submitted country's code as the prefix
**ID**: SCN-ORIGIN-012-G
- **GIVEN** the user has JavaScript, has chosen France, answered that a region code is required and left the code empty
- **WHEN** they save and continue and the page is shown with an error
- **THEN** the prefix reads France's code
- **WHEN** they then choose the Netherlands
- **THEN** the prefix reads the Netherlands' code

#### Scenario: With JavaScript, choosing a country with no code empties the prefix
**ID**: SCN-ORIGIN-012-H
- **GIVEN** the user has JavaScript, has answered that a region code is required and has chosen France
- **WHEN** they choose a country that has no code
- **THEN** the prefix is empty

#### Scenario: The prefix is hidden from screen readers and the field keeps its label and hint
**ID**: SCN-ORIGIN-012-I
- **GIVEN** the user has JavaScript and has answered that a region code is required
- **WHEN** the region code field is read by a screen reader
- **THEN** the prefix is not announced
- **AND** the field is named by its label and described by the hint "Enter up to 5 characters."

### Requirement: On a notification, the back link follows where the origin page was opened from
**ID**: REQ-ORIGIN-013
For a notification, the system MUST return the user from the origin page to the Import Notification Service's "What are you importing?" question when it was started there, and to the dashboard when it was started from the dashboard's create button, including by going back along the opening sequence. It MUST return to Overview when the page was opened from Overview, with or without answers. A notification not opened in this session that holds no answers MUST return to the dashboard.

#### Scenario: The back link opens the dashboard when the page was opened from the dashboard
**ID**: SCN-ORIGIN-013-A
- **GIVEN** the user has just started a notification from the dashboard's create button and reached the origin of the import page, without saving anything
- **WHEN** they follow the back link
- **THEN** the notification dashboard is shown

#### Scenario: The back link opens Overview when the page was opened from Overview with an answer saved
**ID**: SCN-ORIGIN-013-B
- **GIVEN** the user has saved at least one answer on a notification and has opened Overview
- **WHEN** they open the origin of the import page from Overview and follow the back link
- **THEN** Overview is shown

#### Scenario: The back link opens Overview when the page was opened from Overview before any answer is saved
**ID**: SCN-ORIGIN-013-C
- **GIVEN** the user has started a notification, saved nothing and opened Overview
- **WHEN** they open the origin of the import page from Overview and follow the back link
- **THEN** Overview is shown

#### Scenario: The back link opens the dashboard when the page is reached by going back along the opening sequence
**ID**: SCN-ORIGIN-013-D
- **GIVEN** the user has started a notification from the live animals notifications list's own create button, saved the origin of the import page and followed the back link from "What are you importing?"
- **WHEN** they follow the back link from the origin of the import page
- **THEN** the notification dashboard is shown

#### Scenario: The back link opens the Import Notification Service question when the notification was started from it
**ID**: SCN-ORIGIN-013-E
- **GIVEN** the user has started a notification from the Import Notification Service's "What are you importing?" question and reached the origin of the import page
- **WHEN** they follow the back link
- **THEN** the Import Notification Service's "What are you importing?" question is shown, not the commodities page of the same title
- **AND** Live animals is selected

#### Scenario: The back link opens Overview when a notification started from the Import Notification Service question is opened from Overview
**ID**: SCN-ORIGIN-013-F
- **GIVEN** the user has started a notification from the Import Notification Service's "What are you importing?" question and opened Overview
- **WHEN** they open the origin of the import page from Overview and follow the back link
- **THEN** Overview is shown

#### Scenario: The back link opens the Import Notification Service question when the origin page is reached by going back along the opening sequence
**ID**: SCN-ORIGIN-013-G
- **GIVEN** a notification started from the Import Notification Service's "What are you importing?" question
- **WHEN** the user goes back along the opening run to the origin of the import page and follows the back link
- **THEN** the Import Notification Service's "What are you importing?" question is shown
- **AND** Live animals is selected

### Requirement: A country not in the offered list is rejected
**ID**: REQ-ORIGIN-014
The system MUST refuse to save the origin page when the country entered is not one of the offered options, clearing the field and linking the error to it.

#### Scenario: An out-of-list country is rejected and the field is cleared
**ID**: SCN-ORIGIN-014-A
- **GIVEN** the user has typed a country not in the offered list
- **WHEN** they save and continue
- **THEN** an error is shown, linking to and focusing the country field
- **AND** the field is cleared rather than preserving the invalid entry

### Requirement: The country question carries no hint, and its empty search box invites a search
**ID**: REQ-ORIGIN-015
The system MUST ask "Country of origin" with no hint text, with or without JavaScript. With JavaScript the empty search box MUST show the placeholder "Search for a country"; without JavaScript the country list MUST begin with its blank "Select a country" entry.

#### Scenario: With JavaScript, the empty search box shows "Search for a country" and no hint
**ID**: SCN-ORIGIN-015-A
- **GIVEN** the user has reached the origin of the import page with JavaScript available and no country chosen
- **WHEN** the page loads
- **THEN** the country field, labelled "Country of origin", shows the placeholder "Search for a country"
- **AND** no hint text is shown for the country question

#### Scenario: Without JavaScript, the country list begins with "Select a country" and no hint
**ID**: SCN-ORIGIN-015-B
- **GIVEN** the user has reached the origin of the import page without JavaScript
- **WHEN** the page loads
- **THEN** the country list, labelled "Country of origin", begins with its blank "Select a country" entry
- **AND** no hint text is shown for the country question

### Requirement: The region of origin code question points to the health certificate
**ID**: REQ-ORIGIN-016
The system MUST give the question "Does the consignment have a region of origin code?" the hint "Check the health certificate for a region of origin code. You can add the code later if you do not have the certificate now."

#### Scenario: The region question's hint names the health certificate
**ID**: SCN-ORIGIN-016-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** the page loads
- **THEN** the region of origin code question's hint reads "Check the health certificate for a region of origin code. You can add the code later if you do not have the certificate now."

### Requirement: A region code typed before a country is kept until the country gives it its prefix
**ID**: REQ-ORIGIN-017
The system MUST refuse to save the origin page when no country of origin is chosen while the user has typed a region code, MUST keep the typed code in the region code box on that refusal, and MUST save the code with the chosen country's prefix once a country is chosen and save succeeds.

#### Scenario: The typed code stays in the box when save is refused for the missing country
**ID**: SCN-ORIGIN-017-A
- **GIVEN** the user is on the origin of the import page with no country chosen, has answered that a region code is required and has typed a code
- **WHEN** they save and continue
- **THEN** an error is shown for the missing country of origin
- **AND** the region code box still holds the code typed
- **AND** the user remains on the origin of the import page

#### Scenario: Once a country is chosen the code is saved with that country's prefix
**ID**: SCN-ORIGIN-017-B
- **GIVEN** the user is on the origin of the import page with no country chosen, has answered that a region code is required and has typed a code, and save was refused for the missing country
- **WHEN** they choose a country and save and continue
- **THEN** the answer is saved
- **AND** the review page shows the region code with that country's prefix

### Requirement: Each territory in the country list is named with its country, and keeps its code
**ID**: REQ-ORIGIN-018
The system MUST name every territory in the country of origin list "<territory> (<country>)", for example "Canary Islands (Spain)", with or without JavaScript. It MUST sort the list alphabetically by the name shown. It MUST save a chosen territory by its own code, and on return MUST show it by that name and, with JavaScript, with its country's code as the region code prefix.

#### Scenario: A territory is named with its country, with or without JavaScript
**ID**: SCN-ORIGIN-018-A
- **GIVEN** the user is on the origin of the import page, with or without JavaScript
- **WHEN** the country list is read
- **THEN** each territory reads "<territory> (<country>)", for example "Canary Islands (Spain)"

#### Scenario: The list is sorted by the name shown
**ID**: SCN-ORIGIN-018-B
- **GIVEN** the user is on the origin of the import page
- **WHEN** the country list is read in full
- **THEN** it is in alphabetical order of the names shown, so "Canary Islands (Spain)" sits among the C entries

#### Scenario: A chosen territory keeps its code and is shown back with its country's prefix
**ID**: SCN-ORIGIN-018-C
- **GIVEN** the user has JavaScript, chose "Canary Islands (Spain)", answered that a region code is required, typed a code and saved
- **WHEN** they return to the origin of the import page
- **THEN** the country field shows "Canary Islands (Spain)", the notification keeps the territory's code, and the region code field carries Spain's code, ES, as its fixed prefix

### Requirement: The region code is saved with the country's code whether or not the trader typed it
**ID**: REQ-ORIGIN-020
The system MUST save the region code as the chosen country's code joined to the rest, whether or not the trader typed the country's code, and MUST measure the five-character limit on the rest after any typed country code is removed. A typed country code is removed only when it is followed by the hyphen.

#### Scenario: Without JavaScript, a region code typed with or without the country code is saved joined
**ID**: SCN-ORIGIN-020-A
- **GIVEN** the user has no JavaScript, has chosen France and answered that a region code is required
- **WHEN** they type "75", or "FR-75", and save
- **THEN** the region code saved is "FR-75" in both cases

#### Scenario: A typed country code does not count towards the five-character limit
**ID**: SCN-ORIGIN-020-B
- **GIVEN** JavaScript is off, the user has chosen France and answered that a region code is required
- **WHEN** they type "FR-" followed by five characters and save and continue
- **THEN** the region code saved is "FR-" followed by those five characters
- **WHEN** they type "FR-" followed by six characters and save and continue
- **THEN** an error names the region code's limit and nothing is saved
- **AND** the typed country code does not count towards the five-character limit

#### Scenario: A country's letters typed without the hyphen are kept as typed
**ID**: SCN-ORIGIN-020-C
- **GIVEN** the user has chosen France and answered that a region code is required
- **WHEN** they type "FR75" with no hyphen and save
- **THEN** the region code saved is "FR-FR75"

### Requirement: Without JavaScript the region code field has no prefix
**ID**: REQ-ORIGIN-021
Without JavaScript the system MUST show no region code prefix, on first view, after a save or after an error.

#### Scenario: Without JavaScript, the region code field has no prefix
**ID**: SCN-ORIGIN-021-A
- **GIVEN** the user has no JavaScript
- **WHEN** the region code field is shown on first view, after a save, or after an error
- **THEN** the field has no prefix, empty or filled

### Requirement: With JavaScript, the country search has a joined search button
**ID**: REQ-ORIGIN-022
With JavaScript the system MUST show a square GOV.UK blue search button, with a white magnifying glass, joined to the country search box. The button MUST be hidden from assistive technology and not focusable, MUST NOT submit the page, and MUST put the caret in the box when clicked.

#### Scenario: The search button is GOV.UK blue with a white magnifying glass
**ID**: SCN-ORIGIN-022-A
- **GIVEN** the user has JavaScript and has reached the origin of the import page
- **WHEN** the page loads
- **THEN** the search button beside the country search box is GOV.UK blue
- **AND** its magnifying glass is white

#### Scenario: The search button is hidden from assistive technology, not focusable, and never submits
**ID**: SCN-ORIGIN-022-B
- **GIVEN** the user has JavaScript and has reached the origin of the import page
- **WHEN** they tab on from the country search box, then click the search button
- **THEN** the search button is not announced and does not take focus
- **AND** the caret moves into the country search box and the page is not submitted

### Requirement: With JavaScript, the country search announces its results
**ID**: REQ-ORIGIN-023
With JavaScript the system MUST describe the country search box with the accessible autocomplete's assistive hint, and MUST announce through a polite live region the number of results and, once a suggestion is highlighted, which country is highlighted.

#### Scenario: The search box is described by the assistive hint
**ID**: SCN-ORIGIN-023-A
- **GIVEN** the user has JavaScript and has reached the origin of the import page
- **WHEN** the country search box is read by a screen reader
- **THEN** it is described by "When autocomplete results are available use up and down arrows to review and enter to select. Touch device users, explore by touch or with swipe gestures."

#### Scenario: The number of results is announced after typing
**ID**: SCN-ORIGIN-023-B
- **GIVEN** the user has JavaScript and has reached the origin of the import page
- **WHEN** they type text that matches one country
- **THEN** a polite live region announces "1 result is available."

#### Scenario: The highlighted country is announced
**ID**: SCN-ORIGIN-023-C
- **GIVEN** the user has typed text that matches one country
- **WHEN** they move onto the suggestion with the down arrow
- **THEN** a polite live region announces "1 result is available." followed by the country's name, "1 of 1 is highlighted"
