# Journey Flow Specification

## Purpose

How the journey moves from one page to the next: the one order pages come in, when one is skipped, where a journey opened out of context is sent, and how a page ends while a notification is being amended. Overview, the dashboard and the address-selection spoke are not steps in this order.

## Requirements

### Requirement: The journey has one page order, the order Overview lists its tasks in
**ID**: REQ-FLOW-001
The system MUST give the journey one page order, the order Overview lists its tasks in, and MUST offer pages in that order whatever way the user reached them. Overview, the dashboard, the address pickers, the CPH number page and the transporter add pages are not steps in it.

#### Scenario: The journey's pages run in a fixed order
**ID**: SCN-FLOW-001-A
- **GIVEN** a notification being worked on
- **WHEN** its pages are followed from the start
- **THEN** they run in this order: Where is this consignment coming from?, What are you importing?, Main import reason, Commodity details, Identification details, Additional details, Arrival details, Transit countries, Transport details, Upload documents, Roles and addresses, Contact address for this consignment, and finally check your answers, the declaration and the confirmation
- **AND** Overview lists its tasks in the same order

#### Scenario: The transport pages are offered in order
**ID**: SCN-FLOW-001-B
**Signed off**: 2026-11-11
- **GIVEN** a user working through the transport pages
- **WHEN** they save each page in turn
- **THEN** they are offered arrival details, transited countries and the combined transporter list, in that order, skipping any that is not in scope
- **AND** the transporter type question and the two type-specific forms are not offered as steps — they are reached only via "Add a transporter" from the combined list

### Requirement: Saving and continuing goes to the next page that applies, whatever way the page was reached
**ID**: REQ-FLOW-003
The system MUST, on a valid Save and continue from a journey page, go to the next page in the journey's order that applies, skipping any that does not, and the last page that applies MUST go to check your answers whatever is owed. It MUST do so however the page was reached, and a Save and continue that leaves optional answers blank MUST still go on.

#### Scenario: The CPH number page goes on to Roles and addresses
**ID**: SCN-FLOW-003-A
- **GIVEN** the user is on the CPH number page
- **WHEN** they save and continue
- **THEN** they are taken to the consignment addresses page

#### Scenario: Contact address goes to check your answers whatever is owed
**ID**: SCN-FLOW-003-B
- **GIVEN** a notification with tasks outstanding and the contact address page open
- **WHEN** the user saves and continues, with or without a contact address chosen
- **THEN** check your answers is shown, naming what is outstanding

#### Scenario: What are you importing goes on to Main import reason
**ID**: SCN-FLOW-003-C
- **GIVEN** the user is on What are you importing?, reached from a new notification, from its task on Overview or from a reopened draft
- **WHEN** they save a selection and continue
- **THEN** Main import reason is shown

#### Scenario: Roles and addresses goes on to Contact address, never the CPH number page, even when complete
**ID**: SCN-FLOW-003-D
- **GIVEN** a consignment that needs a CPH number, every other task complete, and roles and addresses open
- **WHEN** the user saves and continues
- **THEN** Contact address for this consignment is shown, not the CPH number page

#### Scenario: A page opened from Overview has the same address as from any other start, plus only the mark that it was opened from Overview
**ID**: SCN-FLOW-003-E
- **GIVEN** Overview
- **WHEN** the user opens any task
- **THEN** the page's address is the one every start uses, plus only the mark that it was opened from Overview
- **AND** saving and continuing goes to the next page that applies

#### Scenario: Upload documents keeps its add-another round trip before going on
**ID**: SCN-FLOW-003-F
- **GIVEN** upload documents
- **WHEN** the user adds a document with "Save and add another"
- **THEN** they stay on upload documents with the document listed
- **WHEN** they save and continue
- **THEN** Roles and addresses is shown

#### Scenario: Commodity details goes on to identification details, or to additional details when nothing needs identifying
**ID**: SCN-FLOW-003-H
- **GIVEN** the user is on commodity details
- **WHEN** they save valid counts for a species that needs identifiers
- **THEN** identification details is shown
- **WHEN** instead no chosen species needs identifiers
- **THEN** additional details is shown

