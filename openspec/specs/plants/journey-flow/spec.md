# Journey Flow Specification

## Purpose

How the high-risk plants journey moves from one page to the next: the order pages come in, when one is skipped, the opening sequence a newly created notification runs, and where a journey opened out of context is sent. Overview, the dashboard and the commodity-details entry sub-page are not steps in this order.

## Requirements

### Requirement: The journey is ordered as nine sections, each a sequence of pages
**ID**: REQ-PLANTS-FLOW-001
The system MUST order the journey as nine sections, and MUST offer each section's pages in a fixed sequence.

#### Scenario: The journey's sections run in a fixed order
**ID**: SCN-PLANTS-FLOW-001-A
- **GIVEN** a notification is being worked on
- **WHEN** its sections are followed from the start
- **THEN** they run in this order: the dashboard; commodity type and the commodities list; the commodity-details entry sub-page; origin; arrival status and arrival details; place of destination; consignor and identification numbers; contact address; and finally check your answers, declaration and confirmation

#### Scenario: The arrival section sequences its pages in order
**ID**: SCN-PLANTS-FLOW-001-B
- **GIVEN** a user is working through the arrival section for a notification that asks the arrival-status question
- **WHEN** they continue from each page in turn
- **THEN** they are offered arrival status and then arrival details, in that order, skipping any that is not in scope

### Requirement: These flow sections are not the same grouping as the Overview task rows
**ID**: REQ-PLANTS-FLOW-002
The system MUST treat the journey's flow sections and the Overview page's task rows as separate groupings: there are nine flow sections against the hub's task rows, and a task row MUST NOT be assumed to correspond one-to-one with the section a page is reached through. Overview groups its rows under four numbered headings, which is a third grouping again.

#### Scenario: A single task row spans pages from more than one flow position
**ID**: SCN-PLANTS-FLOW-002-A
- **GIVEN** the commodities task row on Overview
- **WHEN** the user opens it
- **THEN** it covers the commodity-type page, the commodities list and the commodity-details entry sub-page together, even though the flow places the entry sub-page in a section of its own

### Requirement: Continuing from any page moves to the next still in scope, and finishing a section returns to Overview
**ID**: REQ-PLANTS-FLOW-003
The system MUST take the user, on continuing from a page, to the next page in that section whose conditions are met, skipping any that are not, and MUST return them to Overview once no page remains in the section.

#### Scenario: Continuing skips a page that is not in scope
**ID**: SCN-PLANTS-FLOW-003-A
- **GIVEN** the user is on a page whose section holds a later page that is not in scope for this notification
- **WHEN** they save and continue
- **THEN** they are taken past the page that is not in scope, to the next one that is

#### Scenario: Finishing the last page of a section returns to Overview
**ID**: SCN-PLANTS-FLOW-003-B
- **GIVEN** the user is on the last page of a section that is still in scope
- **WHEN** they save and continue
- **THEN** they return to Overview rather than continuing into another section

### Requirement: A page the hub links to directly offers both a discard-and-exit and a save-and-exit route back to Overview
**ID**: REQ-PLANTS-FLOW-004
The system MUST let the user leave a page the hub links to directly either by discarding anything typed since it was last saved, or by committing it, and MUST return to Overview either way.

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
- **WHEN** the journey reaches the arrival section
- **THEN** arrival status is not offered, and arrival details is offered instead

### Requirement: Check your answers, the declaration and the confirmation are reachable only once every task row is ready
**ID**: REQ-PLANTS-FLOW-006
The system MUST withhold the review section — check your answers, the declaration and the confirmation — until every task row on Overview is ready, counting a row as ready when it is fulfilled, not applicable, or optional.

#### Scenario: The review section is withheld while a task row is outstanding
**ID**: SCN-PLANTS-FLOW-006-A
- **GIVEN** a notification with a task row that is neither fulfilled, not applicable, nor optional
- **WHEN** the user tries to reach check your answers
- **THEN** the review section is not open to them

#### Scenario: The review section opens once every row is fulfilled, not applicable or optional
**ID**: SCN-PLANTS-FLOW-006-B
- **GIVEN** a notification whose every task row is fulfilled, not applicable or optional
- **WHEN** the user goes to check their answers
- **THEN** check your answers is shown, leading on to the declaration and then the confirmation

### Requirement: A notification created in this session runs an opening sequence ending on Overview
**ID**: REQ-PLANTS-FLOW-007
The system MUST walk a newly created notification through an opening sequence of the journey's answer pages, skipping any step not in scope, and MUST deliver the user to Overview once every step is done.

#### Scenario: A newly created notification is walked through the opening sequence to Overview
**ID**: SCN-PLANTS-FLOW-007-A
- **GIVEN** the user has just created a notification from the dashboard
- **WHEN** they save each page in turn, answering every step
- **THEN** they are taken through every in-scope step of the opening sequence in turn: commodity type, commodities list, origin, arrival status, arrival details, place of destination, consignor, identification numbers and contact
- **AND** they arrive at Overview once the last step is saved, without being taken into check your answers as part of the sequence

