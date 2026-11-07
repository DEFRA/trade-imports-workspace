# Journey Flow Specification

## Purpose

How the high-risk plants journey moves from one page to the next: the one order pages come in, when one is skipped, where a journey opened out of context is sent, and how a page ends while a notification is being amended. Overview, the dashboard and the commodity-details sub-page are not steps in this order.

## Requirements

### Requirement: The journey has one page order, the order Overview lists its tasks in
**ID**: REQ-PLANTS-FLOW-001
The system MUST give the journey one page order, the order Overview lists its tasks in, and MUST offer pages in that order whatever way the user reached them. Overview, the dashboard and the commodity-details sub-page are not steps in it: commodity details is reached only from the commodities list.

#### Scenario: The journey's pages run in a fixed order
**ID**: SCN-PLANTS-FLOW-001-A
- **GIVEN** a notification being worked on
- **WHEN** its pages are followed from the start
- **THEN** they run in this order: What are you importing?, the commodities list, origin, arrival status, arrival details, place of destination, consignor, identification numbers, contact address, and finally check your answers, the declaration and the confirmation
- **AND** Overview lists its tasks in the same order

#### Scenario: The arrival pages are offered in order
**ID**: SCN-PLANTS-FLOW-001-B
- **GIVEN** a user working through the arrival pages for a notification that asks the arrival-status question
- **WHEN** they save each page in turn
- **THEN** they are offered arrival status and then arrival details, in that order, skipping any that is not in scope

### Requirement: Saving and continuing goes to the next page that applies, whatever way the page was reached
**ID**: REQ-PLANTS-FLOW-003
The system MUST, on a valid Save and continue from a journey page, go to the next page in the journey's order that applies, skipping any that does not, and the last page that applies MUST go to check your answers whatever is owed. It MUST do so however the page was reached, and a Save and continue that leaves optional answers blank MUST still go on. Commodity details MUST go back to the commodities list, and the list MUST go on to origin.

#### Scenario: Continuing skips a page that is not in scope
**ID**: SCN-PLANTS-FLOW-003-A
- **GIVEN** the user is on a page followed by a page that is not in scope for this notification
- **WHEN** they save and continue
- **THEN** they are taken past the page that is not in scope, to the next one that is

#### Scenario: Contact address goes to check your answers whatever is owed
**ID**: SCN-PLANTS-FLOW-003-B
- **GIVEN** a notification with tasks outstanding and the contact address page open
- **WHEN** the user saves and continues, with or without a contact address chosen
- **THEN** check your answers is shown, naming what is outstanding

#### Scenario: Arrival details goes on to the place of destination
**ID**: SCN-PLANTS-FLOW-003-C
- **GIVEN** arrival status or arrival details opened from Overview
- **WHEN** the user saves arrival status and then arrival details
- **THEN** arrival details follows arrival status, and saving arrival details shows the place of destination

#### Scenario: The commodities list goes on to origin, even with only the commodity type saved
**ID**: SCN-PLANTS-FLOW-003-D
- **GIVEN** a notification with only its commodity type saved
- **WHEN** the user continues from the commodities list
- **THEN** origin is shown, not Overview and not commodity details

#### Scenario: Consignor goes on to identification numbers
**ID**: SCN-PLANTS-FLOW-003-E
- **GIVEN** a plants-for-planting or wood notification and the consignor task opened from Overview
- **WHEN** the user chooses an address and saves and continues
- **THEN** identification numbers is shown

#### Scenario: Nothing marks a page as opened from Overview
**ID**: SCN-PLANTS-FLOW-003-F
- **GIVEN** Overview
- **WHEN** the user opens a task
- **THEN** the page's address is the one every start uses, with nothing added to it or to the link

#### Scenario: A potato notification skips arrival status and the consignor
**ID**: SCN-PLANTS-FLOW-003-G
- **GIVEN** a potato notification
- **WHEN** the user saves origin
- **THEN** arrival details is shown
- **WHEN** they save the place of destination
- **THEN** identification numbers is shown

#### Scenario: A newly created notification is walked through the journey to check your answers
**ID**: SCN-PLANTS-FLOW-003-H
- **GIVEN** the user has just created a notification from the dashboard
- **WHEN** they save each page in turn, answering every step
- **THEN** they are taken through every in-scope step in turn: commodity type, commodities list, origin, arrival status, arrival details, place of destination, consignor, identification numbers and contact
- **AND** they arrive at check your answers once the last step is saved

#### Scenario: Commodity details goes back to the commodities list
**ID**: SCN-PLANTS-FLOW-003-I
- **GIVEN** the user opened commodity details from the commodities list
- **WHEN** they save a line
- **THEN** the commodities list is shown

