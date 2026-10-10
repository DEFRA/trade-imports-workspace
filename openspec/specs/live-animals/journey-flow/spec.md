# Journey Flow Specification

## Purpose

How the journey moves from one page to the next: the order pages come in, when one is skipped, the opening sequence a newly created notification runs, and where a journey opened out of context is sent. Overview, the dashboard and the address-selection spoke are not steps in this order.

## Requirements

### Requirement: The journey is ordered as ten sections, each a sequence of pages
**ID**: REQ-FLOW-001
The system MUST order the journey as ten sections, and MUST offer each section's pages in a fixed sequence.

#### Scenario: The journey's sections run in a fixed order
**ID**: SCN-FLOW-001-A
- **GIVEN** a notification is being worked on
- **WHEN** its sections are followed from the start
- **THEN** they run in this order: the dashboard; origin of the import; what are you importing, main import reason and commodity details; identification details; additional details; upload documents; the County Parish Holding number and consignment addresses, the first saving back to the second; the transport pages; contact address; and finally check your answers, declaration and confirmation

#### Scenario: The transport section sequences its pages in order
**ID**: SCN-FLOW-001-B
- **GIVEN** a user is working through the transport section in the opening sequence
- **WHEN** they continue from each page in turn
- **THEN** they are offered arrival details, transited countries and the combined transporter list, in that order, skipping any that is not in scope
- **AND** the transporter type question and the two type-specific forms are not offered as steps of this section — they are reached only via "Add a transporter" from the combined list

### Requirement: These flow sections are not the same grouping as the Overview task rows
**ID**: REQ-FLOW-002
The system MUST treat the journey's flow sections and the Overview page's task rows as separate groupings: there are ten flow sections against twelve task rows, and a task row MUST NOT be assumed to correspond to the section a page is reached through. Overview groups its twelve task rows under six numbered headings, which is a third grouping again.

#### Scenario: A single task row spans pages the flow never offers as steps of its own
**ID**: SCN-FLOW-002-A
- **GIVEN** the transporter task row on Overview
- **WHEN** the user opens it
- **THEN** it covers the transporter type, the approved transporter search and the private transporter details together, though the flow offers none of the three as a step of its own — they are spokes off the transporter list, belonging to no section

### Requirement: Continuing from a page moves on only within its own Overview task, and otherwise returns to Overview
**ID**: REQ-FLOW-003
The system MUST, outside the opening sequence and outside a change made from check your answers, take the user, on continuing from a page, to the next page of that section that belongs to the same Overview task and whose conditions are met, skipping any that are not, and MUST otherwise return them to Overview — never on into a page another Overview task opens. The system MUST add no marker to a page's address, link or form to tell such a save.

#### Scenario: Continuing moves on only to a later page of the same task
**ID**: SCN-FLOW-003-A
- **GIVEN** the user is on a page whose Overview task holds a later page of the same section — the CPH number page, opened other than from its row
- **WHEN** they save and continue
- **THEN** they are taken to the consignment addresses page, the next page of that task

#### Scenario: Finishing the last page of a section returns to Overview
**ID**: SCN-FLOW-003-B
- **GIVEN** the user is on the last page of a section that is still in scope
- **WHEN** they save and continue
- **THEN** they return to Overview rather than continuing into another section

#### Scenario: A page opened from its Overview task returns to Overview rather than running on into the next task
**ID**: SCN-FLOW-003-C
- **GIVEN** the opening sequence has ended and the user opens what are you importing, main reason for import, arrival details or transit countries from its task on Overview
- **WHEN** they save and continue
- **THEN** Overview is shown, not commodity details, additional details, transit countries or the transporter list

#### Scenario: Roles and addresses opened from Overview returns to Overview, even for a consignment that needs a CPH number
**ID**: SCN-FLOW-003-D
- **GIVEN** a consignment that needs a CPH number and roles and addresses opened from its task on Overview
- **WHEN** the user saves and continues
- **THEN** Overview is shown, not the CPH number page

