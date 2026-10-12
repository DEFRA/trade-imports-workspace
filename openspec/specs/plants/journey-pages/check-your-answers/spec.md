# Check Your Answers Page Specification

## Purpose

The page on which a whole high-risk plants notification is read back before submission, and read again once submitted. The page is titled "Check your answers" while a notification is being amended. A draft's check answers and a submitted notification's read-only view are headed and titled by its reference number instead.

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

### Requirement: A draft notification invites submission and offers Delete notification in its header
**ID**: REQ-PLANTS-CYA-006
The system MUST invite the user to submit a draft notification with a continue action under a "Now submit your notification" heading, keeping "Save and return to overview" and the Cancel link. It MUST offer a red "Delete notification" in the header that opens the delete page, not beside Continue, and MUST NOT offer "Copy as new" or cancel-amendment. Lateness warnings are governed by `plants/journey-obligations/review`.

#### Scenario: The draft view invites submission and offers delete in its header
**ID**: SCN-PLANTS-CYA-006-A
- **GIVEN** a draft notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** it invites them to continue to the declaration to submit
- **AND** a red "Delete notification" stands in its header and not beside "Continue", with "Save and return to overview" and the Cancel link at the foot
- **AND** no "Copy as new" or cancel-amendment action is offered

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

### Requirement: A submitted notification is read-only and offers Amend this notification and Delete notification in its header
**ID**: REQ-PLANTS-CYA-008
The system MUST show a submitted notification read-only, with no Change links and no continue action. It MUST offer in the header a primary "Amend this notification" button that submits a form, and a red "Delete notification" button that leads to the delete page, not at the foot. It MUST NOT offer "Copy as new", or cancel-amendment while no amendment is in progress. What delete does is owned by `plants/notification-lifecycle`.

#### Scenario: The submitted view is read-only and offers delete
**ID**: SCN-PLANTS-CYA-008-A
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** the status shown is "Submitted"
- **AND** no Change links and no continue action are offered
- **AND** "Amend this notification" and a red "Delete notification" are offered in its header, and no "Copy as new" or cancel-amendment action is shown

#### Scenario: A submitted notification can be deleted from check-your-answers
**ID**: SCN-PLANTS-CYA-008-B
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user deletes it and confirms
- **THEN** they return to the dashboard with the notification no longer listed
- **AND** a deleted banner is shown

#### Scenario: Amend this notification starts an amendment
**ID**: SCN-PLANTS-CYA-008-C
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user chooses "Amend this notification"
- **THEN** the notification is being amended

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

### Requirement: A back link and a save-and-return action open Overview from the review; the submitted view's back link opens the notification list
**ID**: REQ-PLANTS-CYA-010
The system MUST return the user to Overview when they follow the back link or choose save and return from check-your-answers for a draft or an amendment, and MUST take them to the plants notification list when they follow the back link from a submitted notification's read-only view.

#### Scenario: Back and save-and-return open Overview
**ID**: SCN-PLANTS-CYA-010-A
- **GIVEN** the user is on check-your-answers for a draft
- **WHEN** they follow the back link, or choose save and return
- **THEN** Overview is shown

#### Scenario: The submitted view's back link opens the notification list
**ID**: SCN-PLANTS-CYA-010-B
- **GIVEN** a submitted notification's read-only view is open
- **WHEN** the user follows the back link
- **THEN** the plants notification list is shown

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

### Requirement: A submitted notification's read-only view and a draft's check answers are headed by the reference and status, and dated
**ID**: REQ-PLANTS-CYA-014
A submitted notification's read-only view and a draft's check answers MUST be headed and titled by the notification's reference in place of "Check your answers", with its status as a tag and no status bar. Under the heading they MUST show the UK day the notification was submitted ("Date submitted: <d Month yyyy>") or, for a draft, created ("Date created: <d Month yyyy>"). An amendment MUST keep its "Check your answers" heading, title and status bar.

#### Scenario: The submitted view is headed by its reference with a Submitted tag
**ID**: SCN-PLANTS-CYA-014-A
- **GIVEN** a notification that has been submitted
- **WHEN** the user opens its read-only view
- **THEN** the page heading is the notification's reference number
- **AND** a "Submitted" tag stands beside it
- **AND** no status bar is shown

#### Scenario: The submitted view's browser title starts with its reference
**ID**: SCN-PLANTS-CYA-014-B
- **GIVEN** a notification that has been submitted
- **WHEN** the user opens its read-only view
- **THEN** the browser title starts with the reference, before the service name