#### Scenario: Main import reason goes on to Commodity details and additional details goes on to arrival details
**ID**: SCN-FLOW-003-I
**Signed off**: 2026-11-11
- **GIVEN** the user is on main import reason with a commodity chosen
- **WHEN** they save the reason
- **THEN** commodity details is shown
- **WHEN** they save additional details
- **THEN** arrival details is shown

#### Scenario: A newly created notification is walked through the whole journey to review
**ID**: SCN-FLOW-003-J
- **GIVEN** the user has just created a notification from the dashboard
- **WHEN** they save each page in turn, answering every step
- **THEN** they are taken through origin of the import, what are you importing, main import reason, commodity details, identification details, additional details, arrival details, transit countries when the means of transport is Rail or Road, the transporter, upload documents, roles and addresses and the contact address, in that order
- **AND** they arrive at check your answers once the contact address is saved, without returning to Overview partway through

#### Scenario: Arrival details goes on to transit countries only for rail or road
**ID**: SCN-FLOW-003-K
**Signed off**: 2026-11-11
- **GIVEN** the user is on arrival details, reached from any start, with where it is coming from and what is being imported saved and the other answers left blank
- **WHEN** they save it with Rail or Road chosen
- **THEN** transit countries is shown
- **WHEN** instead they save it with Air or Sea chosen
- **THEN** the transporter list is shown

#### Scenario: Following a back link and saving again carries on
**ID**: SCN-FLOW-003-L
- **GIVEN** the user is on main import reason
- **WHEN** they follow the back link to what are you importing and save it
- **THEN** main import reason is shown

#### Scenario: With only the country of origin saved, main import reason goes on to What are you importing?
**ID**: SCN-FLOW-003-M
- **GIVEN** a notification holding only its country of origin and main import reason opened from its task on Overview
- **WHEN** the user saves and continues
- **THEN** What are you importing? is shown, not check your answers

#### Scenario: Arrival details by Rail or Road with no commodity saved goes to What are you importing?
**ID**: SCN-FLOW-003-O
- **GIVEN** a notification holding only its country of origin, with arrival details opened
- **WHEN** the user saves it with Rail or Road chosen
- **THEN** What are you importing? is shown
- **AND** Overview does not offer the Transit countries task

#### Scenario: A notification continued in another browser session goes on to the same next page
**ID**: SCN-FLOW-003-N
- **GIVEN** a draft whose origin of the import was saved in one browser session
- **WHEN** the user opens What are you importing? in another browser session, chooses a species and saves and continues
- **THEN** Main import reason is shown

### Requirement: A page the hub links to directly, other than the origin of the import page, offers both a discard-and-exit and a save-and-exit route back to Overview
**ID**: REQ-FLOW-004
The system MUST let the user leave a hub-linked page other than the origin of the import page by discarding unsaved input or committing it, returning to Overview either way. Saving and returning MUST make the same checks as saving and continuing: a missing or invalid answer keeps the user on the page with an error for each, their entries kept and nothing saved. A blank optional answer is accepted by either save.

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

#### Scenario: Save and return to overview refuses a page with a required answer missing
**ID**: SCN-FLOW-004-C
- **GIVEN** the Main import reason page with "Transit" chosen and its port of exit and destination country left blank
- **WHEN** the user selects "Save and return to overview"
- **THEN** they stay on the page, which shows "Select a port of exit" and "Select a destination country"
- **AND** "Transit" is still chosen
- **AND** nothing is saved

#### Scenario: An answer that breaks its own rule is refused on save and return
**ID**: SCN-FLOW-004-D
- **GIVEN** the Arrival details page with an arrival date that names no day
- **WHEN** the user selects "Save and return to overview"
- **THEN** they stay on the page, which shows "Enter a real arrival date"
- **AND** nothing is saved

#### Scenario: Commodity details with the number of animals blank is refused on save and return
**ID**: SCN-FLOW-004-E
**Signed off**: 2026-11-11
- **GIVEN** the Commodity details page with the number of animals left blank
- **WHEN** the user selects "Save and return to overview"
- **THEN** they stay on the page, which shows "Enter the number of animals"
- **AND** nothing is saved

