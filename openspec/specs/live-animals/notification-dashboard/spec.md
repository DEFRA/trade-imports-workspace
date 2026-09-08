# Notification Dashboard Specification

## Purpose

Lets an importer or agent search, sort, and manage submitted and draft animal-notification records from a single list view, and start a new one.

## Requirements

### Requirement: The dashboard is where the service opens, and where a new notification starts
**ID**: REQ-DASH-001
The system MUST show the notification dashboard as the service's landing page for a signed-in user, and MUST offer a way to start a new notification, opening it at the journey's entry page.

#### Scenario: A signed-in user lands on the notification dashboard
**ID**: SCN-DASH-001-A
- **GIVEN** the user is signed in
- **WHEN** they open the service
- **THEN** the notification dashboard is shown

#### Scenario: Starting a new notification opens the journey's entry page
**ID**: SCN-DASH-001-B
- **GIVEN** the user is on the notification dashboard
- **WHEN** they choose to create a new notification
- **THEN** the journey's entry page, asking the origin of the import, is shown

#### Scenario: A newly started notification is listed as a draft
**ID**: SCN-DASH-001-C
- **GIVEN** the user has started a new notification and been taken to its Overview
- **WHEN** they return to the dashboard and search for its reference number
- **THEN** its card is listed, showing a "Draft" status
- **AND** resume, copy and delete actions are offered on it

### Requirement: The dashboard lists notifications as cards with a result count
**ID**: REQ-DASH-002
The system MUST list the notifications matching the current view as cards, and MUST report how many results there are.

#### Scenario: The list shows a result count alongside the matching cards
**ID**: SCN-DASH-002-A
- **GIVEN** a notification exists
- **WHEN** the user searches the dashboard for its reference number
- **THEN** a result count is shown, alongside exactly one notification card

### Requirement: A notification card shows the notification's key details
**ID**: REQ-DASH-003
The system MUST show, on each notification card, the notification's reference number, its commodity, its origin, its consignor and consignee, its arrival date at destination, its status and the date it was created.

#### Scenario: A submitted notification's card shows its details
**ID**: SCN-DASH-003-A
- **GIVEN** a notification has been submitted
- **WHEN** the user searches the dashboard for its reference number
- **THEN** its card shows the reference number, the commodity, the origin, the consignor's and consignee's names, an arrival date at destination, a status of "Submitted", and the date it was created

### Requirement: The actions offered on a card depend on the notification's status
**ID**: REQ-DASH-004
The system MUST offer resume, copy and delete on a draft notification's card without offering amend, MUST offer view, copy and amend on a submitted notification's card, and MUST offer resume and cancel-amendment, in place of view and amend, on a card being amended.

#### Scenario: A draft notification's card offers resume, copy and delete
**ID**: SCN-DASH-004-A
- **GIVEN** a draft notification exists
- **WHEN** the user searches the dashboard for its reference number
- **THEN** its card shows a "Draft" status, offering resume, copy and delete actions
- **AND** no amend action is offered

#### Scenario: A submitted notification's card offers view, copy and amend
**ID**: SCN-DASH-004-B
- **GIVEN** a submitted notification exists
- **WHEN** the user searches the dashboard for its reference number
- **THEN** its card shows a "Submitted" status, offering view, copy and amend actions

#### Scenario: A notification being amended offers resume and cancel-amendment
**ID**: SCN-DASH-004-C
- **GIVEN** an amendment has been started on a submitted notification
- **WHEN** the user searches the dashboard for its reference number
- **THEN** its card shows an "Amending" status, offering resume and cancel-amendment actions

### Requirement: Copying a notification from its dashboard card opens a new draft under its own reference
**ID**: REQ-DASH-005
The system MUST open a new draft when the user copies a notification from its dashboard card, carrying a newly minted reference number distinct from the original's.

#### Scenario: Copying from a card opens a distinct new draft
**ID**: SCN-DASH-005-A
- **GIVEN** a submitted notification has been found by searching the dashboard
- **WHEN** the user copies it as new from its card
- **THEN** a new draft opens at Overview, carrying its own reference number, different from the original's

### Requirement: The notification list is paged twenty-five at a time
**ID**: REQ-DASH-006
The system MUST page the notification list at twenty-five notifications per page, MUST report the range being shown out of the total, and MUST offer next and previous links that move between pages showing different notifications.

#### Scenario: A list longer than one page is paged and reports its range
**ID**: SCN-DASH-006-A
- **GIVEN** more than twenty-five notifications are listed on the dashboard
- **WHEN** the user views the first page
- **THEN** it reports showing 1 to 25 of the total number of results, and offers a next-page link
- **WHEN** they follow the next-page link
- **THEN** the second page opens, reporting a range starting at 26, offering a previous-page link
- **AND** the first notification listed differs from the one at the top of the first page

### Requirement: A user can search the dashboard by reference number
**ID**: REQ-DASH-007
The system MUST let a user search the notification dashboard by reference number, and MUST show only notifications whose reference matches.

#### Scenario: Search form is available on the dashboard
**ID**: SCN-DASH-007-A
- **GIVEN** a user has the notification dashboard open
- **WHEN** the page loads
- **THEN** a "Filter notifications" search form is shown, with a reference-number input and a Search button

