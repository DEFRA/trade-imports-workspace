# Journey Flow Specification

## Purpose

How the journey moves from one page to the next: the order pages come in, when one is skipped, the opening sequence a newly created notification runs, and where a journey opened out of context is sent. Overview, the dashboard and the address-selection spoke are not steps in this order.

## Requirements

### Requirement: The journey is ordered as ten sections, each a sequence of pages
The system MUST order the journey as ten sections, and MUST offer each section's pages in a fixed sequence.

#### Scenario: The journey's sections run in a fixed order
- **GIVEN** a notification is being worked on
- **WHEN** its sections are followed from the start
- **THEN** they run in this order: the dashboard; origin of the import; what are you importing and commodity details; identification details; import reason and additional details; upload documents; consignment addresses and County Parish Holding; the transport pages; contact address; and finally check your answers, declaration and confirmation

#### Scenario: The transport section sequences its five pages in order
- **GIVEN** a user is working through the transport section
- **WHEN** they continue from each page in turn
- **THEN** they are offered arrival details, transited countries, transporter type, the approved transporter search and private transporter details, in that order, skipping any that is not in scope

### Requirement: These flow sections are not the same grouping as the Overview task rows
The system MUST treat the journey's flow sections and the Overview page's task rows as separate groupings: there are ten flow sections against eleven task rows, and a task row MUST NOT be assumed to correspond to the section a page is reached through. Overview groups its eleven task rows under six numbered headings, which is a third grouping again.

#### Scenario: A single task row spans pages from more than one flow position
- **GIVEN** the transporter task row on Overview
- **WHEN** the user opens it
- **THEN** it covers the transporter type, approved transporter search and private transporter details pages together, even though the flow offers each as its own step

### Requirement: Continuing from any page moves to the next still in scope, and finishing a section returns to Overview
The system MUST take the user, on continuing from a page, to the next page in that section whose conditions are met, skipping any that are not, and MUST return them to Overview once no page remains in the section.

#### Scenario: Continuing skips a page that is not in scope
- **GIVEN** the user is on a page whose section holds a later page that is not in scope for this notification
- **WHEN** they save and continue
- **THEN** they are taken past the page that is not in scope, to the next one that is

#### Scenario: Finishing the last page of a section returns to Overview
- **GIVEN** the user is on the last page of a section that is still in scope
- **WHEN** they save and continue
- **THEN** they return to Overview rather than continuing into another section

### Requirement: A task page offers both a discard-and-exit and a save-and-exit route back to Overview
The system MUST let the user leave a task page either by discarding anything typed since it was last saved, or by committing it, and MUST return to Overview either way.

#### Scenario: Cancel and return to overview discards unsaved input
- **GIVEN** the user has typed into a field on a task page without saving
- **WHEN** they select "Cancel and return to overview"
- **THEN** they return to Overview, and re-opening the task page shows the field as it was before, not the discarded input

#### Scenario: Save and return to overview commits the input and returns to Overview
- **GIVEN** the user has typed into a field on a task page
- **WHEN** they select "Save and return to overview"
- **THEN** they return to Overview, and re-opening the task page shows the committed input

### Requirement: A page is offered only once its prerequisites are answered and what it asks for is in scope
The system MUST offer a page only when every strictly-earlier answer it depends on has been given and at least one of the things it asks for is in scope for this notification, and MUST otherwise pass over it.

#### Scenario: A page whose prerequisites are unanswered is passed over
- **GIVEN** a notification whose earlier answers a later page depends on have not been given
- **WHEN** the journey reaches the point that page would be offered
- **THEN** the page is not offered, and the journey continues past it

### Requirement: Check your answers, the declaration and the confirmation are reachable only once every task row is ready
The system MUST withhold the review section — check your answers, the declaration and the confirmation — until every task row on Overview is ready, counting a row as ready when it is fulfilled, not applicable, or optional.

#### Scenario: The review section is withheld while a task row is outstanding
- **GIVEN** a notification with a task row that is neither fulfilled, not applicable, nor optional
- **WHEN** the user tries to reach check your answers
- **THEN** the review section is not open to them

