# Notification Dashboard Specification (INS)

## Purpose

The Import Notification Service's landing page: a single list of notifications, searchable by reference number, showing each one's status, and where a new notification starts. It lists live animals notifications only today, because it aggregates the events the animals backend publishes; high-risk plants and germinal products notifications are not listed. Each signed-in organisation sees only its own notifications in that list.

## Requirements

### Requirement: The dashboard lists notifications from every status, identifying each one
**ID**: REQ-INS-DASH-001
The system MUST show, as the signed-in landing page, a list of notifications spanning every status — including SUBMITTED, DRAFT and AMEND — each row showing its reference number, status, origin country, commodity and arrival date and a 'View' link, and MUST NOT show a notification that has been soft-deleted.

#### Scenario: Notifications of every status appear together, deleted ones excluded
**ID**: SCN-INS-DASH-001-A
- **GIVEN** notifications exist in SUBMITTED, DRAFT, AMEND and soft-deleted states
- **WHEN** a signed-in user opens the dashboard
- **THEN** the SUBMITTED, DRAFT and AMEND notifications are all shown, each with its reference number and status
- **AND** the soft-deleted notification does not appear

#### Scenario: A row shows the notification's origin country, commodity and arrival date
**ID**: SCN-INS-DASH-001-B
- **GIVEN** a notification has been submitted with an arrival date entered
- **WHEN** a signed-in user opens the dashboard
- **THEN** its row shows its reference number, status, origin country, commodity and the arrival date entered
- **AND** its row offers a 'View' link

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

### Requirement: The dashboard paginates by the address book's rule, every link keeping the sort
**ID**: REQ-INS-DASH-004
The system MUST paginate the dashboard by the same rule as the address book (REQ-INS-ADDR-047). Every pagination link, 'Previous' and 'Next' included, MUST keep the chosen sort.

#### Scenario: A middle page of many keeps the sort in every pagination link
**ID**: SCN-INS-DASH-004-A
- **GIVEN** the dashboard, sorted by last updated oldest first, runs to 20 pages
- **WHEN** the user views page 10
- **THEN** the pagination shows 'Previous', page 1, an ellipsis, pages 9, 10 and 11, an ellipsis, page 20 and 'Next', with page 10 marked as the current page
- **AND** every pagination link, 'Previous' and 'Next' included, keeps the sort

### Requirement: The dashboard always offers Create new, opening the notification type question
**ID**: REQ-INS-DASH-005
The system MUST offer a "Create new" button under the dashboard heading and above the reference search and the notifications list, in every state of the dashboard, as the dashboard's one control for beginning a notification. Choosing it MUST open the "What are you importing?" question (`ins/notification-type`) with no option selected, before any notification exists.

#### Scenario: Starting from a dashboard that lists notifications asks what is being imported
**ID**: SCN-INS-DASH-005-A
- **GIVEN** notifications are listed on the dashboard
- **WHEN** the user chooses "Create new"
- **THEN** the question "What are you importing?" is shown
- **AND** no option is selected and the second option is Plants for planting

#### Scenario: Starting from an empty dashboard asks the same question
**ID**: SCN-INS-DASH-005-B
- **GIVEN** the organisation has no notifications
- **WHEN** the dashboard is shown
- **THEN** "Create new" is still offered
- **AND** choosing it shows the question "What are you importing?"

#### Scenario: Create new is still offered after a search that matches nothing
**ID**: SCN-INS-DASH-005-C
- **GIVEN** the user searches for a reference number that matches no notification
- **WHEN** the "No notifications found" message is shown
- **THEN** "Create new" is still offered
- **AND** choosing it shows the question "What are you importing?"

#### Scenario: Create new is still offered when the notifications cannot be loaded
**ID**: SCN-INS-DASH-005-D
- **GIVEN** the notifications list cannot be loaded
- **WHEN** the dashboard is shown with "Sorry, there is a problem with the service. Try again in a few minutes."
- **THEN** "Create new" is still offered under the dashboard heading

### Requirement: The dashboard lists only notifications owned by the caller's organisation
**ID**: REQ-INS-DASH-006
The INS backend MUST scope `GET /notifications` to the organisation named in `Trade-Imports-Organisation-Id`, and the dashboard MUST pass the signed-in organisation on every list call, so another organisation's notifications never appear in the paginated result or in a reference search.

#### Scenario: Another organisation's submitted notification is absent from the list
**ID**: SCN-INS-DASH-006-A
- **GIVEN** organisation A has submitted a notification that appears in the aggregated read model
- **WHEN** organisation B requests the notification list or searches by organisation A's reference
- **THEN** the list contains no notifications owned by organisation A