#### Scenario: While amending, the page ends as it does on a draft
**ID**: SCN-FLOW-004-F
- **GIVEN** a notification being amended
- **WHEN** the user opens a page the hub links to directly
- **THEN** it ends as REQ-FLOW-013 describes, with the draft page's controls

#### Scenario: Arrival details saved and returned without a means of transport is refused
**ID**: SCN-FLOW-004-G
- **GIVEN** the Arrival details page with a port of entry chosen and no means of transport
- **WHEN** the user selects "Save and return to overview"
- **THEN** they stay on the page showing "Select a means of transport to the port of entry" and the port of entry is still chosen
- **WHEN** they then open Overview
- **THEN** the Arrival details task reads "To do"
- **AND** opening the task shows the port of entry empty

#### Scenario: Transit countries saved and returned keeps the countries listed
**ID**: SCN-FLOW-004-H
- **GIVEN** the Transit countries page with France and Belgium added
- **WHEN** the user selects "Save and return to overview"
- **THEN** they return to Overview
- **AND** re-opening the page lists France and Belgium

### Requirement: A page is offered only once its prerequisites are answered and what it asks for is in scope
**ID**: REQ-FLOW-005
The system MUST offer a page only when every strictly-earlier answer it depends on has been given and at least one of the things it asks for is in scope for this notification. A Save and continue that would reach a page whose earlier answers are missing MUST open the page that asks for the first missing answer, and Overview MUST offer exactly the pages that rule opens.

#### Scenario: A page whose prerequisites are unanswered is not opened
**ID**: SCN-FLOW-005-A
- **GIVEN** a notification whose earlier answers a later page depends on have not been given
- **WHEN** Save and continue would reach that page
- **THEN** the page that asks for the first missing answer is shown
- **AND** Overview does not offer the later page

### Requirement: Check your answers is open whatever the notification owes; the notification is submitted only once every task row is ready
**ID**: REQ-FLOW-006
The system MUST show check your answers whatever the notification owes, naming what is outstanding on a draft, and while it is being amended naming nothing until Continue is refused (`live-animals/journey-pages/check-your-answers` REQ-CYA-012). Until every Overview task row is ready (fulfilled, not applicable or optional), continuing from check your answers MUST NOT open the declaration, and confirming a declaration opened directly MUST return to check your answers without submitting.

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

### Requirement: A notification with no answer the user entered opens at its first page
**ID**: REQ-FLOW-008
The system MUST send a user to the origin of the import page when they open Overview, check your answers, the declaration or the confirmation page of a notification that holds no answer the user has entered, and MUST open every page once the user has saved an answer. The origin page and the pages beneath it MUST be exempt, so the redirect cannot loop, as MUST the actions taken against a notification from the dashboard — amending, cancelling an amendment, copying and deleting.

#### Scenario: Overview, check your answers, the declaration and the confirmation page show the first page
**ID**: SCN-FLOW-008-A
- **GIVEN** a notification that holds no answer the user entered
- **WHEN** the user opens Overview, check your answers, the declaration or the confirmation page
- **THEN** the origin of the import page is shown

#### Scenario: A notification carrying an answer the user entered opens where it was asked for
**ID**: SCN-FLOW-008-B
- **GIVEN** a link to a page inside a notification that already holds an answer the user entered
- **WHEN** the user opens it
- **THEN** that page is shown, rather than the entry page

#### Scenario: The first page, its pages and the dashboard actions open where they are asked for
**ID**: SCN-FLOW-008-C
- **GIVEN** a notification that holds no answer the user entered
- **WHEN** the user opens the origin of the import page, a page beneath it, or amends, cancels an amendment of, copies or deletes the notification
- **THEN** it opens where it was asked for

#### Scenario: A draft with nothing saved, resumed from the dashboard, opens at the first page
**ID**: SCN-FLOW-008-D
- **GIVEN** a draft with nothing saved, listed on the dashboard
- **WHEN** the user selects Resume
- **THEN** the origin of the import page is shown

