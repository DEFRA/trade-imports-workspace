# Notification Dashboard Specification (INS)

## Purpose

The Import Notification Service's landing page: a single list of notifications aggregated from every underlying journey (today: live-animals), searchable by reference number, showing each one's status, where a new notification starts, and the way into the trader's notification templates.

## Requirements

### Requirement: The dashboard lists notifications from every status, identifying each one
**ID**: REQ-INS-DASH-001
The system MUST show, as the signed-in landing page, a list of notifications spanning every status — including SUBMITTED, SUBMITTED_ACTION_REQUIRED, DRAFT and AMEND — each row showing its reference number and status, and MUST NOT show a notification that has been soft-deleted.

#### Scenario: Notifications of every status appear together, deleted ones excluded
**ID**: SCN-INS-DASH-001-A
- **GIVEN** notifications exist in SUBMITTED, SUBMITTED_ACTION_REQUIRED, DRAFT, AMEND and soft-deleted states
- **WHEN** a signed-in user opens the dashboard
- **THEN** the SUBMITTED, SUBMITTED_ACTION_REQUIRED, DRAFT and AMEND notifications are all shown, each with its reference number and status
- **AND** the soft-deleted notification does not appear

### Requirement: Opening a notification's link routes by its status
**ID**: REQ-INS-DASH-002
The system MUST link a submitted notification's row, with or without action required, to its read-only notification-view page, and MUST link a draft notification's row to its journey hub rather than notification-view.

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

#### Scenario: A notification submitted with action required opens read-only
**ID**: SCN-INS-DASH-002-C
- **GIVEN** a SUBMITTED_ACTION_REQUIRED notification is listed on the dashboard
- **WHEN** the user selects its View link
- **THEN** the read-only notification-view page opens for that reference

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

### Requirement: The dashboard always offers Create new, opening the notification type question
**ID**: REQ-INS-DASH-004
The system MUST offer a "Create new" button under the dashboard heading, above the reference search and the notifications list, whether the organisation has no notifications, has notifications, or has just searched (including a search that matches nothing), and MUST NOT offer "Start a new notification". Choosing "Create new" MUST open the "What are you importing?" question (`ins/notification-type`) with no option selected, before any notification exists.

#### Scenario: Starting from a dashboard that lists notifications asks what is being imported
**ID**: SCN-INS-DASH-004-A
- **GIVEN** notifications are listed on the dashboard
- **WHEN** the user chooses "Create new"
- **THEN** the question "What are you importing?" is shown
- **AND** no option is selected and the second option is Germinal products (semen, ova, embryos)

#### Scenario: Starting from an empty dashboard asks the same question
**ID**: SCN-INS-DASH-004-B
- **GIVEN** the organisation has no notifications
- **WHEN** the dashboard is shown
- **THEN** "Create new" is still offered
- **AND** choosing it shows the question "What are you importing?"

#### Scenario: Create new is still offered after a search that matches nothing
**ID**: SCN-INS-DASH-004-C
- **GIVEN** the user searches for a reference number that matches no notification
- **WHEN** the "No notifications found" message is shown
- **THEN** "Create new" is still offered
- **AND** choosing it shows the question "What are you importing?"

### Requirement: The dashboard always offers Use template, opening Manage templates
**ID**: REQ-INS-DASH-005
The system MUST offer a secondary "Use template" button beside "Create new", under the dashboard heading, whether the organisation has no notifications, has notifications, or has just searched (including a search that matches nothing). Following "Use template" MUST open the page headed "Manage templates" in the live animals service (`live-animals/notification-templates`).

#### Scenario: Use template is offered beside Create new in every state of the dashboard
**ID**: SCN-INS-DASH-005-A
- **GIVEN** the user is signed in
- **WHEN** the dashboard is shown with notifications, with none, or after a search that matches nothing
- **THEN** "Use template" is offered beside "Create new"

#### Scenario: Following Use template opens Manage templates
**ID**: SCN-INS-DASH-005-B
- **GIVEN** the user is signed in and on the dashboard
- **WHEN** they follow "Use template"
- **THEN** the page headed "Manage templates" is shown
