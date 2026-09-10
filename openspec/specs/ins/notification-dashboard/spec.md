# Notification Dashboard Specification (INS)

## Purpose

The Import Notification Service's landing page: a single list of notifications aggregated from every underlying journey (today: live-animals), searchable by reference number, showing each one's status.

## Requirements

### Requirement: The dashboard lists notifications from every status, identifying each one
**ID**: REQ-INS-DASH-001
The system MUST show, as the signed-in landing page, a list of notifications spanning every status — including SUBMITTED, DRAFT and AMEND — each row showing its reference number and status, and MUST NOT show a notification that has been soft-deleted.

#### Scenario: Notifications of every status appear together, deleted ones excluded
**ID**: SCN-INS-DASH-001-A
- **GIVEN** notifications exist in SUBMITTED, DRAFT, AMEND and soft-deleted states
- **WHEN** a signed-in user opens the dashboard
- **THEN** the SUBMITTED, DRAFT and AMEND notifications are all shown, each with its reference number and status
- **AND** the soft-deleted notification does not appear

### Requirement: Opening a notification's link routes by its status
**ID**: REQ-INS-DASH-002
The system MUST link a submitted notification's row to its read-only notification-view page, and MUST link a draft notification's row to its journey hub rather than notification-view.

#### Scenario: A submitted notification opens read-only
**ID**: SCN-INS-DASH-002-A
- **GIVEN** a submitted notification is listed on the dashboard
- **WHEN** the user selects its View link
- **THEN** the read-only notification-view page opens for that reference

#### Scenario: A draft notification opens its journey hub, not the read-only view
**ID**: SCN-INS-DASH-002-B
- **GIVEN** a draft notification is listed on the dashboard
- **WHEN** the user selects its View link
- **THEN** the journey hub opens for that reference, not notification-view

### Requirement: The dashboard can be searched by notification reference
**ID**: REQ-INS-DASH-003
The system MUST let the user search the dashboard by complete notification reference, showing only the matching notification, and MUST show a "No notifications found" message when nothing matches.

#### Scenario: Searching by complete reference returns only that notification
**ID**: SCN-INS-DASH-003-A
- **GIVEN** more than one notification exists
- **WHEN** the user searches by one notification's complete reference number
- **THEN** only that notification is shown

#### Scenario: A reference that matches nothing shows an empty-result message
**ID**: SCN-INS-DASH-003-B
- **GIVEN** the user searches for a reference number that matches no notification
- **WHEN** the search runs
- **THEN** a "No notifications found" message is shown