### Requirement: Only answers the user entered count as starting a journey
**ID**: REQ-FLOW-009
The system MUST count only an answer the user gave when deciding whether a journey has been started, and MUST NOT count a value the system populated of its own accord, nor the declaration, which is held only for the length of the session.

#### Scenario: A journey holding only system-populated values is treated as unstarted
**ID**: SCN-FLOW-009-A
- **GIVEN** a journey this session did not create, holding no answers beyond values the system populated itself
- **WHEN** the user opens Overview, check your answers, the declaration or the confirmation page
- **THEN** they are sent to the origin of the import page

### Requirement: A collection page stays on the page across its adds and removes, and its finishing action goes on
**ID**: REQ-FLOW-010
The system MUST keep the user on a collection page — one that holds several records, such as identification details or accompanying documents — across any add or remove they make there, however the page was reached. Only the page's own finishing action MUST go on, to the next page that applies.

#### Scenario: Removing and replacing an identification record stays on that page until finishing
**ID**: SCN-FLOW-010-A
- **GIVEN** the user has opened a commodity's identification details page
- **WHEN** they remove a record and enter a replacement
- **THEN** they remain on the identification details page throughout
- **WHEN** they choose the page's finishing action
- **THEN** additional details is shown

#### Scenario: Adding a further document stays on that page until finishing
**ID**: SCN-FLOW-010-B
- **GIVEN** the user has opened the accompanying documents page
- **WHEN** they add a further document
- **THEN** they remain on the accompanying documents page, and the added document is shown there
- **WHEN** they choose the page's finishing action
- **THEN** roles and addresses is shown

### Requirement: A journey sent to its first page goes on from there to the next page that applies
**ID**: REQ-FLOW-011
The system MUST, on a valid Save and continue on the first page after the user was sent there from another page, take them to the next page that applies.

#### Scenario: Saving the entry page after a redirect shows What are you importing?
**ID**: SCN-FLOW-011-A
- **GIVEN** the user was sent to the origin of the import page because the notification held no answer they entered
- **WHEN** they save that page
- **THEN** What are you importing? is shown

### Requirement: A page reached from another page, not from the hub directly, ends with only its primary action
**ID**: REQ-FLOW-012
The system MUST NOT offer a discard-and-exit or a save-and-exit route back to Overview on a page reached from another page rather than linked from the hub directly, and MUST instead let the user leave only the way they came in, once they complete that page's own primary action. The private and commercial transporter details forms are the exception: each ends with its primary action and a secondary "Cancel and return to dashboard".

#### Scenario: A page reached via a detour offers only its primary action
**ID**: SCN-FLOW-012-A
- **GIVEN** the user has reached a page by following a link or action on another page, rather than a hub row
- **WHEN** the page is shown
- **THEN** only that page's own primary action is offered, with no separate "Save and return to overview" or "Cancel and return to overview" control

#### Scenario: The private and commercial transporter details forms end with their primary action and Cancel and return to dashboard
**ID**: SCN-FLOW-012-B
**Signed off**: 2026-11-11
- **GIVEN** the user is on the private or the commercial transporter details form
- **WHEN** the page is shown
- **THEN** it ends with its primary action and "Cancel and return to dashboard", and offers no overview return control

### Requirement: While a notification is being amended, a page ends with exactly the controls it shows on a draft
**ID**: REQ-FLOW-013
While a notification is being amended, each journey page MUST end with exactly the controls the same page shows on a draft, in the same layout, and the status strip MUST still show the Amend status and its Cancel amend link. The origin of the import and CPH number pages end with Save and continue alone.

#### Scenario: A page opened from Overview while amending ends with the draft controls
**ID**: SCN-FLOW-013-A
- **GIVEN** a notification being amended
- **WHEN** the user opens Arrival details from Overview
- **THEN** it ends with "Save and continue" and "Save and return to overview" buttons side by side
- **AND** "Cancel and return to overview" is offered on its own line below them

#### Scenario: A Change link opens the page that collects the answer
**ID**: SCN-FLOW-013-B
- **GIVEN** the review of a notification being amended
- **WHEN** the user follows "Change import details", changes the internal reference and selects "Save and continue"
- **THEN** What are you importing? is shown, the journey having gone on from the origin page

