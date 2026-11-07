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

#### Scenario: The page tells the user to notify each type in a separate notification
**ID**: SCN-PLANTS-COMMODITY-TYPE-001-B
- **GIVEN** the user has reached the commodity-type page without answering it before
- **WHEN** the page loads
- **THEN** it tells them to notify potatoes, plants for planting and wood in separate notifications

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
The system MUST refuse to save a commodity type that is not one of the three offered, on save and continue and on save and return to overview alike, keeping the user on the page with the error "Select what you are importing", leaving no type checked and leaving any commodity lines held.

#### Scenario: An out-of-list value is rejected and nothing is left checked
**ID**: SCN-PLANTS-COMMODITY-TYPE-003-A
- **GIVEN** the user submits a commodity type value the page does not offer
- **WHEN** they save and continue
- **THEN** an error is shown
- **AND** no type is left checked

#### Scenario: An out-of-list value on save and return to overview is rejected and the lines are kept
**ID**: SCN-PLANTS-COMMODITY-TYPE-003-B
- **GIVEN** the notification holds commodity lines and the user submits a commodity type value the page does not offer
- **WHEN** they save and return to overview
- **THEN** they stay on the page with the error shown
- **AND** no type is left checked
- **AND** the commodity lines are still held

### Requirement: Saving with no type chosen is refused on either save control, focusing the first option
**ID**: REQ-PLANTS-COMMODITY-TYPE-004
The system MUST refuse to save from the page when no type has been chosen, on save and continue and on save and return to overview alike, showing an error summary, and MUST focus the first type option when the user follows the error. The commodity lines already held MUST be kept.

#### Scenario: Saving with nothing chosen shows the error and focuses the first option
**ID**: SCN-PLANTS-COMMODITY-TYPE-004-A
- **GIVEN** the user is on the commodity-type page with nothing chosen
- **WHEN** they save and continue
- **THEN** an error summary is shown, naming the missing commodity type
- **WHEN** they follow the error
- **THEN** the first type option is focused

#### Scenario: Save and return to overview with nothing chosen shows the error and keeps the lines
**ID**: SCN-PLANTS-COMMODITY-TYPE-004-B
- **GIVEN** the user is on the commodity-type page with nothing chosen and the notification holds commodity lines
- **WHEN** they save and return to overview
- **THEN** they stay on the page and the error "Select what you are importing" is shown in the summary and beside the options, and nothing is saved
- **AND** the commodity lines are still held

### Requirement: The page offers a full set of save controls, being reached directly from Overview
**ID**: REQ-PLANTS-COMMODITY-TYPE-005
The system MUST offer save-and-continue, save-and-return-to-overview and cancel-and-return-to-overview on this page, and MUST reach it from the Overview commodities task row as well as from creating a new notification. While the notification is being amended, `plants/journey-flow` REQ-PLANTS-FLOW-014 governs how the page ends instead.

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

### Requirement: The back link goes to where the notification was started, or to where the user came from
**ID**: REQ-PLANTS-COMMODITY-TYPE-006
The system MUST send the user from this page to where the notification was started (the dashboard, or the Import Notification Service question), to Overview when opened from Overview, and to the review when opened from a Change link; opened by its address, to the dashboard before any answer is saved and to Overview after. A commodity type change that removes lines MUST remove them whichever save button was pressed.

#### Scenario: The back link opens the dashboard before any answer is saved
**ID**: SCN-PLANTS-COMMODITY-TYPE-006-A
- **GIVEN** the user has just started a notification and reached the commodity-type page
- **WHEN** they follow the back link
- **THEN** the dashboard is shown

#### Scenario: The back link opens Overview once an answer is saved
**ID**: SCN-PLANTS-COMMODITY-TYPE-006-B
- **GIVEN** the user has saved a commodity type
- **WHEN** they open the commodity-type page from Overview and follow the back link
- **THEN** Overview is shown

#### Scenario: The back link opens the Import Notification Service question when the notification was started there
**ID**: SCN-PLANTS-COMMODITY-TYPE-006-C
- **GIVEN** a notification started from the Import Notification Service's "What are you importing?" question
- **WHEN** the user follows the back link on the commodity-type page
- **THEN** the Import Notification Service's "What are you importing?" question is shown

#### Scenario: The back link opens the review when the page was opened from a Change link
**ID**: SCN-PLANTS-COMMODITY-TYPE-006-D
- **GIVEN** the review of a draft notification
- **WHEN** the user follows the Change link that opens the commodity-type page and then the back link
- **THEN** the review is shown

#### Scenario: Save and return to overview removes the lines the new type does not hold and opens Overview
**ID**: SCN-PLANTS-COMMODITY-TYPE-006-E
- **GIVEN** a notification holding potato commodity lines
- **WHEN** the user changes the commodity type to wood and cut trees and selects "Save and return to overview"
- **THEN** Overview is shown
- **AND** the potato lines are gone

#### Scenario: Save and continue after removing lines opens the commodities list, whose back link opens the commodity type page
**ID**: SCN-PLANTS-COMMODITY-TYPE-006-F
- **GIVEN** a notification holding potato commodity lines
- **WHEN** the user changes the commodity type to wood and cut trees and selects "Save and continue"
- **THEN** the commodities list is shown reporting the lines removed
- **AND** its back link opens the commodity type page
