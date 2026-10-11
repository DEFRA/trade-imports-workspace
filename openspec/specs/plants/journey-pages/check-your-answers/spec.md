# Check Your Answers Page Specification

## Purpose

The page on which a whole high-risk plants notification is read back before submission, and read again once submitted. The page is titled "Check your answers".

## Requirements

### Requirement: Check-your-answers numbers three sections over the answers it renders
**ID**: REQ-PLANTS-CYA-001
The system MUST group the page under three numbered section headings — About the consignment, Arrival and destination, and Consignment parties — showing the entered values as cards under those headings.

#### Scenario: Check-your-answers shows the three numbered sections
**ID**: SCN-PLANTS-CYA-001-A
- **GIVEN** the user has completed every section of a potato notification
- **WHEN** they view check-your-answers
- **THEN** the numbered section headings read "1. About the consignment", "2. Arrival and destination" and "3. Consignment parties"

#### Scenario: A fully answered notification's check-your-answers reflects entered values
**ID**: SCN-PLANTS-CYA-001-B
- **GIVEN** the user has completed every section of a notification and submitted it
- **WHEN** they view the read-only check-your-answers
- **THEN** cards show the country of origin, each commodity line's details, the arrival date, the Place of destination, identification numbers and the contact

### Requirement: Cards that do not apply to the commodity type are omitted
**ID**: REQ-PLANTS-CYA-002
The system MUST omit the consignor-or-exporter card for a potatoes notification, and MUST show it when the commodity type is plants for planting or wood and cut trees.

#### Scenario: A potatoes notification omits the consignor card
**ID**: SCN-PLANTS-CYA-002-A
- **GIVEN** a potatoes notification is open on check-your-answers
- **WHEN** the user reads the Consignment parties section
- **THEN** no "Consignor or exporter" card is shown

#### Scenario: A plants-for-planting notification shows the consignor card
**ID**: SCN-PLANTS-CYA-002-B
- **GIVEN** a plants-for-planting notification has a consignor selected
- **WHEN** the user views check-your-answers after submission
- **THEN** the "Consignor or exporter" card shows that party's name

### Requirement: The party cards read the address line by line, with no telephone number or email address
**ID**: REQ-PLANTS-CYA-003
The system MUST show, on the Place of destination, Consignor or exporter and Contact cards, a "Name" row with the selected party's name and an "Address" row reading each address line on its own line followed by the country on its own line, and MUST NOT show a "Telephone number" or "Email address" row.

#### Scenario: The Contact card reads the contact's address line by line
**ID**: SCN-PLANTS-CYA-003-A
- **GIVEN** a notification has a consignment contact selected
- **WHEN** the user views check-your-answers
- **THEN** the Contact card has only "Name" and "Address" rows, the Address row reading each address line on its own line and then the country, and no telephone number or email address is shown

#### Scenario: The Place of destination card reads the address line by line
**ID**: SCN-PLANTS-CYA-003-B
- **GIVEN** a notification has a place of destination selected
- **WHEN** the user views check-your-answers
- **THEN** the Place of destination card has only "Name" and "Address" rows, the Address row reading each address line on its own line and then the country

#### Scenario: The Consignor or exporter card has no telephone or email row
**ID**: SCN-PLANTS-CYA-003-C
- **GIVEN** a plants-for-planting notification has a consignor selected
- **WHEN** the user views check-your-answers
- **THEN** the Consignor or exporter card has only "Name" and "Address" rows

### Requirement: Anything not yet answered, or whose address no longer resolves, is shown as "Not provided"
**ID**: REQ-PLANTS-CYA-004
The system MUST show "Not provided" against any field or party role that has not yet been answered, and MUST show "Not provided" for a previously selected party whose address no longer resolves. An unanswered role MUST NOT be shown as an error — an error is reserved for a role whose linked address no longer resolves, as governed by `plants/journey-obligations/review`.

#### Scenario: An unanswered destination reads Not provided, with no address error, and is named as outstanding
**ID**: SCN-PLANTS-CYA-004-A
- **GIVEN** a notification whose place of destination has never been answered
- **WHEN** the user views check-your-answers
- **THEN** the destination card's rows each read "Not provided", no address error is shown against it, and the error summary names the place of destination as a task still to complete