#### Scenario: The submitted view shows the date it was submitted
**ID**: SCN-PLANTS-CYA-014-C
- **GIVEN** a notification submitted at 23:30 UTC on 21 July 2026
- **WHEN** the user opens its read-only view
- **THEN** under the heading it reads "Date submitted: 22 July 2026"

#### Scenario: A draft's check answers is headed by its reference with a Draft tag
**ID**: SCN-PLANTS-CYA-014-D
- **GIVEN** a draft notification
- **WHEN** the user opens its check-your-answers
- **THEN** the page heading is the notification's reference number
- **AND** a "Draft" tag stands beside it
- **AND** no status bar is shown
- **AND** the browser title starts with the reference

#### Scenario: A draft's check answers shows the date it was created
**ID**: SCN-PLANTS-CYA-014-E
- **GIVEN** a draft created at 23:30 UTC on 21 July 2026
- **WHEN** the user opens its check-your-answers
- **THEN** under the heading it reads "Date created: 22 July 2026"

#### Scenario: An amendment's check answers keeps its heading and status bar
**ID**: SCN-PLANTS-CYA-014-F
- **GIVEN** a notification is being amended
- **WHEN** the user views check-your-answers
- **THEN** the page heading and browser title are "Check your answers"
- **AND** the status bar is shown

### Requirement: Opening the view of a notification that does not exist goes to the notification list
**ID**: REQ-PLANTS-CYA-015
The system MUST send the user to the plants notification list when they open the view of a notification that does not exist.

#### Scenario: An unknown notification's view opens the notification list
**ID**: SCN-PLANTS-CYA-015-A
- **GIVEN** no notification has the reference GBN-HRP-00-000000
- **WHEN** the user opens that notification's view
- **THEN** the plants notification list is shown

### Requirement: A submitted notification's read-only view and a draft's check answers show the notification reference as text to copy
**ID**: REQ-PLANTS-CYA-016
On a submitted notification's read-only view or a draft's check answers, the system MUST show an "Import reference numbers" section with the warning "You must use the correct reference and code on the customs declaration or your consignment will be delayed." and a "Notification reference" row with the reference, as plain text the user can select with JavaScript on or off. It MUST NOT show a "Customs document code" row or any "Copy" button.

#### Scenario: The submitted view shows its notification reference
**ID**: SCN-PLANTS-CYA-016-A
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** an "Import reference numbers" section shows the warning "You must use the correct reference and code on the customs declaration or your consignment will be delayed."
- **AND** it holds a "Notification reference" row reading the notification's reference

#### Scenario: Without JavaScript the reference reads as plain text, with no customs document code and no Copy button
**ID**: SCN-PLANTS-CYA-016-B
- **GIVEN** JavaScript is off
- **WHEN** the user opens a submitted notification's view
- **THEN** the notification reference is shown as text
- **AND** no "Customs document code" row is shown
- **AND** no "Copy" button is shown

#### Scenario: A draft's check answers shows its notification reference
**ID**: SCN-PLANTS-CYA-016-C
- **GIVEN** a draft notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** an "Import reference numbers" section shows the warning "You must use the correct reference and code on the customs declaration or your consignment will be delayed."
- **AND** it holds a "Notification reference" row reading the notification's reference
- **AND** no "Customs document code" row and no "Copy" button is shown

### Requirement: The error summary names each task still to complete as "Complete <task>", once, after any origin or address error
**ID**: REQ-PLANTS-CYA-017
Each task still to complete MUST be named in the error summary as "Complete what you are importing", "Complete where this consignment is coming from", "Complete arrival details", "Complete place of destination", "Complete consignor or exporter", "Complete identification numbers" or "Complete contact address for consignment". Any country-of-origin or removed-address error MUST be listed first, then the tasks in Overview order. A task already named by such an error MUST NOT be named again.

#### Scenario: An unfinished draft names the missing contact as a task to complete
**ID**: SCN-PLANTS-CYA-017-A
- **GIVEN** a draft notification complete except for its contact address
- **WHEN** the user views check-your-answers
- **THEN** the error summary reads "Complete contact address for consignment"

#### Scenario: A removed destination is named once
**ID**: SCN-PLANTS-CYA-017-B
- **GIVEN** a complete draft whose place-of-destination address has been removed from the address book
- **WHEN** the user continues from check-your-answers
- **THEN** the error summary names "Select an address for the place of destination"
- **AND** it does not also name "Complete place of destination"
