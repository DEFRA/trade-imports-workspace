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
- **THEN** the sub-headings "Where is this consignment coming from?", "Commodity details" and "Additional details" appear inside numbered sections, with each species' card beneath "Commodity details", and none of them is a numbered section in its own right

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
The system MUST decide how to draw a blank by the card it sits in, not the field itself: on a card with nothing further owed it MUST write the blank out as "Not applicable", a settled answer; on a card still holding outstanding answers it MUST give the row no text at all, drawing it in the missing style with "Missing" announced in its place for a screen reader. The decision MUST apply to every blank row in a marked card alike, optional or not. The system MUST NOT raise a role error against a party role nobody has reached yet — that error is reserved for a role whose copied address breaks the address book's rules (REQ-ADDR-005).

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
The system MUST return the user to check-your-answers after saving an answer edited via its Change link, even where answering that question during the normal flow would continue to a different page. For a notification being amended, that save is the page's "Save and return".

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

### Requirement: A draft notification that is not yet ready is refused on the review page, named card by card
**ID**: REQ-CYA-007
The system MUST refuse to continue from the review of a draft while any card still holds outstanding answers, MUST keep the user on the review page, and MUST show an error summary titled "There is a problem" naming every unfinished card, each entry linking to its card, which MUST itself be marked with the same words. The summary MUST stand as soon as the page is opened, and MUST take focus after a refused attempt.

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
The system MUST offer copy-as-new and delete actions on the read-only view of a submitted notification, and MUST NOT offer cancel-amendment while no amendment is in progress, or a submit/continue action to submit it again.

#### Scenario: The submitted view offers the actions open to a submitted notification
**ID**: SCN-CYA-008-A
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** copy-as-new and delete actions are offered, and no cancel-amendment action is shown
- **AND** no submit or continue action is shown

### Requirement: Copying a submitted notification from this page opens a new draft under its own reference
**ID**: REQ-CYA-009
The system MUST open a new draft when the user copies a submitted notification from check-your-answers, carrying a newly minted reference number distinct from the original's.

#### Scenario: Copy as new opens a distinct new draft
**ID**: SCN-CYA-009-A
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user copies it as new
- **THEN** a new draft opens at Overview, carrying its own reference number, different from the original's

### Requirement: The review marks the uploaded-documents card while a document is still being scanned or was found infected, and refuses to continue while it is
**ID**: REQ-CYA-010
The system MUST mark the uploaded-documents card on a draft's review while any stored document is still being scanned or has been found infected — putting the infected message ahead of the still-scanning one — and MUST refuse to continue from the review while either is so, returning the user to the review with that error shown.

#### Scenario: Continuing while a document is still being scanned is refused, marking the uploaded-documents card on the review
**ID**: SCN-CYA-010-A
- **GIVEN** a ready draft notification is open on the review, and one of its documents is still being scanned
- **WHEN** the user continues
- **THEN** they are returned to the review, which marks the uploaded-documents card as still being scanned

#### Scenario: An infected document marks the uploaded-documents card in preference to one still scanning
**ID**: SCN-CYA-010-B
- **GIVEN** a ready draft notification is open on the review, and one of its documents has been found infected while another is still being scanned
- **WHEN** the user continues
- **THEN** they are returned to the review, which marks the uploaded-documents card as holding an infected document, not as still being scanned

### Requirement: Continuing is refused if the notification has changed since the review was shown
**ID**: REQ-CYA-011
The system MUST refuse to continue from the review to the declaration if the notification has changed since that review was shown — in another tab or by another user — and MUST return the user to the review showing the notification as it now stands, under a message that it has been updated since they opened it.

#### Scenario: A change made in another tab after the review was shown sends the user back to the review
**ID**: SCN-CYA-011-A
- **GIVEN** a ready draft notification is open on the review
- **AND** the notification is then changed in another tab
- **WHEN** the user continues from the review they already have open
- **THEN** the review is shown again with the changed answer, under a message that the notification has been updated since they opened it
- **AND** the declaration is not shown