#### Scenario: A deleted destination reads Not provided on every row
**ID**: SCN-PLANTS-CYA-004-B
- **GIVEN** a complete draft notification is open on check-your-answers
- **WHEN** the place-of-destination address is removed from the address book and the page is reloaded
- **THEN** the Place of destination card's rows each read "Not provided", and the removed party's name is not shown

### Requirement: A Change link returns to check-your-answers
**ID**: REQ-PLANTS-CYA-005
The system MUST return the user to check-your-answers after saving an answer edited via its Change link, even where answering that question during the normal flow would continue to a different page. For a notification being amended, that save is the page's "Save and return".

#### Scenario: Editing an answer via Change returns to check-your-answers with the new value
**ID**: SCN-PLANTS-CYA-005-A
- **GIVEN** the user is on check-your-answers
- **WHEN** they follow a Change link for country of origin, choose a different country and save
- **THEN** they return to check-your-answers, showing the new country
- **WHEN** they follow a Change link for a commodity line, change its quantity and save through the commodities list
- **THEN** they return to check-your-answers, showing the new quantity

### Requirement: A draft notification invites submission and offers delete beside Continue
**ID**: REQ-PLANTS-CYA-006
The system MUST invite the user to submit a draft notification, offering a continue action under a "Now submit your notification" heading, and MUST offer beside it a red "Delete notification" that opens the notification's delete page, keeping "Save and return to overview" and the Cancel link. It MUST NOT offer cancel-amendment while the notification is still a draft. How lateness is warned on a draft is governed by `plants/journey-obligations/review`.

#### Scenario: The draft view invites submission and offers delete beside Continue
**ID**: SCN-PLANTS-CYA-006-A
- **GIVEN** a draft notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** it invites them to continue to the declaration to submit
- **AND** a red "Delete notification" stands beside "Continue", with "Save and return to overview" and the Cancel link
- **AND** no cancel-amendment action is offered

#### Scenario: Delete notification on a draft opens the delete page
**ID**: SCN-PLANTS-CYA-006-B
- **GIVEN** a draft notification is open on check-your-answers
- **WHEN** the user selects "Delete notification"
- **THEN** the delete page for that notification opens

### Requirement: Continuing from a ready draft moves on to the declaration
**ID**: REQ-PLANTS-CYA-007
The system MUST take the user from a draft notification's check-your-answers to the declaration page when they continue, once every task is ready and no continue-blocking error applies.

#### Scenario: Continuing opens the declaration
**ID**: SCN-PLANTS-CYA-007-A
- **GIVEN** a draft notification is open on check-your-answers, with every task ready
- **WHEN** the user continues
- **THEN** the declaration page opens

### Requirement: A submitted notification is read-only and offers delete
**ID**: REQ-PLANTS-CYA-008
The system MUST show a submitted notification read-only — with no Change links and no continue action — and MUST offer a delete action. What delete does is owned by `plants/notification-lifecycle`. Cancel-amendment MUST NOT be offered while no amendment is in progress.

#### Scenario: The submitted view is read-only and offers delete
**ID**: SCN-PLANTS-CYA-008-A
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** the status shown is "Submitted"
- **AND** no Change links and no continue action are offered
- **AND** a delete action is offered, and no cancel-amendment action is shown

#### Scenario: A submitted notification can be deleted from check-your-answers
**ID**: SCN-PLANTS-CYA-008-B
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user deletes it and confirms
- **THEN** they return to the dashboard with the notification no longer listed
- **AND** a deleted banner is shown

### Requirement: An amending notification offers cancel-amendment instead of delete
**ID**: REQ-PLANTS-CYA-009
The system MUST offer "Cancel amend" on check-your-answers while a notification is being amended as a secondary button beside Continue that opens the cancel-amendment confirmation, MUST NOT offer it in the status bar on this page, and MUST NOT offer delete in that state. What cancel-amendment does is owned by `plants/notification-lifecycle`.

#### Scenario: Cancel amendment is offered only while amending
**ID**: SCN-PLANTS-CYA-009-A
- **GIVEN** a notification is being amended
- **WHEN** the user views check-your-answers
- **THEN** "Cancel amend" is offered as a secondary button beside "Continue"
- **AND** the status bar offers no "Cancel amend"
- **AND** no delete action is offered

