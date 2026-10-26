# Overview Page Specification

## Purpose

The task list a user works a notification from, listing every task under numbered section headings and letting them be answered in any order. The page is titled "Overview". While a template is being created the page is the template's task list, specified by live-animals/notification-templates (REQ-TEMPLATES-008 to REQ-TEMPLATES-011).

## Requirements

### Requirement: Overview groups the notification's tasks under six fixed, numbered sections
**ID**: REQ-OVERVIEW-001
For a notification, the system MUST group its tasks on the Overview page under six numbered section headings, in a fixed order, with one task list per section.

#### Scenario: A fresh notification's Overview lists its always-present tasks under the six sections
**ID**: SCN-OVERVIEW-001-A
- **GIVEN** a new notification has just been started
- **WHEN** the user views Overview
- **THEN** it shows six numbered section headings in order: "1. About the consignment", "2. Description of the goods", "3. Transport and arrival", "4. Documents", "5. Consignment parties", "6. Contact address"
- **AND** each section lists that notification's always-present tasks (for example, "Where is this consignment coming from?" and "What are you importing?" under the first section)

### Requirement: Each task row shows one of two statuses, and Overview offers a review button open at any point
**ID**: REQ-OVERVIEW-002
For a notification, the system MUST show each task row's status as one of two labels — Complete once it is answered, To do otherwise, never a third or blocked state — and MUST offer a fixed "Review and submit" button, not a task row, that opens the review page at any point in the journey however much of the notification remains outstanding.

#### Scenario: A fresh notification shows an answered task as Complete and an unworked task as To do, both linked
**ID**: SCN-OVERVIEW-002-A
- **GIVEN** a new notification whose entry page has been answered but nothing else
- **WHEN** the user views Overview
- **THEN** the entry task's row shows Complete, with a link
- **AND** a task not yet worked on shows To do, with a link to begin it

#### Scenario: The Review and submit button opens the review before every task is answered
**ID**: SCN-OVERVIEW-002-B
- **GIVEN** a notification with only its entry page answered
- **WHEN** the user views Overview
- **THEN** a "Review and submit" button is offered, not a task row, with no cannot-start-yet state shown anywhere on the page
- **AND** following it opens the review page

### Requirement: Overview's only route off the page is the Return to dashboard action — there is no back link
**ID**: REQ-OVERVIEW-003
For a notification, the system MUST offer a return-to-dashboard action from Overview and take the user to the dashboard, and MUST NOT show a back link, since Overview is the top of the notification rather than a step within it.

#### Scenario: The return action leads to the dashboard, with no back link present
**ID**: SCN-OVERVIEW-003-A
- **GIVEN** the user is on Overview
- **WHEN** they view the page
- **THEN** no back link is shown
- **WHEN** they use the return-to-dashboard action
- **THEN** they arrive at the dashboard

### Requirement: Overview shows running totals of animals and packages from the first visit, defaulting to zero
**ID**: REQ-OVERVIEW-004
The system MUST show, from the first time a notification's Overview is viewed, a running total of the number of animals and a running total of the number of packages declared across the notification's commodity lines, each as a figure with a label and a caption, defaulting to zero before any commodity line has been added.

#### Scenario: Overview shows zero totals before any commodity is added
**ID**: SCN-OVERVIEW-004-A
- **GIVEN** a new notification has just been started, with no commodity line added
- **WHEN** the user views Overview
- **THEN** it shows the animal and package totals as 0, each labelled and captioned

#### Scenario: Overview totals the animals and packages entered so far
**ID**: SCN-OVERVIEW-004-B
- **GIVEN** the user has added a commodity line and entered its number of animals and number of packages
- **WHEN** they view Overview
- **THEN** it shows the total number of animals and the total number of packages, each labelled and captioned

### Requirement: The Identification details task appears only once a chosen commodity requires it, and sits between Commodity details and Additional details
**ID**: REQ-OVERVIEW-005
The system MUST omit the Identification details task row from the "Description of the goods" section until a chosen commodity requires identifiers, MUST show it, linked, once one does, and MUST list it after Commodity details and before Additional details.

#### Scenario: No commodity chosen means no identification row
**ID**: SCN-OVERVIEW-005-A
- **GIVEN** a new notification with no commodity chosen
- **WHEN** the user views Overview
- **THEN** no Identification details row is shown in the second section

#### Scenario: Choosing a commodity that needs identifiers reveals the row in its place
**ID**: SCN-OVERVIEW-005-B
- **GIVEN** the user has chosen a commodity that carries identifiers
- **WHEN** they view Overview
- **THEN** the second section lists Commodity details, then Identification details, then Additional details, in that order

### Requirement: Commodity details is its own task, completing only once its numbers are saved
**ID**: REQ-OVERVIEW-006
The system MUST show Commodity details as a task row of its own, separate from the commodity-choice row, linking to the consignment-details page, and MUST mark it Complete only once its numbers have been saved, leaving every other row's status unaffected.

#### Scenario: Commodity details stays To do until its numbers are saved
**ID**: SCN-OVERVIEW-006-A
- **GIVEN** a commodity has been chosen but its numbers not yet entered
- **WHEN** the user views Overview
- **THEN** Commodity details shows To do, linking to the consignment-details page, while the commodity-choice row shows Complete

#### Scenario: Commodity details reads Complete once its numbers are saved
**ID**: SCN-OVERVIEW-006-B
- **GIVEN** the commodity's numbers have been saved
- **WHEN** the user views Overview
- **THEN** Commodity details reads Complete, and the other rows' statuses are unchanged