### Requirement: A page the hub links to directly offers both a discard-and-exit and a save-and-exit route back to Overview
**ID**: REQ-PLANTS-FLOW-004
The system MUST let the user leave a page the hub links to directly by discarding anything typed since it was last saved or by committing it, returning to Overview either way. Saving and returning MUST make the same checks as saving and continuing: a missing or invalid answer keeps the user on the page with an error for each, what they entered kept and nothing saved.

#### Scenario: Cancel and return to overview discards unsaved input
**ID**: SCN-PLANTS-FLOW-004-A
- **GIVEN** the user has typed into a field on a task page without saving
- **WHEN** they select "Cancel and return to overview"
- **THEN** they return to Overview, and re-opening the task page shows the field as it was before, not the discarded input

#### Scenario: Save and return to overview commits the input and returns to Overview
**ID**: SCN-PLANTS-FLOW-004-B
- **GIVEN** the user has typed into a field on a task page
- **WHEN** they select "Save and return to overview"
- **THEN** they return to Overview, and re-opening the task page shows the committed input

#### Scenario: Save and return to overview refuses a blank arrival details page
**ID**: SCN-PLANTS-FLOW-004-C
- **GIVEN** a potatoes notification is on the arrival details with nothing answered
- **WHEN** the user selects "Save and return to overview"
- **THEN** they stay on the page, which shows an error for each missing answer
- **AND** nothing is saved

#### Scenario: A time not on the 24-hour clock is refused on save and return
**ID**: SCN-PLANTS-FLOW-004-D
- **GIVEN** a potatoes notification is on the arrival details with a time that is not on the 24-hour clock
- **WHEN** the user selects "Save and return to overview"
- **THEN** they stay on the page, which shows "Enter a real time, like 14:30"
- **AND** nothing is saved

### Requirement: A page is offered only once its prerequisites are answered and what it asks for is in scope
**ID**: REQ-PLANTS-FLOW-005
The system MUST offer a page only when every strictly-earlier answer it depends on has been given and at least one of the things it asks for is in scope for this notification, and MUST otherwise pass over it.

#### Scenario: A page whose prerequisites are unanswered is passed over
**ID**: SCN-PLANTS-FLOW-005-A
- **GIVEN** a notification whose earlier answers a later page depends on have not been given
- **WHEN** the journey reaches the point that page would be offered
- **THEN** the page is not offered, and the journey continues past it

#### Scenario: Arrival status is passed over for a potato notification
**ID**: SCN-PLANTS-FLOW-005-B
- **GIVEN** a potato notification whose origin has been answered
- **WHEN** the journey reaches the arrival pages
- **THEN** arrival status is not offered, and arrival details is offered instead

### Requirement: Check your answers is open whatever the notification owes; the notification is submitted only once every task row is ready
**ID**: REQ-PLANTS-FLOW-006
The system MUST show check your answers at the end of the journey, or by its own URL, whatever the notification owes, naming what is outstanding. Overview's check-and-submit row MUST stay withheld until every task row is ready (REQ-PLANTS-OB-REVIEW-001), a row being ready when fulfilled, not applicable or optional. Until then, continuing from check your answers MUST NOT open the declaration, and confirming a declaration opened directly MUST return to check your answers without submitting.

#### Scenario: Continuing from check your answers is refused while a task row is outstanding
**ID**: SCN-PLANTS-FLOW-006-A
- **GIVEN** a notification with a task row that is neither fulfilled, not applicable, nor optional
- **WHEN** the user continues from check your answers
- **THEN** they stay on check your answers, which names what is outstanding
- **AND** the declaration is not opened

#### Scenario: The review section opens once every row is fulfilled, not applicable or optional
**ID**: SCN-PLANTS-FLOW-006-B
- **GIVEN** a notification whose every task row is fulfilled, not applicable or optional
- **WHEN** the user goes to check their answers
- **THEN** check your answers is shown, leading on to the declaration and then the confirmation

### Requirement: A notification with no answer the user entered opens at its first page
**ID**: REQ-PLANTS-FLOW-008
The system MUST send a user to the commodity-type page when they open Overview, check your answers, the declaration or the confirmation page of a notification that holds no answer the user has entered, and MUST open every page once the user has saved an answer. The commodity-type page and the pages beneath it MUST be exempt, so the redirect cannot loop, as MUST the actions taken against a notification from the dashboard — amending, cancelling an amendment, copying and deleting.

#### Scenario: Overview, check your answers, the declaration and the confirmation page show the first page
**ID**: SCN-PLANTS-FLOW-008-A
- **GIVEN** a notification that holds no answer the user entered
- **WHEN** the user opens Overview, check your answers, the declaration or the confirmation page
- **THEN** the commodity-type page is shown