#### Scenario: A page opened from Overview has the same address as in the opening sequence
**ID**: SCN-FLOW-003-E
- **GIVEN** Overview
- **WHEN** the user opens any task
- **THEN** the page's address is the one the opening sequence uses, with nothing added to it or to the link to mark that it came from Overview
- **AND** saving and continuing returns to Overview

#### Scenario: Upload documents keeps its add-another round trip before returning to Overview
**ID**: SCN-FLOW-003-F
- **GIVEN** upload documents opened from Overview
- **WHEN** the user adds a document with "Save and add another"
- **THEN** they stay on upload documents with the document listed
- **WHEN** they save and continue
- **THEN** Overview is shown

#### Scenario: A task saved from Overview reads Complete on return
**ID**: SCN-FLOW-003-G
- **GIVEN** a task opened from Overview
- **WHEN** the user answers it so its answers pass the page's rules and saves and continues
- **THEN** Overview shows that task as Complete

#### Scenario: Commodity details opened from Overview returns to Overview rather than going on to identification details
**ID**: SCN-FLOW-003-H
- **GIVEN** the opening sequence has ended and the user opens commodity details from its task on Overview
- **WHEN** they save and continue
- **THEN** Overview is shown, not identification details

#### Scenario: Main import reason and additional details opened from Overview return to Overview
**ID**: SCN-FLOW-003-I
- **GIVEN** the opening sequence has ended and the user opens main reason for import or additional details from its task on Overview
- **WHEN** they save and continue
- **THEN** Overview is shown, not commodity details or arrival details

### Requirement: A page the hub links to directly offers both a discard-and-exit and a save-and-exit route back to Overview
**ID**: REQ-FLOW-004
Outside an amendment (REQ-FLOW-013), the system MUST let the user leave a page the hub links to directly either by discarding anything typed since it was last saved or by committing it, and MUST return to Overview either way. Saving and returning MUST save what was entered without refusing a required answer left blank, MUST still refuse an answer that breaks its own rule with that answer's error and save nothing, and MUST NOT relax Commodity details, which are checked before saving either way.

#### Scenario: Cancel and return to overview discards unsaved input
**ID**: SCN-FLOW-004-A
- **GIVEN** the user has typed into a field on a task page without saving
- **WHEN** they select "Cancel and return to overview"
- **THEN** they return to Overview, and re-opening the task page shows the field as it was before, not the discarded input

#### Scenario: Save and return to overview commits the input and returns to Overview
**ID**: SCN-FLOW-004-B
- **GIVEN** the user has typed into a field on a task page
- **WHEN** they select "Save and return to overview"
- **THEN** they return to Overview, and re-opening the task page shows the committed input

#### Scenario: Save and return to overview saves a page with a required answer missing
**ID**: SCN-FLOW-004-C
- **GIVEN** the Main import reason page with "Transit" chosen and its port of exit and destination country left blank
- **WHEN** the user selects "Save and return to overview"
- **THEN** they return to Overview with no error shown
- **AND** the Main reason for import task does not read "Complete"
- **AND** re-opening the page shows "Transit" chosen

#### Scenario: An answer that breaks its own rule is refused on save and return
**ID**: SCN-FLOW-004-D
- **GIVEN** the Arrival details page with an arrival date that names no day
- **WHEN** the user selects "Save and return to overview"
- **THEN** they stay on the page, which shows "Enter a real arrival date"
- **AND** nothing is saved

#### Scenario: Commodity details keeps its checks on save and return
**ID**: SCN-FLOW-004-E
- **GIVEN** the Commodity details page with the number of animals left blank
- **WHEN** the user selects "Save and return to overview"
- **THEN** they stay on the page, which shows "Enter the number of animals"
- **AND** nothing is saved

#### Scenario: While amending, the page ends as the amend ending describes
**ID**: SCN-FLOW-004-F
- **GIVEN** a notification being amended
- **WHEN** the user opens a page the hub links to directly
- **THEN** it ends as REQ-FLOW-013 describes, with "Save and return" and no "Cancel and return to overview"