### Requirement: Only the Roles and addresses row carries hint text
**ID**: REQ-OVERVIEW-007
The system MUST show every task row as a bare link with a status, except Roles and addresses, which alone MUST carry a hint naming the parties it collects.

#### Scenario: Roles and addresses is the only row with a hint
**ID**: SCN-OVERVIEW-007-A
- **GIVEN** the user views Overview
- **WHEN** the task rows are examined
- **THEN** only the Roles and addresses row carries hint text, naming Consignor or Exporter, Consignee, Importer and Place of Destination

### Requirement: Main import reason completes on the reason's own answers, apart from Additional details
**ID**: REQ-OVERVIEW-008
The system MUST mark the Main import reason task Complete once an allowed reason and the questions it opens are saved — Internal market with a purpose; Transhipment or onward travel with a destination country; Transit with a port of exit and a destination country; Temporary admission horses with an exit date and a port of exit; Re-entry alone — whether or not Additional details is answered, and MUST NOT mark it Complete while no reason is saved.

#### Scenario: The reason task completes while Additional details is still to do
**ID**: SCN-OVERVIEW-008-A
- **GIVEN** an allowed reason and its questions are saved and Additional details is unanswered
- **WHEN** the user views Overview
- **THEN** Main import reason reads Complete
- **AND** Additional details reads To do

#### Scenario: The reason task is not complete with no reason saved
**ID**: SCN-OVERVIEW-008-B
- **GIVEN** no reason is saved
- **WHEN** the user views Overview
- **THEN** Main import reason reads To do

### Requirement: Where is this consignment coming from? completes only once the country and the region code question are answered
**ID**: REQ-OVERVIEW-009
The system MUST mark the "Where is this consignment coming from?" task Complete only once a country is chosen and the region of origin code question is answered, with a code given when the answer is Yes, and MUST NOT mark it Complete while either is missing.

#### Scenario: A country with the region question unanswered is not complete
**ID**: SCN-OVERVIEW-009-A
- **GIVEN** a country is saved and the region of origin code question is unanswered
- **WHEN** the user views Overview
- **THEN** "Where is this consignment coming from?" does not read Complete

#### Scenario: A country with No is complete
**ID**: SCN-OVERVIEW-009-B
- **GIVEN** a country is saved and the answer is that no region code is required
- **WHEN** the user views Overview
- **THEN** "Where is this consignment coming from?" reads Complete

#### Scenario: A country with Yes and a code is complete
**ID**: SCN-OVERVIEW-009-C
- **GIVEN** a country is saved, a region code is required and the code is given
- **WHEN** the user views Overview
- **THEN** "Where is this consignment coming from?" reads Complete

### Requirement: The third task of About the consignment is Main import reason
**ID**: REQ-OVERVIEW-011
The system MUST title the third task of "1. About the consignment" "Main import reason".

#### Scenario: The first section lists Main import reason third
**ID**: SCN-OVERVIEW-011-A
- **GIVEN** a new notification has just been started
- **WHEN** the user views Overview
- **THEN** "1. About the consignment" lists "Where is this consignment coming from?", "What are you importing?" and "Main import reason", in that order

### Requirement: The Transit countries task appears only when transit countries are owed, between Arrival details and Transport details
**ID**: REQ-OVERVIEW-012
The system MUST show the "Transit countries" task in "3. Transport and arrival" only once the saved means of transport is Rail or Road, MUST list it after "Arrival details" and before "Transport details", and MUST show it To do until at least one transit country is saved, then Complete.

#### Scenario: A chosen commodity travelling by rail or road shows the task in its place
**ID**: SCN-OVERVIEW-012-B
- **GIVEN** a commodity is chosen and Rail or Road is saved as the means of transport
- **WHEN** the user views Overview
- **THEN** the third section lists "Arrival details", "Transit countries" and "Transport details", in that order
- **AND** "Transit countries" reads To do

#### Scenario: The task completes once a country is saved
**ID**: SCN-OVERVIEW-012-C
- **GIVEN** a commodity is chosen, Rail or Road is saved and no transit country is saved
- **WHEN** the user saves at least one transit country and views Overview
- **THEN** "Transit countries" reads Complete

#### Scenario: A consignment travelling by air has no Transit countries task
**ID**: SCN-OVERVIEW-012-D
- **GIVEN** a cat is chosen
- **WHEN** the user views Overview before arrival details are saved, and again after Air is saved
- **THEN** no "Transit countries" task is shown

### Requirement: Arrival details stops reading Complete once its saved arrival date is more than 7 days in the past
**ID**: REQ-OVERVIEW-013
The system MUST measure a saved arrival date against the allowed arrival window each time Overview is viewed, and MUST show "Arrival details" as To do once that date is more than 7 days in the past, however completely the task was answered when it was saved.

#### Scenario: A saved arrival date more than 7 days in the past reads To do
**ID**: SCN-OVERVIEW-013-A
- **GIVEN** arrival details were saved complete, and the saved arrival date is now more than 7 days in the past
- **WHEN** the user views Overview
- **THEN** "Arrival details" reads To do

#### Scenario: A saved arrival date exactly 7 days in the past still reads Complete
**ID**: SCN-OVERVIEW-013-B
- **GIVEN** arrival details were saved complete, and the saved arrival date is exactly 7 days in the past
- **WHEN** the user views Overview
- **THEN** "Arrival details" reads Complete
