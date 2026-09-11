# Arrival Status Page Specification

## Purpose

Asks whether the consignment has already arrived in Great Britain. The page is titled "Has the consignment arrived in Great Britain?".

## Requirements

### Requirement: The page asks whether the consignment has arrived, offering both answers with timing hints
**ID**: REQ-PLANTS-ARRIVAL-STATUS-001
The system MUST ask whether the consignment has already arrived in Great Britain, offering "Yes, it has already arrived" and "No, it has not arrived yet" in that order, each with its timing hint, and MUST leave both unanswered when the page is first opened. The post-arrival hint MUST quote the four-day notification window.

#### Scenario: The page presents both statuses with their timing hints, none preselected
**ID**: SCN-PLANTS-ARRIVAL-STATUS-001-A
- **GIVEN** the user has reached the arrival-status page without answering it before
- **WHEN** the page loads
- **THEN** it offers that the consignment has already arrived, then that it has not arrived yet, each with its own timing hint
- **AND** the post-arrival hint names the four-day window
- **AND** neither answer is shown as chosen

### Requirement: The heading names Great Britain, not England
**ID**: REQ-PLANTS-ARRIVAL-STATUS-002
The system MUST word the page heading about arrival in Great Britain, and MUST NOT name England in that heading.

#### Scenario: The heading says Great Britain rather than England
**ID**: SCN-PLANTS-ARRIVAL-STATUS-002-A
- **GIVEN** the user is on the arrival-status page
- **WHEN** the heading is read
- **THEN** it names Great Britain
- **AND** it does not name England

### Requirement: A chosen arrival status is accepted
**ID**: REQ-PLANTS-ARRIVAL-STATUS-003
The system MUST accept a chosen arrival status, saving it without error, and MUST show it still chosen when the user returns to the page.

#### Scenario: Choosing a status saves without error and is shown again on return
**ID**: SCN-PLANTS-ARRIVAL-STATUS-003-A
- **GIVEN** the user is on the arrival-status page
- **WHEN** they choose whether the consignment has arrived and save and continue
- **THEN** the answer is saved and no error summary is shown
- **AND** returning to the page shows that answer still chosen

### Requirement: A value the service does not offer is rejected
**ID**: REQ-PLANTS-ARRIVAL-STATUS-004
The system MUST refuse to save an arrival status that is not one of the two offered, showing an error and leaving nothing checked.

#### Scenario: An out-of-list value is rejected and nothing is left checked
**ID**: SCN-PLANTS-ARRIVAL-STATUS-004-A
- **GIVEN** the user submits an arrival-status value the page does not offer
- **WHEN** they save and continue
- **THEN** an error is shown
- **AND** no status is left checked

### Requirement: Saving with no status chosen is refused, focusing the first option
**ID**: REQ-PLANTS-ARRIVAL-STATUS-005
The system MUST refuse to save the page when no status has been chosen, showing an error summary, and MUST focus the first status option when the user follows the error.

#### Scenario: Saving with nothing chosen shows the error and focuses the first option
**ID**: SCN-PLANTS-ARRIVAL-STATUS-005-A
- **GIVEN** the user is on the arrival-status page with nothing chosen
- **WHEN** they save and continue
- **THEN** an error summary is shown, naming the missing arrival status
- **WHEN** they follow the error
- **THEN** the first status option is focused

### Requirement: The page offers a full set of save controls and is reachable from Overview
**ID**: REQ-PLANTS-ARRIVAL-STATUS-006
The system MUST offer save-and-continue, save-and-return-to-overview and cancel-and-return-to-overview on this page, MUST return the user to Overview when they follow the back link, and MUST reach the page from the Overview arrival task row when the notification is asked the question.

#### Scenario: The page is reachable from the Overview arrival row
**ID**: SCN-PLANTS-ARRIVAL-STATUS-006-A
- **GIVEN** a plants or wood notification on Overview that is asked whether it has arrived
- **WHEN** they open the arrival task row
- **THEN** the arrival-status page is shown

#### Scenario: Save and return to overview saves the choice without continuing the journey
**ID**: SCN-PLANTS-ARRIVAL-STATUS-006-B
- **GIVEN** the user is on the arrival-status page
- **WHEN** they choose a status and select save-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows that status still chosen

#### Scenario: Cancel and return to overview reaches Overview without saving
**ID**: SCN-PLANTS-ARRIVAL-STATUS-006-C
- **GIVEN** the user is on the arrival-status page
- **WHEN** they choose a status and select cancel-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows no status chosen

#### Scenario: The back link opens Overview
**ID**: SCN-PLANTS-ARRIVAL-STATUS-006-D
- **GIVEN** the user is on the arrival-status page
- **WHEN** they follow the back link
- **THEN** Overview is shown