#### Scenario: A notification carrying an answer the user entered opens where it was asked for
**ID**: SCN-PLANTS-FLOW-008-B
- **GIVEN** a link to a page inside a notification that already holds an answer the user entered
- **WHEN** the user opens it
- **THEN** that page is shown, rather than the entry page

#### Scenario: The first page, its pages and the dashboard actions open where they are asked for
**ID**: SCN-PLANTS-FLOW-008-C
- **GIVEN** a notification that holds no answer the user entered
- **WHEN** the user opens the commodity-type page, a page beneath it, or amends, cancels an amendment of, copies or deletes the notification
- **THEN** it opens where it was asked for

#### Scenario: Cancel and return to overview on the first page opens the dashboard until something is saved
**ID**: SCN-PLANTS-FLOW-008-D
- **GIVEN** the commodity-type page of a notification with nothing saved
- **WHEN** the user selects "Cancel and return to overview"
- **THEN** the dashboard is shown
- **WHEN** after saving the commodity type they select it again
- **THEN** Overview is shown

### Requirement: Only answers the user entered count as starting a journey
**ID**: REQ-PLANTS-FLOW-009
The system MUST count only an answer the user gave when deciding whether a journey has been started, and MUST NOT count a value the system populated of its own accord, nor the declaration, which is held only for the length of the session.

#### Scenario: A journey holding only system-populated values is treated as unstarted
**ID**: SCN-PLANTS-FLOW-009-A
- **GIVEN** a journey this session did not create, holding no answers beyond values the system populated itself
- **WHEN** the user opens Overview, check your answers, the declaration or the confirmation page
- **THEN** they are sent to the commodity-type page

### Requirement: A collection page stays on the page across its adds and removes, and its finishing action goes on
**ID**: REQ-PLANTS-FLOW-010
The system MUST keep the user on a collection page — one that holds several records, such as the commodities list — across any add or remove they make there, however the page was reached. Only the page's own finishing action MUST go on, to the next page that applies.

#### Scenario: Changing a commodity line stays on the collection until finishing
**ID**: SCN-PLANTS-FLOW-010-A
- **GIVEN** the user has followed a Change link from check your answers to a commodity line
- **WHEN** they change the line and continue back through the commodities list
- **THEN** commodity details goes back to the commodities list, and the list goes on to origin

### Requirement: A journey sent to its first page goes on from there through the next step
**ID**: REQ-PLANTS-FLOW-011
The system MUST, on a valid Save and continue on the commodity-type page after the user was sent there from another page, take them on to the commodities list.

#### Scenario: Saving the entry page after a redirect shows the commodities list
**ID**: SCN-PLANTS-FLOW-011-A
- **GIVEN** the user was sent to the commodity-type page because the notification held no answer they entered
- **WHEN** they choose a type and save and continue
- **THEN** the commodities list is shown

### Requirement: A page reached from another page, not from the hub directly, ends with only its primary action
**ID**: REQ-PLANTS-FLOW-012
The system MUST NOT offer a discard-and-exit or a save-and-exit route back to Overview on a page reached from another page rather than linked from the hub directly, and MUST instead let the user leave only the way they came in, once they complete that page's own primary action.

#### Scenario: A page reached via a detour offers only its primary action
**ID**: SCN-PLANTS-FLOW-012-A
- **GIVEN** the user has reached a page by following a link or action on another page, rather than a hub row
- **WHEN** the page is shown
- **THEN** only its primary save-and-continue action is offered, with no separate "Save and return to overview" or "Cancel and return to overview" control

### Requirement: While a notification is being amended, a page ends with exactly the controls it shows on a draft
**ID**: REQ-PLANTS-FLOW-014
While a notification is being amended, each journey page MUST end with exactly the controls the same page shows on a draft, in the same layout, and the status strip MUST still show the Amend status and its Cancel amend link. A page opened from a Change link on the review goes on by Save and continue through the journey to the review, and after a commodity line is changed from the review, commodity details goes to the commodities list and the list to origin.

#### Scenario: A page opened while amending ends with the draft controls
**ID**: SCN-PLANTS-FLOW-014-A
- **GIVEN** a notification being amended
- **WHEN** the user opens Identification numbers from Overview
- **THEN** it ends with "Save and continue" and "Save and return to overview" buttons, and a "Cancel and return to overview" link on its own line below them

#### Scenario: A Change link opens the page that collects the answer and Save and continue goes on to the review
**ID**: SCN-PLANTS-FLOW-014-E
- **GIVEN** the review of a notification being amended
- **WHEN** the user follows the Change link for the identification numbers and selects "Save and continue" on it and on the pages that follow
- **THEN** the review is shown with the new producer number