### Requirement: An amendment that is not yet ready opens without an error and refuses Continue with one
**ID**: REQ-CYA-012
While a notification is being amended, the system MUST show the review with no error summary and no error message when it is opened, and MUST refuse Continue while any answer is incomplete or breaks its rules, keeping the user on the review, still amending and without opening the declaration, under an error summary titled "There is a problem" that names each reason and takes focus, as a draft's refused Continue does.

#### Scenario: An incomplete amendment's review opens with no error
**ID**: SCN-CYA-012-A
- **GIVEN** a notification being amended whose arrival date has been cleared and saved
- **WHEN** the user opens the review
- **THEN** no error summary and no error message is shown

#### Scenario: Continuing from an incomplete amendment stays on the review, naming what is missing
**ID**: SCN-CYA-012-B
- **GIVEN** a notification being amended whose arrival date has been cleared and saved
- **WHEN** the user continues
- **THEN** they stay on the review, under an error summary titled "There is a problem" that names the arrival details and takes focus
- **AND** the notification is still being amended
- **AND** the declaration is not opened

#### Scenario: Continuing from an amendment whose arrival date breaks its rule stays on the review, naming it
**ID**: SCN-CYA-012-C
- **GIVEN** a notification being amended whose arrival date at port has been changed to more than 6 months ahead
- **WHEN** the user continues on the review
- **THEN** they stay on the review, under an error summary that names the arrival details
- **AND** the notification is still being amended
- **AND** the declaration is not opened

### Requirement: Ports and destination countries read back exactly as they were offered
**ID**: REQ-CYA-013
The system MUST show the port of entry and the port of exit on the review exactly as the port was offered when it was chosen, reading "<port name> - <port code>", and MUST name a territory chosen as the destination country "<territory> (<country>)", as the destination country list does.

#### Scenario: The port of exit row reads the option the user chose
**ID**: SCN-CYA-013-A
- **GIVEN** a transit notification whose port of exit is Port of Dover
- **WHEN** the user views the review
- **THEN** the port of exit row reads "Port of Dover - GB DVR", the same text as the option they chose

#### Scenario: The port of entry row reads the port's name, a dash and its code
**ID**: SCN-CYA-013-B
- **GIVEN** a notification whose port of entry is Aberdeen Harbour
- **WHEN** the user views the review
- **THEN** the port of entry row reads "Aberdeen Harbour - GB ABD"

#### Scenario: A territory destination country is named with its country
**ID**: SCN-CYA-013-C
- **GIVEN** a transhipment notification whose destination country is Martinique
- **WHEN** the user views the review
- **THEN** the destination country row reads "Martinique (France)"

### Requirement: Continuing a draft is refused while it holds a species the reference data no longer lists
**ID**: REQ-CYA-014
The system MUST check a draft's chosen species against the commodity reference data when the user continues from the review, MUST refuse to continue while any chosen species is no longer listed under its commodity code — removed or renamed — naming each such species and its code, and MUST NOT make this check on a plain view of the review or on an amendment, whose submitted species keep the value they were sent with.

#### Scenario: A draft holding a species no longer listed is refused, naming it
**ID**: SCN-CYA-014-A
- **GIVEN** a complete draft holding a species the reference data no longer lists under its code
- **WHEN** the user continues from the review
- **THEN** the review is shown again with an error summary naming that species and its code, telling the user to choose the species again

#### Scenario: The species is not named before the user continues
**ID**: SCN-CYA-014-B
- **GIVEN** a complete draft holding a species the reference data no longer lists under its code
- **WHEN** the user views the review
- **THEN** no error summary is shown

#### Scenario: An amendment's species are not checked
**ID**: SCN-CYA-014-C
- **GIVEN** an amendment holding a species the reference data no longer lists under its code
- **WHEN** the user continues from the review
- **THEN** that species is not named as one to choose again
