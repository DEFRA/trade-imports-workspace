# Commodity Type Page Specification

## Purpose

The journey's entry page, asking what the consignment is. The page is titled "What are you importing?".

## Requirements

### Requirement: The page asks the commodity type, offering the three service types with a timing hint each
**ID**: REQ-PLANTS-COMMODITY-TYPE-001
The system MUST ask the user what they are importing, offering potatoes, plants for planting, and wood and cut trees, each with a hint stating the notice period that type carries, and MUST leave every type unchosen when the page is first opened.

#### Scenario: The page presents all three types with their own timing hint, none preselected
**ID**: SCN-PLANTS-COMMODITY-TYPE-001-A
- **GIVEN** the user has reached the commodity-type page without answering it before
- **WHEN** the page loads
- **THEN** it offers potatoes, plants for planting, and wood and cut trees, each with its own timing hint
- **AND** no type is shown as chosen

### Requirement: A chosen commodity type is accepted
**ID**: REQ-PLANTS-COMMODITY-TYPE-002
The system MUST accept a chosen commodity type, saving it without error, and MUST show it still chosen when the user returns to the page.

#### Scenario: Choosing a type saves without error and is shown again on return
**ID**: SCN-PLANTS-COMMODITY-TYPE-002-A
- **GIVEN** the user is on the commodity-type page
- **WHEN** they choose a type and save and continue
- **THEN** the answer is saved and no error summary is shown
- **AND** returning to the page shows that type still chosen

### Requirement: A value the service does not offer is rejected
**ID**: REQ-PLANTS-COMMODITY-TYPE-003
The system MUST refuse to save a commodity type that is not one of the three offered, showing an error and leaving no type checked.

#### Scenario: An out-of-list value is rejected and nothing is left checked
**ID**: SCN-PLANTS-COMMODITY-TYPE-003-A
- **GIVEN** the user submits a commodity type value the page does not offer
- **WHEN** they save and continue
- **THEN** an error is shown
- **AND** no type is left checked

### Requirement: Saving with no type chosen is refused, focusing the first option
**ID**: REQ-PLANTS-COMMODITY-TYPE-004
The system MUST refuse to save the page when no type has been chosen, showing an error summary, and MUST focus the first type option when the user follows the error.

#### Scenario: Saving with nothing chosen shows the error and focuses the first option
**ID**: SCN-PLANTS-COMMODITY-TYPE-004-A
- **GIVEN** the user is on the commodity-type page with nothing chosen
- **WHEN** they save and continue
- **THEN** an error summary is shown, naming the missing commodity type
- **WHEN** they follow the error
- **THEN** the first type option is focused

### Requirement: The page offers a full set of save controls, being reached directly from Overview
**ID**: REQ-PLANTS-COMMODITY-TYPE-005
The system MUST offer save-and-continue, save-and-return-to-overview and cancel-and-return-to-overview on this page, and MUST reach it from the Overview commodities task row as well as from creating a new notification.

#### Scenario: The page is reachable from the Overview commodities row
**ID**: SCN-PLANTS-COMMODITY-TYPE-005-A
- **GIVEN** the user is on Overview with a notification already carrying a commodity type
- **WHEN** they open the commodities task row
- **THEN** the commodity-type page is shown

#### Scenario: Save and return to overview saves the choice without continuing the journey
**ID**: SCN-PLANTS-COMMODITY-TYPE-005-B
- **GIVEN** the user is on the commodity-type page
- **WHEN** they choose a type and select save-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows that type still chosen

#### Scenario: Cancel and return to overview reaches Overview without saving
**ID**: SCN-PLANTS-COMMODITY-TYPE-005-C
- **GIVEN** the user is on the commodity-type page
- **WHEN** they choose a type and select cancel-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows no type chosen

### Requirement: The back link depends on whether the journey already has an answer
**ID**: REQ-PLANTS-COMMODITY-TYPE-006
The system MUST send the user to the dashboard when they follow the back link from this page before any answer is saved, and to Overview once the journey holds an answer.

#### Scenario: The back link opens the dashboard before any answer is saved
**ID**: SCN-PLANTS-COMMODITY-TYPE-006-A
- **GIVEN** the user has just started a notification and reached the commodity-type page
- **WHEN** they follow the back link
- **THEN** the dashboard is shown

#### Scenario: The back link opens Overview once an answer is saved
**ID**: SCN-PLANTS-COMMODITY-TYPE-006-B
- **GIVEN** the user has saved a commodity type
- **WHEN** they return to the commodity-type page and follow the back link
- **THEN** Overview is shown