#### Scenario: Save and continue while amending goes on through the rest of the journey to check your answers
**ID**: SCN-FLOW-013-C
- **GIVEN** a page opened from the review's Change link while amending
- **WHEN** the user saves and continues on each page in turn
- **THEN** each goes on to the next page that applies
- **AND** the last page that applies goes to check your answers

#### Scenario: The origin page and the CPH number page offer Save and continue alone while amending
**ID**: SCN-FLOW-013-D
- **GIVEN** a notification being amended
- **WHEN** the user opens the origin of the import page or the CPH number page
- **THEN** each ends with "Save and continue" alone

#### Scenario: On a draft the CPH number page and the origin page keep their primary action alone
**ID**: SCN-FLOW-013-E
- **GIVEN** a draft notification
- **WHEN** the user opens the CPH number page or the origin of the import page
- **THEN** only "Save and continue" is offered

#### Scenario: Cancel and return to overview while amending opens Overview without saving
**ID**: SCN-FLOW-013-F
- **GIVEN** a notification being amended and a value typed on a page
- **WHEN** the user selects "Cancel and return to overview"
- **THEN** Overview is shown with the Amend status and the Cancel amend link
- **AND** the typed value is not saved

### Requirement: A page the hub links to directly, other than the origin of the import page, keeps its two buttons side by side and its overview exit below them
**ID**: REQ-FLOW-014
The system MUST end a page the hub links to directly, other than the origin of the import page, with its primary action and "Save and return to overview" side by side, and "Cancel and return to overview" on its own line below them, on a draft and while the notification is being amended.

#### Scenario: Cancel and return to overview sits on its own line below the two buttons
**ID**: SCN-FLOW-014-A
- **GIVEN** a notification that is not being amended
- **WHEN** the user opens Commodity details from Overview
- **THEN** "Save and continue" and "Save and return to overview" sit side by side
- **AND** "Cancel and return to overview" sits on its own line below them

#### Scenario: While amending, the layout is the same as on a draft
**ID**: SCN-FLOW-014-B
- **GIVEN** a notification being amended
- **WHEN** the user opens Arrival details from Overview
- **THEN** "Save and continue" and "Save and return to overview" sit side by side
- **AND** "Cancel and return to overview" sits on its own line below them

### Requirement: While a notification is being amended, each save button makes the page's own checks before it goes anywhere
**ID**: REQ-FLOW-015
While a notification is being amended, the system MUST make each of a page's save buttons pass the page's own checks before it saves or leaves the page, so a missing or invalid answer keeps the user on the page with an error for each and nothing saved.

#### Scenario: Save and continue and Save and return to overview each refuse a partly answered reveal while amending
**ID**: SCN-FLOW-015-A
- **GIVEN** the main import reason page of a notification being amended, with "Transit" chosen and its port of exit and destination country left blank
- **WHEN** the user selects "Save and continue" or "Save and return to overview"
- **THEN** they stay on the page, which shows an error for each missing answer
- **AND** nothing is saved

### Requirement: A notification started from the Import Notification Service's type question opens at the entry page
**ID**: REQ-FLOW-017
The system MUST, when a user chooses Live animals on the Import Notification Service's "What are you importing?" question, create a new draft notification and open it at the entry page, exactly as starting from its own dashboard does.

#### Scenario: Choosing Live animals opens a new draft at Origin of the import
**ID**: SCN-FLOW-017-A
- **GIVEN** the user is on the Import Notification Service's "What are you importing?" question
- **WHEN** they choose Live animals and continue
- **THEN** a new draft is created and the "Origin of the import" page is shown with the Draft tag and its new reference
- **AND** saving that page continues to the next page

### Requirement: Back on every journey page goes to the place the trader came from
**ID**: REQ-FLOW-018
The system MUST send Back on every journey page to where the trader came from: the page they saved from, Overview, the review (from a Change link) or the dashboard (from a dashboard card), surviving a refresh, a refused save, a sub-page round trip and a new session. With nothing to go back to it MUST go to Overview, but the origin page goes to where the notification was started, and Consignment addresses and Contact address go to Overview after an address book return. The trail holds 40 places.

