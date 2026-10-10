# Import Reason Page Specification

## Purpose

Asks why the consignment is being imported, and — for the internal market reason — what it is for. The page is titled "Main import reason", asking "What is the main reason for importing the animals?" as its (visually hidden) question.

## Requirements

### Requirement: The page asks the reason for importing, with nothing chosen in advance
**ID**: REQ-IMPORT-REASON-001
The system MUST ask the user their reason for importing the consignment, offering the available reasons and a save-and-continue action, and MUST leave every reason unchosen when the page is first opened.

#### Scenario: The page presents its question with no reason preselected
**ID**: SCN-IMPORT-REASON-001-A
- **GIVEN** the user has reached the import reason page without answering it before
- **WHEN** the page loads
- **THEN** it asks the reason for importing, offering the available reasons and a save-and-continue action
- **AND** no reason is shown as chosen

### Requirement: A chosen reason is accepted
**ID**: REQ-IMPORT-REASON-002
The system MUST accept a chosen import reason, saving it without error.

#### Scenario: Choosing a reason saves without error
**ID**: SCN-IMPORT-REASON-002-A
- **GIVEN** the user is on the import reason page
- **WHEN** they choose the "Internal market" reason and save and continue
- **THEN** the answer is saved and no error summary is shown

### Requirement: The internal market reason reveals a follow-up purpose question
**ID**: REQ-IMPORT-REASON-003
The system MUST reveal a purpose question when the user chooses the internal market reason, MUST leave its options unchosen until answered, and MUST accept the reason and purpose together.

#### Scenario: Choosing internal market reveals the purpose question and accepts an answer to it
**ID**: SCN-IMPORT-REASON-003-A
- **GIVEN** the user is on the import reason page
- **WHEN** they choose the "Internal market" reason
- **THEN** a purpose question appears, with no purpose shown as chosen
- **WHEN** they choose a purpose and save and continue
- **THEN** both answers are saved and no error summary is shown

### Requirement: The port of exit is chosen from the same list as the port of entry
**ID**: REQ-IMPORT-REASON-004
The system MUST offer, for the port of exit under each reason that asks it, the same ports as the port of entry, in the same order, after the placeholder "Select one", each reading "<port name> - <port code>", and MUST save the chosen port's code and show it as chosen when the page is reopened.

#### Scenario: The port of exit offers the port of entry's list
**ID**: SCN-IMPORT-REASON-004-A
- **GIVEN** the reason for importing calls for a port of exit
- **WHEN** the user answers it
- **THEN** the ports offered are those offered for the port of entry

#### Scenario: Each port of exit reads its name, a dash and its code, in the port of entry's order
**ID**: SCN-IMPORT-REASON-004-B
- **GIVEN** the user has chosen "Transit" or "Temporary admission horses"
- **WHEN** the port of exit list is read in full
- **THEN** after the placeholder "Select one" it holds every port, airports first, then seaports, then rail ports, each group A to Z by name
- **AND** each reads "<port name> - <port code>", for example "Aberdeen Harbour - GB ABD"

#### Scenario: A chosen port of exit is kept and offered back
**ID**: SCN-IMPORT-REASON-004-C
- **GIVEN** the user has chosen "Transit"
- **WHEN** they choose a port of exit, answer the destination country and save and continue
- **THEN** no error is shown
- **AND** when they reopen the page that port of exit is shown as chosen

### Requirement: A reason needing more than the purpose question reveals its own questions inline, under that reason
**ID**: REQ-IMPORT-REASON-005
The system MUST reveal Transit's own questions — the port of exit, then the destination country — inline under the Transit option; MUST reveal Transhipment or onward travel's own question — the destination country alone — inline under that option; and MUST reveal Temporary admission of horses' own questions — the exit date, then the port of exit — inline under that option.

#### Scenario: Transit reveals the port of exit and then the destination country
**ID**: SCN-IMPORT-REASON-005-A
- **GIVEN** the user is on the import reason page
- **WHEN** they choose "Transit"
- **THEN** the port of exit and then the destination country are asked for inline, under that option

#### Scenario: Transhipment or onward travel reveals the destination country alone
**ID**: SCN-IMPORT-REASON-005-B
- **GIVEN** the user is on the import reason page
- **WHEN** they choose "Transhipment or onward travel"
- **THEN** only the destination country is asked for inline, under that option

#### Scenario: Temporary admission of horses reveals the exit date and then the port of exit
**ID**: SCN-IMPORT-REASON-005-C
- **GIVEN** the user is on the import reason page
- **WHEN** they choose "Temporary admission of horses"
- **THEN** the exit date and then the port of exit are asked for inline, under that option

### Requirement: An incompletely answered reveal is rejected on save and continue without closing it, keeping what was already answered
**ID**: REQ-IMPORT-REASON-006
The system MUST refuse to save and continue from a reason whose revealed questions are only partly answered, MUST NOT refuse the page for that on save and return to overview, MUST focus the unanswered question while keeping the reveal open, and MUST keep any answer already given to another question in the same reveal.

#### Scenario: Answering only the port of exit under Transit is rejected, keeping the port and the reveal open
**ID**: SCN-IMPORT-REASON-006-A
- **GIVEN** the user has chosen "Transit" and answered the port of exit but not the destination country
- **WHEN** they save and continue
- **THEN** an error focuses the destination country, with the reveal still open
- **AND** the port of exit they already answered is still held