### Requirement: A page is offered only once its prerequisites are answered and what it asks for is in scope
**ID**: REQ-FLOW-005
The system MUST offer a page only when every strictly-earlier answer it depends on has been given and at least one of the things it asks for is in scope for this notification, and MUST otherwise pass over it.

#### Scenario: A page whose prerequisites are unanswered is passed over
**ID**: SCN-FLOW-005-A
- **GIVEN** a notification whose earlier answers a later page depends on have not been given
- **WHEN** the journey reaches the point that page would be offered
- **THEN** the page is not offered, and the journey continues past it

### Requirement: Check your answers is open whatever the notification owes; the declaration and confirmation wait until every task row is ready
**ID**: REQ-FLOW-006
The system MUST show check your answers whatever the notification still owes, naming what is outstanding on a draft and naming nothing while it is being amended (`live-animals/journey-pages/check-your-answers` REQ-CYA-010), and MUST withhold the declaration and the confirmation, and the Check and submit row on Overview (no link, "Cannot start yet"), until every task row on Overview is ready, counting a row as ready when it is fulfilled, not applicable, or optional.

#### Scenario: Continuing from check your answers is refused while a task row is outstanding
**ID**: SCN-FLOW-006-A
- **GIVEN** a draft notification with a task row that is neither fulfilled, not applicable, nor optional
- **WHEN** the user continues from check your answers
- **THEN** they stay on check your answers, which names what is outstanding
- **AND** the declaration is not opened

#### Scenario: The review section opens once every row is fulfilled, not applicable or optional
**ID**: SCN-FLOW-006-B
- **GIVEN** a notification whose every task row is fulfilled, not applicable or optional
- **WHEN** the user goes to check their answers
- **THEN** check your answers is shown, leading on to the declaration and then the confirmation

#### Scenario: Check and submit on Overview is withheld while a task row is outstanding
**ID**: SCN-FLOW-006-C
- **GIVEN** a notification with a task row that is neither fulfilled, not applicable, nor optional
- **WHEN** the user views Overview
- **THEN** the Check and submit row cannot be started yet and offers no link

### Requirement: A notification created in this session runs an opening sequence covering the whole journey, ending on check your answers
**ID**: REQ-FLOW-007
The system MUST walk a newly created notification through an opening sequence covering the whole journey, skipping any step not in scope. The sequence MUST NOT offer the CPH number page as a step, MUST go to Overview from roles and addresses when every task is already complete, and MUST end on check your answers once the contact address is saved, complete or not; reaching either ends it. Its order is its own and MUST NOT be assumed to match the order of the flow sections in REQ-FLOW-001.

#### Scenario: A newly created notification is walked through the whole opening sequence to review
**ID**: SCN-FLOW-007-A
- **GIVEN** the user has just created a notification from the dashboard
- **WHEN** they save each page in turn, answering every step
- **THEN** they are taken through origin of the import, what are you importing, main reason for import, commodity details, identification details, additional details, arrival details, the transporter, upload documents, roles and addresses and the contact address, in that order
- **AND** they arrive at check your answers once the contact address is saved, without returning to Overview partway through

#### Scenario: An opening-sequence step not yet in scope is skipped
**ID**: SCN-FLOW-007-B
- **GIVEN** the user is in the opening sequence and the next step is not yet in scope
- **WHEN** they save the page they are on
- **THEN** they are taken to the next step that is in scope

#### Scenario: Revisiting an opening-sequence page after the run has finished does not resume it
**ID**: SCN-FLOW-007-C
- **GIVEN** the user has already completed the opening sequence for a notification and reached Overview or review
- **WHEN** they open one of the opening sequence's own pages again and save it
- **THEN** they return to Overview, not to whatever would be the next step of the sequence

#### Scenario: The reason for import is asked before the commodity details
**ID**: SCN-FLOW-007-D
- **GIVEN** the user is in the opening sequence on what are you importing
- **WHEN** they save a selection
- **THEN** main reason for import is shown
- **WHEN** they save the reason
- **THEN** commodity details is shown