#### Scenario: Back goes to the page "Save and continue" was pressed on
**ID**: SCN-FLOW-018-A
- **GIVEN** the user opened Arrival details from its Overview task and chose road as the means of transport
- **WHEN** they select "Save and continue" and then the Back link on Transit countries
- **THEN** Arrival details is shown

#### Scenario: Back goes to Overview when the page was opened from Overview
**ID**: SCN-FLOW-018-B
- **GIVEN** the Overview of a draft notification
- **WHEN** the user opens Arrival details from its task and follows the Back link
- **THEN** Overview is shown

#### Scenario: Back goes to the review when the page was opened from a Change link
**ID**: SCN-FLOW-018-C
- **GIVEN** the review of a draft notification
- **WHEN** the user follows the Change link for the reason for import and then the Back link
- **THEN** the review is shown

#### Scenario: Back steps through the visited pages in reverse
**ID**: SCN-FLOW-018-D
- **GIVEN** the user opened Arrival details from Overview and selected "Save and continue" on each page in turn until the review
- **WHEN** they follow the Back link on each page in turn
- **THEN** each earlier page is shown in reverse order
- **AND** Overview is shown from Arrival details

#### Scenario: Back keeps the place after a sub-page round trip, a refresh and a refused save
**ID**: SCN-FLOW-018-E
- **GIVEN** a page opened from a Change link on the review
- **WHEN** the user refreshes the page, or adds a transporter, or uploads a document, or has a save refused, and then follows the Back link
- **THEN** the review is shown

#### Scenario: Consignment addresses goes Back to Overview after an Import Notification Service address book return
**ID**: SCN-FLOW-018-F
- **GIVEN** the user added an address through the Import Notification Service address book and returned to Consignment addresses
- **WHEN** they follow the Back link
- **THEN** Overview is shown
- **AND** "Save and continue" on Consignment addresses still goes on to Contact address for consignment

#### Scenario: The origin of the import page goes Back to where the notification was started
**ID**: SCN-FLOW-018-G
- **GIVEN** a notification started with the dashboard's create button, and another started from the Import Notification Service question with Live animals chosen
- **WHEN** the user follows the Back link on the origin of the import page of each
- **THEN** the first opens the dashboard
- **AND** the second opens the Import Notification Service's "What are you importing?" question for that notification

#### Scenario: A page opened by its address goes Back to Overview
**ID**: SCN-FLOW-018-H
- **GIVEN** a page of a draft notification opened by its address, or by a link that names a place the journey does not have
- **WHEN** the user follows the Back link
- **THEN** Overview is shown

#### Scenario: Past 40 places the oldest drop and Back ends at Overview
**ID**: SCN-FLOW-018-I
- **GIVEN** the user has pressed Save and continue on more than 40 pages in a row
- **WHEN** they follow Back repeatedly
- **THEN** Back steps through the newest 40 places
- **AND** Overview is shown after them

### Requirement: Each transporter add form opens only for the type it belongs to
**ID**: REQ-FLOW-019
The system MUST send the user to the transporter type question, rather than showing a transporter add form, when the notification's saved transporter type is not the type that form belongs to — including when no type is saved. This MUST hold whether the add form is opened or posted to.

#### Scenario: Opening the private transporter form without the private type chosen lands on the type question
**ID**: SCN-FLOW-019-A
**Signed off**: 2026-11-11
- **GIVEN** the notification's saved transporter type is not Private, or no type is saved
- **WHEN** the user opens or posts to the private transporter form
- **THEN** the transporter type question is shown instead
- **AND** nothing is saved

#### Scenario: Opening the commercial transporter form without the commercial type chosen lands on the type question
**ID**: SCN-FLOW-019-B
**Signed off**: 2026-11-11
- **GIVEN** the notification's saved transporter type is not Commercial, or no type is saved
- **WHEN** the user opens or posts to the commercial transporter form
- **THEN** the transporter type question is shown instead
- **AND** nothing is saved
