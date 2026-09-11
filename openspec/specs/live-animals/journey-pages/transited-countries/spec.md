# Transited Countries Page Specification

## Purpose

Asks which countries the consignment travels through on its way, adding them one at a time to a list rather than choosing from a fixed group. The page is titled "Which countries will the consignment travel through?".

## Requirements

### Requirement: The page asks for transited countries one at a time by search, starting with an empty list
**ID**: REQ-TRANSIT-COUNTRIES-001
The system MUST let the user search for and add one transited country at a time, offering a labelled search field and an "Add country" action, and MUST start a fresh notification with no countries added and no cap mentioned up front.

#### Scenario: The page presents an empty list with a search field and no cap stated
**ID**: SCN-TRANSIT-COUNTRIES-001-A
- **GIVEN** the user has reached the transited countries page for a fresh notification
- **WHEN** the page loads
- **THEN** it offers a labelled country search and an "Add country" action
- **AND** it states no countries have been added yet, with no table shown and no cap mentioned

### Requirement: Each added country is listed with its own Remove control, and the list persists
**ID**: REQ-TRANSIT-COUNTRIES-002
The system MUST show every added country as a row in a table with its own Remove action, MUST let the user remove a row without affecting the others, MUST announce each addition and removal to assistive technology, and MUST show the same countries again when the page is reopened after saving.

#### Scenario: Adding a country lists it with a Remove control and announces it
**ID**: SCN-TRANSIT-COUNTRIES-002-A
- **GIVEN** the user is on the transited countries page
- **WHEN** they add a country
- **THEN** it appears as a row in a table, with its own Remove control
- **AND** the addition is announced to assistive technology

#### Scenario: Removing a country takes only that row away and announces it
**ID**: SCN-TRANSIT-COUNTRIES-002-B
- **GIVEN** the user has added more than one country
- **WHEN** they remove one of them
- **THEN** only that country's row is taken away, leaving the others
- **AND** the removal is announced to assistive technology

#### Scenario: Saved countries are shown again on return
**ID**: SCN-TRANSIT-COUNTRIES-002-C
- **GIVEN** the user has added countries and saved the page
- **WHEN** they reopen the transited countries page
- **THEN** every saved country is shown in the table

### Requirement: Saving with no countries added is accepted
**ID**: REQ-TRANSIT-COUNTRIES-003
The system MUST accept the transited countries page being saved with none added, without showing an error, since the question is optional.

#### Scenario: Continuing with nothing added succeeds
**ID**: SCN-TRANSIT-COUNTRIES-003-A
- **GIVEN** the user is on the transited countries page with no countries added
- **WHEN** they save and continue
- **THEN** the page saves without an error summary, and the user moves to the next step
- **AND** the empty list is shown again if they return to the page

### Requirement: Adding a country is refused when the entry is blank, not offered, already added, or the cap is reached
**ID**: REQ-TRANSIT-COUNTRIES-004
The system MUST refuse to add a country when the search field is left blank, when the entry is not one of the offered countries, or when it has already been added, in each case naming the reason and linking to and focusing the search field. The system MUST NOT render a rejected entry back as an added row, whatever it contains.

#### Scenario: Pressing Add with nothing chosen is refused
**ID**: SCN-TRANSIT-COUNTRIES-004-A
- **GIVEN** the user presses "Add country" with the search field empty
- **WHEN** the page responds
- **THEN** an error tells them to enter a country to add, linking to and focusing the search field

#### Scenario: A country already added is refused by name
**ID**: SCN-TRANSIT-COUNTRIES-004-B
- **GIVEN** the user has already added a country
- **WHEN** they try to add the same country again
- **THEN** an error names that country as already added
- **AND** the list still holds only the one entry

#### Scenario: An out-of-list or tampered entry is refused and never rendered back
**ID**: SCN-TRANSIT-COUNTRIES-004-C
- **GIVEN** a country code that is not one of the offered options, however it was submitted
- **WHEN** the page responds
- **THEN** an error tells the user to select a country from the list, linking to and focusing the search field
- **AND** the rejected value is not added to the list or rendered back onto the page as markup

### Requirement: Transited countries are capped at twelve
**ID**: REQ-TRANSIT-COUNTRIES-005
The system MUST refuse to add a thirteenth transited country, and once twelve are added MUST remove the search field and the Add action and instead state that the limit is reached, until a country is removed. The system MUST also refuse a save carrying more than twelve countries, however it was submitted, naming the limit.

#### Scenario: Reaching twelve removes the search and states the limit
**ID**: SCN-TRANSIT-COUNTRIES-005-A
- **GIVEN** the user has added eleven countries
- **WHEN** they add a twelfth
- **THEN** the search field and "Add country" action are no longer shown
- **AND** a message states the limit of twelve is reached, also announced to assistive technology

#### Scenario: Removing a country at the limit brings the search back
**ID**: SCN-TRANSIT-COUNTRIES-005-B
- **GIVEN** the user has reached the limit of twelve countries
- **WHEN** they remove one
- **THEN** the search field is offered again

#### Scenario: A save carrying more than twelve countries is refused
**ID**: SCN-TRANSIT-COUNTRIES-005-C
- **GIVEN** a submission carrying more than twelve transited countries, however it arrived
- **WHEN** the page responds
- **THEN** an error names the limit of twelve, linking to and focusing the search field