#### Scenario: An opening-sequence step not yet in scope is skipped
**ID**: SCN-PLANTS-FLOW-007-B
- **GIVEN** the user is in the opening sequence and the next step is not yet in scope
- **WHEN** they save the page they are on
- **THEN** they are taken to the next step that is in scope

#### Scenario: Revisiting an opening-sequence page after the run has finished does not resume it
**ID**: SCN-PLANTS-FLOW-007-C
- **GIVEN** the user has already completed the opening sequence for a notification and reached Overview
- **WHEN** they open one of the opening sequence's own pages again and save it
- **THEN** they return to Overview, not to whatever would be the next step of the sequence

### Requirement: A journey opened out of context is sent to its entry page
**ID**: REQ-PLANTS-FLOW-008
The system MUST send a user to the commodity-type page when they open a page of a journey that neither began its opening sequence in this session nor holds any answer the user has entered. The commodity-type page and the pages beneath it MUST be exempt, so the redirect cannot loop, as MUST the actions taken against a notification from the dashboard — amending, cancelling an amendment, copying and deleting.

#### Scenario: A deep link to an unknown journey lands on the entry page
**ID**: SCN-PLANTS-FLOW-008-A
- **GIVEN** a link to a page deep inside a journey that this session did not create and that holds no answers the user entered
- **WHEN** the user opens it
- **THEN** they land on the commodity-type page for that journey

#### Scenario: A journey carrying answers the user entered opens where it was asked for
**ID**: SCN-PLANTS-FLOW-008-B
- **GIVEN** a link to a page inside a journey that already holds an answer the user entered
- **WHEN** the user opens it
- **THEN** that page is shown, rather than the entry page

### Requirement: Only answers the user entered count as starting a journey
**ID**: REQ-PLANTS-FLOW-009
The system MUST count only an answer the user gave when deciding whether a journey has been started, and MUST NOT count a value the system populated of its own accord, nor the declaration, which is held only for the length of the session.

#### Scenario: A journey holding only system-populated values is treated as unstarted
**ID**: SCN-PLANTS-FLOW-009-A
- **GIVEN** a journey this session did not create, holding no answers beyond values the system populated itself
- **WHEN** the user opens a page deep inside it
- **THEN** they are sent to the commodity-type page

### Requirement: A collection page reached by changing an answer stays in that context until its own finishing action
**ID**: REQ-PLANTS-FLOW-010
The system MUST keep the user on a collection page — one that holds several records, such as the commodities list — reached by changing an answer from check your answers, across any add or remove they make there, rather than returning to check your answers after each one. Only the page's own finishing action MUST return them to check your answers, at which point it MUST show the change they made.

#### Scenario: Changing a commodity line while changing stays on the collection until finishing
**ID**: SCN-PLANTS-FLOW-010-A
- **GIVEN** the user has followed a Change link from check your answers to a commodity line
- **WHEN** they change the line and continue back through the commodities list
- **THEN** they return to check your answers only after the list's finishing action, now showing the changed line

### Requirement: A journey reached out of context continues from the entry page through the next step
**ID**: REQ-PLANTS-FLOW-011
The system MUST, after sending the user to the commodity-type page because the journey had neither an opening sequence in this session nor answers they entered, take them on to the next in-scope step of the journey when they save that page, rather than leaving them only at Overview.

#### Scenario: Saving the entry page after a redirect continues through the section
**ID**: SCN-PLANTS-FLOW-011-A
- **GIVEN** the user was sent to the commodity-type page because the journey had no opening sequence in this session and held no answers they entered
- **WHEN** they choose a type and save and continue
- **THEN** they are taken to the next step of the commodity section, not left only at Overview

### Requirement: A page reached from another page, not from the hub directly, ends with only its primary action
**ID**: REQ-PLANTS-FLOW-012
The system MUST NOT offer a discard-and-exit or a save-and-exit route back to Overview on a page reached from another page rather than linked from the hub directly, and MUST instead let the user leave only the way they came in, once they complete that page's own primary action.

#### Scenario: A page reached via a detour offers only its primary action
**ID**: SCN-PLANTS-FLOW-012-A
- **GIVEN** the user has reached a page by following a link or action on another page, rather than a hub row
- **WHEN** the page is shown
- **THEN** only its primary save-and-continue action is offered, with no separate "Save and return to overview" or "Cancel and return to overview" control

### Requirement: The opening sequence is not the same order as the flow sections, and omits commodity-details
**ID**: REQ-PLANTS-FLOW-013
The system MUST treat the opening sequence's order as its own and MUST NOT assume it matches the flow sections in REQ-PLANTS-FLOW-001. The commodity-details entry sub-page MUST NOT be a step of the sequence — the commodities list sends a trader with no lines there and takes them back.

#### Scenario: The opening sequence does not treat commodity-details as a step
**ID**: SCN-PLANTS-FLOW-013-A
- **GIVEN** the user is in the opening sequence on the commodities list with no lines yet saved
- **WHEN** they continue without adding a line, or add a line and return through the list
- **THEN** commodity-details is reached only via the list, not as its own opening-sequence step after the list
- **AND** finishing the list continues the opening sequence to origin (or the next in-scope step), not into a separate commodity-details spine step