#### Scenario: The CPH number page is never a step of the opening sequence
**ID**: SCN-FLOW-007-E
- **GIVEN** the user is in the opening sequence for a consignment that needs a CPH number
- **WHEN** they save roles and addresses
- **THEN** contact address for this consignment is shown, not the CPH number page

#### Scenario: Roles and addresses goes to Overview when nothing is outstanding
**ID**: SCN-FLOW-007-F
- **GIVEN** the user is in the opening sequence with every task already complete
- **WHEN** they save roles and addresses
- **THEN** Overview is shown

#### Scenario: The opening sequence ends on check your answers even when tasks are outstanding
**ID**: SCN-FLOW-007-G
- **GIVEN** the user is in the opening sequence with tasks outstanding
- **WHEN** they save the contact address
- **THEN** check your answers is shown, naming every unfinished card

#### Scenario: Commodity details goes on to identification details, or to additional details when nothing needs identifying
**ID**: SCN-FLOW-007-H
- **GIVEN** the user is in the opening sequence on commodity details, reached from main reason for import
- **WHEN** they save valid counts for a species that needs identifiers
- **THEN** identification details is shown
- **WHEN** instead no chosen species needs identifiers
- **THEN** additional details is shown

#### Scenario: Additional details follows identification details or commodity details, never the main import reason, and goes on to arrival details
**ID**: SCN-FLOW-007-I
- **GIVEN** the user is in the opening sequence
- **WHEN** they save commodity details for a consignment with a species that needs identifiers and then save identification details
- **THEN** additional details is shown
- **WHEN** instead no chosen species needs identifiers and they save commodity details
- **THEN** additional details is shown, without identification details
- **WHEN** they save additional details
- **THEN** arrival details is shown

### Requirement: A journey opened out of context is sent to its entry page
**ID**: REQ-FLOW-008
The system MUST send a user to the origin of the import page when they open a page of a journey that neither began its opening sequence in this session nor holds any answer the user has entered. The origin page and the pages beneath it MUST be exempt, so the redirect cannot loop, as MUST the actions taken against a notification from the dashboard — amending, cancelling an amendment, copying and deleting.

#### Scenario: A deep link to an unknown journey lands on the entry page
**ID**: SCN-FLOW-008-A
- **GIVEN** a link to a page deep inside a journey that this session did not create and that holds no answers the user entered
- **WHEN** the user opens it
- **THEN** they land on the origin of the import page for that journey

#### Scenario: A journey carrying answers the user entered opens where it was asked for
**ID**: SCN-FLOW-008-B
- **GIVEN** a link to a page inside a journey that already holds an answer the user entered
- **WHEN** the user opens it
- **THEN** that page is shown, rather than the entry page

### Requirement: Only answers the user entered count as starting a journey
**ID**: REQ-FLOW-009
The system MUST count only an answer the user gave when deciding whether a journey has been started, and MUST NOT count a value the system populated of its own accord, nor the declaration, which is held only for the length of the session.

#### Scenario: A journey holding only system-populated values is treated as unstarted
**ID**: SCN-FLOW-009-A
- **GIVEN** a journey this session did not create, holding no answers beyond values the system populated itself
- **WHEN** the user opens a page deep inside it
- **THEN** they are sent to the origin of the import page

### Requirement: A collection page reached by changing an answer stays in that context until its own finishing action
**ID**: REQ-FLOW-010
The system MUST keep the user on a collection page — one that holds several records, such as identification details or accompanying documents — reached by changing an answer from check your answers, across any add or remove they make there, rather than returning to check your answers after each one. Only the page's own finishing action MUST return them to check your answers, at which point it MUST show the change they made.

#### Scenario: Adding and removing identification records while changing stays on that page until finishing
**ID**: SCN-FLOW-010-A
- **GIVEN** the user has followed a Change link from check your answers to a commodity's identification records
- **WHEN** they remove a record and add a replacement, saving each in turn
- **THEN** they remain on the identification details page throughout
- **WHEN** they choose the page's finishing action
- **THEN** they return to check your answers, now showing the replacement record

