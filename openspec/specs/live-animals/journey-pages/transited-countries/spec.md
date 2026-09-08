# Transited Countries Page Specification

## Purpose

Asks which countries the consignment travels through on its way. The page is titled "Which countries will the consignment travel through?".

## Requirements

### Requirement: The page asks which countries the consignment travels through, as one list of all thirty-one
**ID**: REQ-TRANSIT-COUNTRIES-001
The system MUST ask the user to select every country the consignment will travel through, offering all thirty-one selectable countries as a single group with a save-and-continue action.

#### Scenario: The page presents one group of all thirty-one countries
**ID**: SCN-TRANSIT-COUNTRIES-001-A
- **GIVEN** the user has reached the transited countries page
- **WHEN** the page loads
- **THEN** it asks the user to select all countries the consignment will travel through, offering thirty-one countries in one group, with a save-and-continue action

### Requirement: Several transited countries can be chosen together and are kept
**ID**: REQ-TRANSIT-COUNTRIES-002
The system MUST accept more than one transited country at once, and MUST show each as still chosen when the page is reopened.

#### Scenario: Two chosen countries are saved and shown again on return
**ID**: SCN-TRANSIT-COUNTRIES-002-A
- **GIVEN** the user is on the transited countries page
- **WHEN** they choose two countries and save and continue
- **THEN** the answers are saved and no error summary is shown
- **WHEN** they reopen the page for the same notification
- **THEN** both countries are shown as still chosen

### Requirement: Saving without choosing a country is rejected, focusing the empty group
**ID**: REQ-TRANSIT-COUNTRIES-003
The system MUST refuse to save the transited countries page when no country has been chosen, showing an error summary that focuses the group of checkboxes.

#### Scenario: Saving with nothing chosen shows an error summary and focuses the group
**ID**: SCN-TRANSIT-COUNTRIES-003-A
- **GIVEN** the user is on the transited countries page with nothing chosen
- **WHEN** they save and continue
- **THEN** an error summary headed "There is a problem" is shown
- **AND** following the error focuses the group, with nothing checked

### Requirement: An invalid country submitted clears every chosen country
**ID**: REQ-TRANSIT-COUNTRIES-004
The system MUST reject a submitted country that is not one of the thirty-one offered, clearing every country that had been chosen, rather than only the invalid one.

#### Scenario: An out-of-list country clears the whole selection
**ID**: SCN-TRANSIT-COUNTRIES-004-A
- **GIVEN** the user has an invalid country submitted alongside valid ones
- **WHEN** they save and continue
- **THEN** an error is shown, and following it focuses the group with nothing checked

### Requirement: Transited countries are capped at twelve
**ID**: REQ-TRANSIT-COUNTRIES-005
The system MUST reject more than twelve chosen transited countries, with an error naming the limit, and MUST keep every chosen country so the user can remove down to the limit rather than starting again.

#### Scenario: Choosing thirteen countries is rejected, keeping every selection
**ID**: SCN-TRANSIT-COUNTRIES-005-A
- **GIVEN** the user has chosen thirteen transited countries
- **WHEN** they save and continue
- **THEN** an error is shown naming the limit of twelve
- **AND** all thirteen countries are still shown as chosen