#### Scenario: Cancelling an amendment from check-your-answers restores the submitted answers
**ID**: SCN-PLANTS-CYA-009-B
- **GIVEN** a notification is being amended with an edited identification number
- **WHEN** the user cancels the amendment from check-your-answers and confirms
- **THEN** they return to a read-only check-your-answers showing the previously submitted answers
- **AND** a success banner explains the amendment was cancelled
- **AND** the discarded edit is not shown

### Requirement: A back link and a save-and-return action open Overview
**ID**: REQ-PLANTS-CYA-010
The system MUST return the user to Overview when they follow the back link or choose save and return from check-your-answers.

#### Scenario: Back and save-and-return open Overview
**ID**: SCN-PLANTS-CYA-010-A
- **GIVEN** the user is on check-your-answers
- **WHEN** they follow the back link, or choose save and return
- **THEN** Overview is shown

### Requirement: A draft that would be late shows a warning; a submitted late notification shows a banner
**ID**: REQ-PLANTS-CYA-011
The system MUST warn on a draft check-your-answers when submitting today would be late, quoting the commodity type's timing rule, and MUST show a late banner on the read-only view when the notification was recorded late at first submission. The timing rules and the recorded flag are governed by `plants/journey-obligations/review`.

#### Scenario: A draft that would be late shows the pre-submit warning
**ID**: SCN-PLANTS-CYA-011-A
- **GIVEN** a potato draft whose expected arrival is inside the two-day window
- **WHEN** the user views check-your-answers
- **THEN** a warning explains that submitting today will be late, quotes the potato rule, and says they can still submit it

#### Scenario: A submitted late notification shows the late banner on the read-only view
**ID**: SCN-PLANTS-CYA-011-B
- **GIVEN** a notification was submitted late
- **WHEN** the user views the read-only check-your-answers
- **THEN** a banner explains the notification was made outside the required timing
- **AND** an on-time submission shows no such banner

### Requirement: An unfinished draft names every outstanding task
**ID**: REQ-PLANTS-CYA-012
The system MUST show check-your-answers for a draft that is not yet complete, with an error summary naming each task still to complete and linking to that task's page, and MUST keep the user on the page when they continue while any task is outstanding.

#### Scenario: Viewing an unfinished notification names each outstanding task
**ID**: SCN-PLANTS-CYA-012-A
- **GIVEN** a draft notification with one or more tasks not yet complete
- **WHEN** the user views check-your-answers
- **THEN** an error summary titled "There is a problem" names each task not yet complete
- **AND** each entry links to that task's page, which returns to check-your-answers once saved

#### Scenario: Continuing from an unfinished notification is refused, keeping the user on the page
**ID**: SCN-PLANTS-CYA-012-B
- **GIVEN** a draft notification with a task still to complete is open on check-your-answers
- **WHEN** the user continues
- **THEN** they stay on check-your-answers, the error summary is shown and focus moves to it
- **AND** the declaration is not opened

### Requirement: An amendment's check-your-answers opens without errors and refuses an incomplete resubmission, saying why
**ID**: REQ-PLANTS-CYA-013
While a notification is being amended, the system MUST open check-your-answers with no error summary and no error message against any card or role. When the user continues while any answer is incomplete or breaks its rules, the system MUST keep them on check-your-answers, still amending and without opening the declaration, and MUST show the error summary naming what is missing.

#### Scenario: An incomplete amendment's review shows no error
**ID**: SCN-PLANTS-CYA-013-A
- **GIVEN** a notification being amended whose arrival date has been cleared and saved
- **WHEN** the user opens check-your-answers
- **THEN** no error summary and no error message is shown

#### Scenario: Continuing from an incomplete amendment is refused, naming what is missing
**ID**: SCN-PLANTS-CYA-013-B
- **GIVEN** a notification being amended whose arrival date has been cleared and saved
- **WHEN** the user continues
- **THEN** they stay on check-your-answers and the error summary names "Complete arrival details"
- **AND** the notification is still being amended
- **AND** the declaration is not opened