#### Scenario: Adding a further document while changing stays on that page until finishing
**ID**: SCN-FLOW-010-B
- **GIVEN** the user has followed a Change link from check your answers to the accompanying documents
- **WHEN** they add a further document
- **THEN** they remain on the accompanying documents page, and the added document is shown there
- **WHEN** they choose the page's finishing action
- **THEN** they return to check your answers, now showing the added document

### Requirement: A journey reached out of context works from Overview rather than resuming the opening sequence
**ID**: REQ-FLOW-011
The system MUST NOT resume the opening sequence for a journey the user was redirected to the entry page for, and MUST return them to Overview when they save that page, so they continue by choosing tasks rather than being walked through the sequence.

#### Scenario: Saving the entry page after a redirect leads to Overview
**ID**: SCN-FLOW-011-A
- **GIVEN** the user was sent to the origin of the import page because the journey had no opening sequence in this session
- **WHEN** they save that page
- **THEN** they arrive at Overview, not the next step of the opening sequence

### Requirement: A page reached from another page, not from the hub directly, ends with only its primary action
**ID**: REQ-FLOW-012
The system MUST NOT offer a discard-and-exit or a save-and-exit route back to Overview on a page reached from another page rather than linked from the hub directly, and MUST instead let the user leave only the way they came in, once they complete that page's own primary action. While the notification is being amended, REQ-FLOW-013 governs how the page ends instead.

#### Scenario: A page reached via a detour offers only its primary action
**ID**: SCN-FLOW-012-A
- **GIVEN** the user has reached a page by following a link or action on another page, rather than a hub row
- **WHEN** the page is shown
- **THEN** only its primary save-and-continue action is offered, with no separate "Save and return to overview" or "Cancel and return to overview" control

### Requirement: While a notification is being amended, a page ends with Save and return, Save and continue and Save and return to overview
**ID**: REQ-FLOW-013
While a notification is being amended, the system MUST end each page the hub links to directly with a primary "Save and return" to the review, a secondary "Save and continue" that goes on as it does outside an amendment, and a link-styled "Save and return to overview", with no "Cancel and return to overview". The CPH number page, the role address pickers and the contact address page MUST end with the first two only. A page MUST keep its usual Back link and never link back to the review.

#### Scenario: A page opened from Overview while amending ends with the three amend controls
**ID**: SCN-FLOW-013-A
- **GIVEN** a notification being amended
- **WHEN** the user opens Arrival details from Overview
- **THEN** it ends with "Save and return", "Save and continue" and a link-styled "Save and return to overview"
- **AND** no "Cancel and return to overview" is offered
- **AND** its Back link goes to Overview

#### Scenario: Save and return from a Change link goes back to the review showing the changed answer
**ID**: SCN-FLOW-013-B
- **GIVEN** the review of a notification being amended
- **WHEN** the user follows "Change import details", changes the internal reference and selects "Save and return"
- **THEN** the review is shown with the new internal reference
- **AND** the origin page's Back link went to Overview, not the review

#### Scenario: Save and continue while amending goes on, not back to the review
**ID**: SCN-FLOW-013-C
- **GIVEN** the origin page opened from the review's Change link while amending
- **WHEN** the user selects "Save and continue"
- **THEN** Overview is shown, not the review

#### Scenario: The CPH number page, the address pickers and the contact address page offer two controls while amending
**ID**: SCN-FLOW-013-D
- **GIVEN** a notification being amended
- **WHEN** the user opens the CPH number page, an address picker or the contact address page
- **THEN** each ends with "Save and return" and "Save and continue" and no "Save and return to overview"
- **AND** "Save and return" on the CPH number page and on an address picker returns to the review

#### Scenario: Outside an amendment the CPH number page keeps its primary action alone
**ID**: SCN-FLOW-013-E
- **GIVEN** a draft notification
- **WHEN** the user opens the CPH number page
- **THEN** only "Save and continue" is offered
