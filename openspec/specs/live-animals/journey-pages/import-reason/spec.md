# Import Reason Page Specification

## Purpose

Asks why the consignment is being imported, and — for the internal market reason — what it is for. The page is titled "What is the main reason for importing the animals?".

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
The system MUST offer the same list of ports for the port of exit, which this page asks for under the reasons that call for it, as it offers for the port of entry.

#### Scenario: The port of exit offers the port of entry's list
**ID**: SCN-IMPORT-REASON-004-A
- **GIVEN** the reason for importing calls for a port of exit
- **WHEN** the user answers it
- **THEN** the ports offered are those offered for the port of entry

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

### Requirement: An incompletely answered reveal is rejected without closing it, keeping what was already answered
**ID**: REQ-IMPORT-REASON-006
The system MUST refuse to save a reason whose revealed questions are only partly answered, MUST focus the unanswered question while keeping the reveal open, and MUST keep any answer already given to another question in the same reveal.

#### Scenario: Answering only the port of exit under Transit is rejected, keeping the port and the reveal open
**ID**: SCN-IMPORT-REASON-006-A
- **GIVEN** the user has chosen "Transit" and answered the port of exit but not the destination country
- **WHEN** they save and continue
- **THEN** an error focuses the destination country, with the reveal still open
- **AND** the port of exit they already answered is still held

### Requirement: An invalid submitted reason is refused without preserving it
**ID**: REQ-IMPORT-REASON-007
The system MUST refuse to save when the submitted import reason is not one of the available reasons, link the resulting error to and focus the reason question, and MUST NOT leave an invalid reason shown as chosen.

#### Scenario: An invalid reason is rejected and not preserved
**ID**: SCN-IMPORT-REASON-007-A
- **GIVEN** the user is on the import reason page
- **WHEN** they submit a reason that is not one of the available options and save
- **THEN** the save is refused, an error links to and focuses the reason question, with no reason shown as chosen

### Requirement: The back link returns to Overview
**ID**: REQ-IMPORT-REASON-008
The system MUST return the user to Overview when they follow the back link from the import reason page.

#### Scenario: The back link opens Overview
**ID**: SCN-IMPORT-REASON-008-A
- **GIVEN** the user is on the import reason page
- **WHEN** they follow the back link
- **THEN** Overview is shown