#### Scenario: The review section opens once every row is fulfilled, not applicable or optional
- **GIVEN** a notification whose every task row is fulfilled, not applicable or optional
- **WHEN** the user goes to check their answers
- **THEN** check your answers is shown, leading on to the declaration and then the confirmation

### Requirement: A notification created in this session runs an opening sequence of six steps
The system MUST walk a newly created notification through an opening sequence — origin of the import, what are you importing, commodity details, import reason, identification details, then additional details — skipping any step not yet in scope, and MUST deliver the user to Overview after the last step. This order is the opening sequence's own and MUST NOT be assumed to match the order of the flow sections.

#### Scenario: A newly created notification is walked through the opening sequence
- **GIVEN** the user has just created a notification from the dashboard
- **WHEN** they save each page in turn
- **THEN** they are taken through origin of the import, what are you importing, commodity details, import reason, identification details and additional details, in that order

#### Scenario: An opening-sequence step not yet in scope is skipped
- **GIVEN** the user is in the opening sequence and the next step is not yet in scope
- **WHEN** they save the page they are on
- **THEN** they are taken to the next step that is in scope, or to Overview if none remains

#### Scenario: Revisiting an opening-sequence page after the run has finished does not resume it
- **GIVEN** the user has already completed the opening sequence for a notification and reached Overview
- **WHEN** they open one of the opening sequence's own pages again and save it
- **THEN** they return to Overview, not to whatever would be the next step of the sequence

### Requirement: A journey opened out of context is sent to its entry page
The system MUST send a user to the origin of the import page when they open a page of a journey that neither began its opening sequence in this session nor holds any answer the user has entered. The origin page and the pages beneath it MUST be exempt, so the redirect cannot loop, as MUST the actions taken against a notification from the dashboard — amending, cancelling an amendment, copying and deleting.

#### Scenario: A deep link to an unknown journey lands on the entry page
- **GIVEN** a link to a page deep inside a journey that this session did not create and that holds no answers the user entered
- **WHEN** the user opens it
- **THEN** they land on the origin of the import page for that journey

#### Scenario: A journey carrying answers the user entered opens where it was asked for
- **GIVEN** a link to a page inside a journey that already holds an answer the user entered
- **WHEN** the user opens it
- **THEN** that page is shown, rather than the entry page

### Requirement: Only answers the user entered count as starting a journey
The system MUST count only an answer the user gave when deciding whether a journey has been started, and MUST NOT count a value the system populated of its own accord, nor the declaration, which is held only for the length of the session.

#### Scenario: A journey holding only system-populated values is treated as unstarted
- **GIVEN** a journey this session did not create, holding no answers beyond values the system populated itself
- **WHEN** the user opens a page deep inside it
- **THEN** they are sent to the origin of the import page

### Requirement: A collection page reached by changing an answer stays in that context until its own finishing action
The system MUST keep the user on a collection page — one that holds several records, such as identification details or accompanying documents — reached by changing an answer from check your answers, across any add or remove they make there, rather than returning to check your answers after each one. Only the page's own finishing action MUST return them to check your answers, at which point it MUST show the change they made.

#### Scenario: Adding and removing identification records while changing stays on that page until finishing
- **GIVEN** the user has followed a Change link from check your answers to a commodity's identification records
- **WHEN** they remove a record and add a replacement, saving each in turn
- **THEN** they remain on the identification details page throughout
- **WHEN** they choose the page's finishing action
- **THEN** they return to check your answers, now showing the replacement record

#### Scenario: Adding a further document while changing stays on that page until finishing
- **GIVEN** the user has followed a Change link from check your answers to the accompanying documents
- **WHEN** they add a further document
- **THEN** they remain on the accompanying documents page, and the added document is shown there
- **WHEN** they choose the page's finishing action
- **THEN** they return to check your answers, now showing the added document

### Requirement: A journey reached out of context works from Overview rather than resuming the opening sequence
The system MUST NOT resume the opening sequence for a journey the user was redirected to the entry page for, and MUST return them to Overview when they save that page, so they continue by choosing tasks rather than being walked through the sequence.

#### Scenario: Saving the entry page after a redirect leads to Overview
- **GIVEN** the user was sent to the origin of the import page because the journey had no opening sequence in this session
- **WHEN** they save that page
- **THEN** they arrive at Overview, not the next step of the opening sequence