#### Scenario: Save and continue while amending goes to the next page that applies
**ID**: SCN-PLANTS-FLOW-014-B
- **GIVEN** a plants-for-planting notification being amended
- **WHEN** the user selects "Save and continue" on Arrival status
- **THEN** Arrival details is shown
- **WHEN** they select "Save and return to overview" on Arrival details
- **THEN** Overview is shown

#### Scenario: The address pickers end as they do on a draft while amending
**ID**: SCN-PLANTS-FLOW-014-C
- **GIVEN** a notification being amended
- **WHEN** the user opens the consignor, place of destination or consignment contact picker
- **THEN** each ends with the controls it shows on a draft

#### Scenario: The commodities list ends as it does on a draft while amending
**ID**: SCN-PLANTS-FLOW-014-D
- **GIVEN** a notification being amended
- **WHEN** the user opens the commodities list
- **THEN** it ends with the controls it shows on a draft
- **AND** "Save and continue" goes to origin

#### Scenario: Cancel and return to overview while amending opens Overview without saving
**ID**: SCN-PLANTS-FLOW-014-F
- **GIVEN** a notification being amended and a value typed on a page
- **WHEN** the user selects "Cancel and return to overview"
- **THEN** Overview is shown with the Amend status and the Cancel amend link
- **AND** the typed value is not saved

### Requirement: A page the hub links to directly keeps its two buttons side by side and its overview exit below them
**ID**: REQ-PLANTS-FLOW-015
The system MUST end a page the hub links to directly with its primary action and "Save and return to overview" side by side, and "Cancel and return to overview" on its own line below them, on a draft and while the notification is being amended.

#### Scenario: Cancel and return to overview sits on its own line below the two buttons
**ID**: SCN-PLANTS-FLOW-015-A
- **GIVEN** a notification that is not being amended
- **WHEN** the user opens a page the hub links to directly
- **THEN** its primary action and "Save and return to overview" sit side by side
- **AND** "Cancel and return to overview" sits on its own line below them

#### Scenario: While amending, the layout is the same as on a draft
**ID**: SCN-PLANTS-FLOW-015-B
- **GIVEN** a notification being amended
- **WHEN** the user opens a page the hub links to directly
- **THEN** "Save and continue" and "Save and return to overview" sit side by side
- **AND** "Cancel and return to overview" sits on its own line below them

### Requirement: A notification started from the Import Notification Service's type question opens at the entry page
**ID**: REQ-PLANTS-FLOW-016
The system MUST, when a user chooses Plants for planting, Potatoes (seed and ware) or Wood products on the Import Notification Service's "What are you importing?" question, create a new draft notification and open it at the entry page, exactly as starting from its own dashboard does.

#### Scenario: Choosing a plants type opens a new draft at the entry question
**ID**: SCN-PLANTS-FLOW-016-A
- **GIVEN** the user is on the Import Notification Service's "What are you importing?" question
- **WHEN** they choose Plants for planting, Potatoes (seed and ware) or Wood products and continue
- **THEN** a new high-risk plants draft is created and its "What are you importing?" entry page is shown

### Requirement: On a draft, a page opened from a Change link on the review goes Back to the previous page in the journey's order
**ID**: REQ-PLANTS-FLOW-017
The system MUST, on a draft notification, give a page opened from a Change link on the review the Back link to the previous page in the journey's order, carrying the change so that Back follows the page's own return path. The commodity type page, the first page, MUST keep the Back link it has without the Change link. While the notification is being amended, REQ-PLANTS-FLOW-014 governs instead.

#### Scenario: The origin page opened from its Change link goes Back to the commodities list
**ID**: SCN-PLANTS-FLOW-017-A
- **GIVEN** the review of a draft notification
- **WHEN** the user follows the Change link for the country of origin
- **THEN** the Back link on the origin page opens the commodities list
- **WHEN** they change the country and select "Save and continue"
- **THEN** the next page that applies is shown

#### Scenario: Identification numbers opened from a Change link goes Back to the consignor
**ID**: SCN-PLANTS-FLOW-017-B
- **GIVEN** the review of a draft plants-for-planting or wood notification
- **WHEN** the user follows the Change link for the identification numbers
- **THEN** the Back link opens the consignor page

#### Scenario: The commodity type page keeps the Back link it has without a Change link
**ID**: SCN-PLANTS-FLOW-017-C
- **GIVEN** the review of a draft notification
- **WHEN** the user opens the commodity type page from a Change link
- **THEN** its Back link opens Overview
