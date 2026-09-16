# Check Your Answers Page Specification

## Purpose

The page on which a whole notification is read back before submission, and read again once submitted. The page is titled "Review your notification".

## Requirements

### Requirement: The review draws the same six numbered sections as Overview, in order, whatever the notification holds
**ID**: REQ-CYA-001
The system MUST group the page under the same six numbered section headings the Overview task list uses, MUST draw all six in that order however little the notification holds, and MUST head every card with a subsection heading of its own. Which cards stand within a section MAY depend on the notification — the commodity group waits on a commodity line, the transit-countries group on an overland arrival — but the six numbered sections themselves MUST NOT be dropped.

#### Scenario: The review draws all six numbered sections in order
**ID**: SCN-CYA-001-A
- **GIVEN** the user has just started a notification and answered nothing beyond the entry page
- **WHEN** they view the review
- **THEN** the numbered section headings read "1. About the consignment", "2. Description of the goods", "3. Transport and arrival", "4. Documents", "5. Consignment parties" and "6. Contact address", in that order

#### Scenario: Commodity and consignment detail appear within a section, not as numbered sections
**ID**: SCN-CYA-001-B
- **GIVEN** the user is viewing the review for a notification with commodities entered
- **WHEN** they read down the page
- **THEN** consignment details, commodity details and species appear as sub-headings inside a numbered section, not as numbered sections in their own right

#### Scenario: The Documents section stands even when nothing has been uploaded
**ID**: SCN-CYA-001-E
- **GIVEN** a notification with no documents uploaded
- **WHEN** the user views the review
- **THEN** the Documents section and its card are still shown, saying no documents have been added yet
- **AND** a Change route to the upload documents page is still offered

#### Scenario: A fully answered notification's check-your-answers reflects every entered value
**ID**: SCN-CYA-001-C
- **GIVEN** the user has answered every section of a notification except documents
- **WHEN** they view check-your-answers
- **THEN** each section shows cards of the entered values — for example the country of origin, the species and animal details entered, and the arrival details entered

#### Scenario: Check-your-answers lists every address role with its selected party
**ID**: SCN-CYA-001-D
- **GIVEN** the user has selected a party for each of the notification's address roles — place of origin, consignor, consignee, importer, and place of destination
- **WHEN** they view check-your-answers
- **THEN** the roles-and-addresses card lists all of them, each showing the selected party's name and country

### Requirement: A blank is written out as "Not applicable" on a settled card and marked missing on one still outstanding
**ID**: REQ-CYA-002
The system MUST decide how to draw a blank by the card it sits in, not the field itself: on a card with nothing further owed it MUST write the blank out as "Not applicable", a settled answer; on a card still holding outstanding answers it MUST give the row no text at all, drawing it in the missing style with "Missing" announced in its place for a screen reader. The decision MUST apply to every blank row in a marked card alike, optional or not. The system MUST NOT raise a role error against a party role nobody has reached yet — that error is reserved for a role whose linked address no longer resolves.

#### Scenario: A blank row is written out on a settled card and marked missing on an outstanding one
**ID**: SCN-CYA-002-A
- **GIVEN** the user has answered only the entry page of a notification
- **WHEN** they view the review
- **THEN** a blank row on a card with nothing further owed reads "Not applicable"
- **AND** a blank row on a card still holding outstanding answers carries no text at all, with "Missing" announced in its place
- **AND** every blank row in that marked card is drawn the same way, the optional ones included

#### Scenario: An unanswered party role is marked missing, with no role error shown
**ID**: SCN-CYA-002-B
- **GIVEN** a new notification whose party roles have not yet been answered
- **WHEN** the user views the review
- **THEN** each unanswered role is marked missing, and no role error is raised against it

### Requirement: A back link returns to Overview
**ID**: REQ-CYA-003
The system MUST return the user to Overview when they follow the back link from check-your-answers.

#### Scenario: The back link opens Overview
**ID**: SCN-CYA-003-A
- **GIVEN** the user is on check-your-answers
- **WHEN** they follow the back link
- **THEN** Overview is shown

### Requirement: A Change link returns to check-your-answers
**ID**: REQ-CYA-004
The system MUST return the user to check-your-answers after saving an answer edited via its Change link, even where answering that question during the normal flow would continue to a different page.

#### Scenario: Editing an answer via Change returns to check-your-answers with the new value
**ID**: SCN-CYA-004-A
- **GIVEN** the user is on check-your-answers
- **WHEN** they follow a Change link, edit the answer, and save it
- **THEN** they return to check-your-answers, showing the new value

### Requirement: A draft notification offers submission and none of the post-submission actions
**ID**: REQ-CYA-005
The system MUST invite the user to submit a draft notification, offering a continue action, and MUST NOT offer copy-as-new, delete, or cancel-amendment while it is still a draft.

#### Scenario: The draft view invites submission and withholds the post-submission actions
**ID**: SCN-CYA-005-A
- **GIVEN** a draft notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** it invites them to submit the notification, offering a continue action
- **AND** no copy-as-new, delete, or cancel-amendment action is offered

### Requirement: Continuing from a ready draft notification moves on to the declaration
**ID**: REQ-CYA-006
The system MUST take the user from a draft notification's check-your-answers to the declaration page when they continue, once every task is ready to submit.

#### Scenario: Continuing opens the declaration
**ID**: SCN-CYA-006-A
- **GIVEN** a draft notification is open on check-your-answers, with every task ready
- **WHEN** the user continues
- **THEN** the declaration page opens

### Requirement: A notification that is not yet ready is refused on the review page, named card by card
**ID**: REQ-CYA-007
The system MUST refuse to continue from the review while any card still holds outstanding answers, MUST keep the user on the review page, and MUST show an error summary titled "There is a problem" naming every unfinished card. Each summary entry MUST link to the card it names, and that card MUST itself be marked with the same words. The summary MUST stand as soon as the page is opened, not only once the user has tried to continue, and following a refused attempt MUST move focus to it.

#### Scenario: An unfinished review names every outstanding card and links to it
**ID**: SCN-CYA-007-A
- **GIVEN** a new notification is open on the review with cards still outstanding
- **WHEN** the user views the page
- **THEN** an error summary titled "There is a problem" names every unfinished card
- **AND** each entry links to the card it names, which is itself marked with the same words

#### Scenario: Continuing from an unfinished review is refused, keeping the user on the page
**ID**: SCN-CYA-007-B
- **GIVEN** a new notification is open on the review with cards still outstanding
- **WHEN** the user continues
- **THEN** they remain on the review page, the error summary is shown, and focus moves to it

### Requirement: A submitted notification offers copy-as-new and delete
**ID**: REQ-CYA-008
The system MUST offer copy-as-new and delete actions on the read-only view of a submitted notification, and MUST NOT offer cancel-amendment while no amendment is in progress.

#### Scenario: The submitted view offers the actions open to a submitted notification
**ID**: SCN-CYA-008-A
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** copy-as-new and delete actions are offered, and no cancel-amendment action is shown

### Requirement: Copying a submitted notification from this page opens a new draft under its own reference
**ID**: REQ-CYA-009
The system MUST open a new draft when the user copies a submitted notification from check-your-answers, carrying a newly minted reference number distinct from the original's.

#### Scenario: Copy as new opens a distinct new draft
**ID**: SCN-CYA-009-A
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user copies it as new
- **THEN** a new draft opens at Overview, carrying its own reference number, different from the original's
