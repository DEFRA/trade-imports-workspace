# Origin Page Specification

## Purpose

Asks where the consignment comes from. The page is titled "Origin of the import".

## Requirements

### Requirement: The page asks for the country of origin
**ID**: REQ-PLANTS-ORIGIN-001
The system MUST ask the user for the country of origin, offering a searchable country field with a hint to start typing, and a save-and-continue action, and MUST leave the country unanswered when the page is first opened.

#### Scenario: The page presents its question and controls unanswered
**ID**: SCN-PLANTS-ORIGIN-001-A
- **GIVEN** the user has reached the origin of the import page without answering it before
- **WHEN** the page loads
- **THEN** it asks for the country of origin with a searchable field and a save-and-continue action
- **AND** no country is shown as chosen

### Requirement: The country field is a searchable list that filters as the user types
**ID**: REQ-PLANTS-ORIGIN-002
The system MUST offer the country of origin as a searchable field that filters to matching countries as the user types, MUST offer the whole list as soon as the field is opened before anything is typed, and MUST show the chosen country's name in that field when the user returns to the page.

#### Scenario: Typing part of a country's name offers the matching country
**ID**: SCN-PLANTS-ORIGIN-002-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** they type part of a country's name into the country field
- **THEN** the matching country is offered for them to choose

#### Scenario: Opening the country field offers the full list
**ID**: SCN-PLANTS-ORIGIN-002-B
- **GIVEN** the user is on the origin of the import page
- **WHEN** they open the country field without typing anything
- **THEN** every origin country is offered

#### Scenario: The chosen country's name is shown again on return
**ID**: SCN-PLANTS-ORIGIN-002-C
- **GIVEN** the user has chosen a country and saved the page
- **WHEN** they return to the origin of the import page
- **THEN** the country field shows the chosen country's name

### Requirement: The country field offers a placeholder and every origin country the service primes, and submits a country code
**ID**: REQ-PLANTS-ORIGIN-003
The system MUST offer a placeholder inviting the user to select a country ahead of every origin country the service primes, and MUST submit the chosen country's code rather than the text typed into the search field.

#### Scenario: The country list holds a placeholder ahead of the primed origin countries
**ID**: SCN-PLANTS-ORIGIN-003-A
- **GIVEN** the user is on the origin of the import page
- **WHEN** the country list is read in full
- **THEN** its first entry invites the user to select a country, and it holds every origin country the service primes besides

#### Scenario: Choosing a country submits and keeps its code
**ID**: SCN-PLANTS-ORIGIN-003-B
- **GIVEN** the user is on the origin of the import page
- **WHEN** they choose a country and save the page
- **THEN** the country's code is what the notification keeps, not the text typed into the search field

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

### Requirement: Saving without a country is refused, focusing the field
**ID**: REQ-PLANTS-ORIGIN-007
The system MUST refuse to save the origin page when no country has been chosen, showing an error that names the missing country of origin, and MUST focus the country field when the user follows the error.

#### Scenario: Saving with nothing chosen shows the error and focuses the field
**ID**: SCN-PLANTS-ORIGIN-007-A
- **GIVEN** the user is on the origin of the import page with no country chosen
- **WHEN** they save and continue
- **THEN** an error summary is shown, naming the missing country of origin
- **WHEN** they follow the error
- **THEN** the country field is focused

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
The system MUST offer save-and-continue, save-and-return-to-overview and cancel-and-return-to-overview on this page, and MUST reach it from the Overview origin task row.

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

### Requirement: The back link depends on whether the journey already has an answer
**ID**: REQ-PLANTS-ORIGIN-010
The system MUST send the user to the dashboard when they follow the back link from this page before any answer is saved, and to Overview once the journey holds an answer.

#### Scenario: The back link opens the dashboard before any answer is saved
**ID**: SCN-PLANTS-ORIGIN-010-A
- **GIVEN** the user has just started a notification and reached the origin of the import page without saving anything
- **WHEN** they follow the back link
- **THEN** the dashboard is shown

#### Scenario: The back link opens Overview once an answer is saved
**ID**: SCN-PLANTS-ORIGIN-010-B
- **GIVEN** the user has saved at least one answer on the notification
- **WHEN** they return to the origin of the import page and follow the back link
- **THEN** Overview is shown
