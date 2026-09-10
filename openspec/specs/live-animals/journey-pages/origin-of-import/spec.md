# Origin of the Import Page Specification

## Purpose

The journey's entry page, asking where the consignment is coming from. The page is titled "Origin of the import".

## Requirements

### Requirement: The page asks which country the consignment comes from and whether an origin code is needed
**ID**: REQ-ORIGIN-001
The system MUST ask the user which country the consignment is coming from, offering a country selector and a choice of whether an origin code is required, along with a save-and-continue action.

#### Scenario: The page presents its question and controls
**ID**: SCN-ORIGIN-001-A
- **GIVEN** the user has started a notification and reached the origin of the import page
- **WHEN** the page loads
- **THEN** it asks where the consignment is coming from, offering a country selector, a choice of whether an origin code is required, and a save-and-continue action

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

### Requirement: The country field offers the origin countries the service accepts, and submits a country code
**ID**: REQ-ORIGIN-003
The system MUST offer a placeholder and the thirty-one origin countries the service accepts, and MUST submit the chosen country's code rather than the text the user typed.

#### Scenario: The country list holds a placeholder and the accepted origin countries
**ID**: SCN-ORIGIN-003-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** the country list is read in full
- **THEN** its first entry invites the user to select a country, and it holds thirty-one origin countries besides

#### Scenario: Choosing a country submits and keeps its code
**ID**: SCN-ORIGIN-003-B
- **GIVEN** the user is on the origin of the import page
- **WHEN** they choose a country and save the page
- **THEN** the country's code is what the notification keeps, not the text typed into the search field

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

### Requirement: Saving without a country is accepted, but leaves the origin task outstanding
**ID**: REQ-ORIGIN-008
The system MUST accept the origin page being saved with no country chosen, without showing an error, and MUST leave the origin task row outstanding on Overview until a country is chosen.

#### Scenario: Saving with no country chosen succeeds and moves on
**ID**: SCN-ORIGIN-008-A
- **GIVEN** the user is on the origin of the import page with no country chosen
- **WHEN** they save and continue
- **THEN** the page saves without an error summary, and the user moves to the next step
- **AND** the origin task row on Overview shows as outstanding

### Requirement: The page also asks for an optional internal reference, capped at 58 characters
**ID**: REQ-ORIGIN-009
The system MUST let the user give an optional internal reference for the notification, MUST reject one longer than 58 characters, and MUST preserve the value typed so it can be corrected. The reference MUST accept whatever punctuation the user's own records use, including hyphens, slashes, spaces and full stops.

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

### Requirement: The region of origin code has a maximum length of five characters
**ID**: REQ-ORIGIN-010
The system MUST reject a region of origin code longer than five characters, with an error naming the limit, and MUST preserve the value typed.

#### Scenario: An over-length region code is rejected with the value preserved
**ID**: SCN-ORIGIN-010-A
- **GIVEN** the user has answered that a region code is required
- **WHEN** they type a region code longer than five characters and save and continue
- **THEN** an error names the region code's limit
- **AND** the field is focused, still holding the value typed
- **AND** the chosen country and the answer to whether a region code is required are still held

### Requirement: Answering that a region code is required but leaving it empty is rejected
**ID**: REQ-ORIGIN-011
The system MUST refuse to save the origin page when the user has answered that a region code is required but left the code itself empty, showing an error that focuses the region code field.

#### Scenario: An empty region code is rejected when one is required
**ID**: SCN-ORIGIN-011-A
- **GIVEN** the user has chosen a country and answered that a region code is required
- **WHEN** they leave the region code empty and save and continue
- **THEN** they remain on the origin of the import page
- **AND** an error focuses the region code field, with the chosen country and the required answer still held

### Requirement: Once a region code is required, the chosen country's code is shown as a fixed prefix beside the region code field
**ID**: REQ-ORIGIN-012
The system MUST show the chosen country's own code as a fixed prefix beside the region code field, once the page has been saved with a country chosen and a region code required.

#### Scenario: The country's code prefixes the region code field
**ID**: SCN-ORIGIN-012-A
- **GIVEN** the user has chosen France, answered that a region code is required, and saved
- **WHEN** they return to the origin of the import page
- **THEN** the region code field carries France's code as a fixed prefix

#### Scenario: The prefix follows whichever country was chosen
**ID**: SCN-ORIGIN-012-B
- **GIVEN** the user has chosen Ireland, answered that a region code is required, and saved
- **WHEN** they return to the origin of the import page
- **THEN** the region code field carries Ireland's code as a fixed prefix, not France's

### Requirement: The back link's target depends on whether the journey already has answers
**ID**: REQ-ORIGIN-013
The system MUST return the user to the notification dashboard when they follow the back link from the origin page of a journey that holds no answers, and to Overview once the journey holds at least one.

#### Scenario: The back link opens the dashboard before any answer is saved
**ID**: SCN-ORIGIN-013-A
- **GIVEN** the user has just started a notification and reached the origin of the import page, without saving anything
- **WHEN** they follow the back link
- **THEN** the notification dashboard is shown

#### Scenario: The back link opens Overview once the journey has an answer
**ID**: SCN-ORIGIN-013-B
- **GIVEN** the user has saved at least one answer on the notification
- **WHEN** they return to the origin of the import page and follow the back link
- **THEN** Overview is shown

### Requirement: A country not in the offered list is rejected
**ID**: REQ-ORIGIN-014
The system MUST refuse to save the origin page when the country entered is not one of the offered options, clearing the field and linking the error to it.

#### Scenario: An out-of-list country is rejected and the field is cleared
**ID**: SCN-ORIGIN-014-A
- **GIVEN** the user has typed a country not in the offered list
- **WHEN** they save and continue
- **THEN** an error is shown, linking to and focusing the country field
- **AND** the field is cleared rather than preserving the invalid entry