#### Scenario: Save and return to overview saves a partly answered reveal and returns to Overview
**ID**: SCN-IMPORT-REASON-006-B
- **GIVEN** the user has chosen "Transit" and left the port of exit and the destination country blank
- **WHEN** they save and return to overview
- **THEN** they return to Overview with no error shown
- **AND** re-opening the page shows "Transit" still chosen

### Requirement: An invalid submitted reason is refused without preserving it
**ID**: REQ-IMPORT-REASON-007
The system MUST refuse to save when the submitted import reason is not one of the available reasons, link the resulting error to and focus the reason question, and MUST NOT leave an invalid reason shown as chosen.

#### Scenario: An invalid reason is rejected and not preserved
**ID**: SCN-IMPORT-REASON-007-A
- **GIVEN** the user is on the import reason page
- **WHEN** they submit a reason that is not one of the available options and save
- **THEN** the save is refused, an error links to and focuses the reason question, with no reason shown as chosen

### Requirement: The back link returns to what are you importing in the opening sequence, and to Overview otherwise
**ID**: REQ-IMPORT-REASON-008
The system MUST return the user to the commodity selection page ("What are you importing?") when they follow the back link from the main import reason page during the opening sequence, and to Overview when the page was opened from its Overview task.

#### Scenario: The back link opens Overview when the page was opened from Overview
**ID**: SCN-IMPORT-REASON-008-A
- **GIVEN** the opening sequence has ended and the user opened main import reason from its task on Overview
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: In the opening sequence, the back link opens what are you importing
**ID**: SCN-IMPORT-REASON-008-B
- **GIVEN** the user is in the opening sequence and reached main import reason from what are you importing
- **WHEN** they follow the back link
- **THEN** "What are you importing?" is shown

### Requirement: The destination country is chosen from the origin countries and their territories, each territory named with its country
**ID**: REQ-IMPORT-REASON-009
The system MUST offer, for the destination country under both Transit and Transhipment or onward travel, the placeholder "Select one" and then the origin countries and their territories that the reference data service serves, in one alphabetical list, naming each territory "<territory> (<country>)" with its country's served name.

#### Scenario: The transhipment destination country offers the origin countries and their territories
**ID**: SCN-IMPORT-REASON-009-A
- **GIVEN** the user has chosen "Transhipment or onward travel"
- **WHEN** the destination country list is read in full
- **THEN** after the placeholder "Select one" it holds exactly the origin countries and territories the reference data service serves, by their served names, in alphabetical order

#### Scenario: The transit destination country offers the same places
**ID**: SCN-IMPORT-REASON-009-B
- **GIVEN** the user has chosen "Transit"
- **WHEN** the destination country list is read in full
- **THEN** it holds the same places as under "Transhipment or onward travel"

#### Scenario: Each territory is named with its country
**ID**: SCN-IMPORT-REASON-009-C
- **GIVEN** either destination country list
- **WHEN** a territory is read
- **THEN** it reads "<territory> (<country>)", for example "Canary Islands (Spain)"

### Requirement: A chosen destination country, a territory included, is kept and offered back
**ID**: REQ-IMPORT-REASON-010
The system MUST save a territory chosen as the destination country without an error, and MUST show the saved destination country, a territory or a country saved before territories were offered, as chosen when the page is reopened.

#### Scenario: A territory chosen as the destination country is kept
**ID**: SCN-IMPORT-REASON-010-A
- **GIVEN** the user has chosen a reason that asks the destination country
- **WHEN** they choose a territory and save and continue
- **THEN** no error is shown
- **AND** when they reopen the page the territory is shown as chosen

#### Scenario: A destination country saved before territories were offered is still shown
**ID**: SCN-IMPORT-REASON-010-B
- **GIVEN** the notification holds a destination country from the country list
- **WHEN** the user reopens the page
- **THEN** that country is shown as chosen

### Requirement: The page is headed and titled Main import reason
**ID**: REQ-IMPORT-REASON-011
The system MUST head the page "Main import reason" and give it the browser title "Main import reason - Import notification service - GOV.UK".

#### Scenario: The page reads Main import reason in its heading and browser title
**ID**: SCN-IMPORT-REASON-011-A
- **GIVEN** the user opens the import reason page
- **WHEN** it loads
- **THEN** its heading reads "Main import reason"
- **AND** the browser title reads "Main import reason - Import notification service - GOV.UK"
- **AND** "Main reason for import" does not appear on the page

### Requirement: Each destination country and port of exit select opens on Select one, with no divider
**ID**: REQ-IMPORT-REASON-012
The system MUST start every destination country and port of exit select on the page with an empty option reading "Select one", selected while nothing is chosen, followed straight by the places or ports with no divider line.

#### Scenario: A destination country select opens on Select one
**ID**: SCN-IMPORT-REASON-012-A
- **GIVEN** the user has chosen "Transhipment or onward travel" or "Transit"
- **WHEN** the destination country list is read
- **THEN** its first option reads "Select one" and is selected
- **AND** the next option is the first place, with no divider line between

#### Scenario: A port of exit select opens on Select one
**ID**: SCN-IMPORT-REASON-012-B
- **GIVEN** the user has chosen "Transit" or "Temporary admission horses"
- **WHEN** the port of exit list is read
- **THEN** its first option reads "Select one" and is selected
- **AND** the next option is the first port, with no divider line between