#### Scenario: Searching by a complete reference number returns the matching notification
**ID**: SCN-DASH-007-B
- **GIVEN** a submitted notification exists with a known reference number
- **WHEN** the user searches the dashboard using that complete reference number
- **THEN** the URL carries the searched reference number as a query parameter
- **AND** exactly one notification card is shown, for that reference number
- **AND** the results label reads "Showing 1 Result"

#### Scenario: Viewing a result found by reference-number search opens that notification
**ID**: SCN-DASH-007-C
- **GIVEN** a reference-number search has returned exactly one matching notification
- **WHEN** the user selects View on that result
- **THEN** the notification view page opens at the URL for that reference number
- **AND** the page heading and reference-number caption are shown

#### Scenario: An unmatched reference number shows no results
**ID**: SCN-DASH-007-D
- **GIVEN** no notification exists with the searched reference number
- **WHEN** the user searches the dashboard using that reference number
- **THEN** no notification cards are shown
- **AND** the results label reads "No notifications found"

#### Scenario: Free-text search is treated as a search with no matches, not an invalid input
**ID**: SCN-DASH-007-E
- **GIVEN** the user enters text that is not shaped like a reference number
- **WHEN** they submit the search
- **THEN** no notification cards are shown
- **AND** the results label reads "No notifications found"
- **AND** no validation error is shown

### Requirement: A reference-number search survives sorting and paging
**ID**: REQ-DASH-008
The system MUST keep an active reference-number search in the URL when the user changes the sort order or navigates by page.

#### Scenario: Changing sort order keeps the active reference-number search
**ID**: SCN-DASH-008-A
- **GIVEN** the user has searched the dashboard by reference number
- **WHEN** they then change the sort order
- **THEN** the URL still carries the searched reference number
- **AND** the URL carries the new sort parameter
- **AND** the search input still shows the searched reference number

#### Scenario: A page parameter in the URL does not clear an active reference-number search
**ID**: SCN-DASH-008-B
- **GIVEN** the user has searched the dashboard by reference number with no matches
- **WHEN** they navigate directly to a URL that adds a page parameter
- **THEN** the URL still carries the searched reference number
- **AND** the search input still shows the searched reference number

### Requirement: The notification list can be ordered four ways, newest arrival first by default
**ID**: REQ-DASH-009
The system MUST offer the user four ways to order the notification list, defaulting to arrival date with the newest first.

#### Scenario: Default sort order is arrival date, newest first
**ID**: SCN-DASH-009-A
- **GIVEN** a user opens the notification dashboard
- **WHEN** the page loads
- **THEN** the sort dropdown's selected option is "Arrival (newest to oldest)"

#### Scenario: Sort dropdown offers all four expected orderings
**ID**: SCN-DASH-009-B
- **GIVEN** a user opens the notification dashboard
- **WHEN** they open the sort dropdown
- **THEN** it lists exactly four options, in order: Arrival (newest to oldest), Arrival (oldest to newest), Date created (newest to oldest), Date created (oldest to newest)

#### Scenario: Selecting a sort option resubmits the list without error
**ID**: SCN-DASH-009-C
- **GIVEN** a user opens the notification dashboard
- **WHEN** they select any of the four sort options
- **THEN** the URL carries the chosen sort parameter
- **AND** the dashboard heading is still shown, with no error

### Requirement: Deleting a notification asks for confirmation, and removes it from the dashboard once confirmed
**ID**: REQ-DASH-010
The system MUST ask the user to confirm before deleting a notification, MUST leave it untouched if they decline, and MUST remove a confirmed deletion from the dashboard's search results.

#### Scenario: Declining the delete confirmation leaves the notification untouched
**ID**: SCN-DASH-010-A
- **GIVEN** a user is on a notification's own delete confirmation page
- **WHEN** they decline instead of confirming
- **THEN** they return to the dashboard, and the notification is still listed

#### Scenario: Confirming deletion shows a confirmation message
**ID**: SCN-DASH-010-B
- **GIVEN** a user is on a notification's own delete page
- **WHEN** they confirm "Yes, delete notification"
- **THEN** a message confirms the notification has been deleted

#### Scenario: A deleted notification no longer appears in a dashboard search
**ID**: SCN-DASH-010-C
- **GIVEN** a submitted notification has been deleted
- **WHEN** the user searches the dashboard for that notification's reference number
- **THEN** no notification cards are shown

### Requirement: An empty dashboard explains that no notifications exist yet
**ID**: REQ-DASH-011
The system MUST show explanatory text and an empty-state message when the user has no notifications at all, in place of a results list.

#### Scenario: A user with no notifications sees an empty state
**ID**: SCN-DASH-011-A
- **GIVEN** the user has never started a notification
- **WHEN** they open the dashboard
- **THEN** it shows explanatory text about the service and an empty-state message, in place of any results

### Requirement: The service tells the user it is in an alpha phase, and offers a route to feedback
**ID**: REQ-DASH-012
The system MUST show an "Alpha" tag and a message that the service is new and asking for feedback, on the dashboard and on every page of a notification, with a feedback route by email.

#### Scenario: The dashboard carries the alpha banner
**ID**: SCN-DASH-012-A
- **GIVEN** the user opens the dashboard
- **WHEN** the page is shown
- **THEN** an "Alpha" tag and a feedback message are shown, with a working feedback email link

#### Scenario: The alpha banner follows onto a notification's pages
**ID**: SCN-DASH-012-B
- **GIVEN** the user has started a notification
- **WHEN** they view one of its pages
- **THEN** the "Alpha" tag and feedback link are still shown
