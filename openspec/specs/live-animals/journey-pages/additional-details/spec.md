# Additional Details Page Specification

## Purpose

Asks the further questions a consignment's commodities call for — what the animals are certified for, and whether any are unweaned. The page is titled "Additional details".

## Requirements

### Requirement: The page asks what the animals are certified for and whether any are unweaned, with nothing chosen in advance
**ID**: REQ-ADDL-DETAILS-001
The system MUST ask the user what the consignment's animals are certified for, offering the certification purposes the service currently holds, and whether it contains unweaned animals, offering a save-and-continue action, and MUST leave both questions unanswered when the page is first opened.

#### Scenario: The page presents its questions with nothing preselected
**ID**: SCN-ADDL-DETAILS-001-A
- **GIVEN** the user has reached the additional details page without answering it before
- **WHEN** the page loads
- **THEN** it asks what the animals are certified for, offering the certification purposes the service currently holds, and whether the consignment contains unweaned animals, offering a save-and-continue action
- **AND** neither question shows an answer as chosen

### Requirement: A complete set of additional details is accepted, and persists
**ID**: REQ-ADDL-DETAILS-002
The system MUST accept the additional details once both questions are answered, saving them without error, and MUST show the same answers when the page is reopened.

#### Scenario: Answering both questions saves without error
**ID**: SCN-ADDL-DETAILS-002-A
- **GIVEN** the user is on the additional details page
- **WHEN** they answer what the animals are certified for and that the consignment contains no unweaned animals, then save and continue
- **THEN** the answers are saved and no error summary is shown

#### Scenario: Saved answers are shown again on reopening
**ID**: SCN-ADDL-DETAILS-002-B
- **GIVEN** the user has saved both answers on the additional details page
- **WHEN** they reopen the page
- **THEN** both answers are still shown as chosen

### Requirement: An invalid answer to one question is refused without discarding a valid answer to the other
**ID**: REQ-ADDL-DETAILS-003
The system MUST refuse to save an invalid answer to either question, link the resulting error to and focus that question, and MUST preserve a valid answer already given to the other question.

#### Scenario: An invalid certification purpose is refused, keeping a valid unweaned answer
**ID**: SCN-ADDL-DETAILS-003-A
- **GIVEN** the user has validly answered the unweaned question
- **WHEN** they submit an invalid certification purpose and save
- **THEN** the save is refused, an error links to and focuses the certification question, with nothing shown as chosen there
- **AND** the unweaned question still shows the answer already given

#### Scenario: An invalid unweaned answer is refused, keeping a valid certification purpose
**ID**: SCN-ADDL-DETAILS-003-B
- **GIVEN** the user has validly answered the certification question
- **WHEN** they submit an invalid unweaned answer and save
- **THEN** the save is refused, an error links to and focuses the unweaned question, with nothing shown as chosen there
- **AND** the certification question still shows the purpose already chosen

### Requirement: The back link returns to the page before it in the opening sequence, and to Overview otherwise
**ID**: REQ-ADDL-DETAILS-004
The system MUST return the user, when they follow the back link from the additional details page during the opening sequence, to identification details when any chosen commodity needs identifiers and to commodity details otherwise, and MUST return them to Overview when the page was opened from its Overview task.

#### Scenario: The back link opens Overview when the page was opened from Overview
**ID**: SCN-ADDL-DETAILS-004-A
- **GIVEN** the opening sequence has ended and the user opened additional details from its task on Overview
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: In the opening sequence, the back link opens identification details when a chosen commodity needs identifiers
**ID**: SCN-ADDL-DETAILS-004-B
- **GIVEN** the user is in the opening sequence with cattle chosen and reached additional details from identification details
- **WHEN** they follow the back link
- **THEN** identification details is shown

#### Scenario: In the opening sequence, the back link opens commodity details when nothing chosen needs identifiers
**ID**: SCN-ADDL-DETAILS-004-C
- **GIVEN** the user is in the opening sequence with only Atlantic salmon chosen and reached additional details from commodity details
- **WHEN** they follow the back link
- **THEN** commodity details is shown

### Requirement: The unweaned question is asked only when the consignment's commodities call for it
**ID**: REQ-ADDL-DETAILS-005
The system MUST ask whether the consignment contains unweaned animals only when at least one commodity line on the notification is one the service treats as capable of being unweaned, and MUST ask only what the animals are certified for otherwise. A save without an unweaned answer MUST be accepted when the question is not asked.

#### Scenario: A consignment with no unweaned-eligible commodity is not asked about unweaned animals
**ID**: SCN-ADDL-DETAILS-005-A
- **GIVEN** the user has reached the additional details page for a consignment whose commodity lines are not among those the service treats as capable of being unweaned
- **WHEN** the page loads
- **THEN** only the certification question is shown
- **AND** the page can be saved and continued without answering an unweaned question

### Requirement: The certification question names the ITAHC as where its answer is found
**ID**: REQ-ADDL-DETAILS-006
The system MUST hint the certification question "You can find this information on the ITAHC."

#### Scenario: The certification question carries the ITAHC hint
**ID**: SCN-ADDL-DETAILS-006-A
- **GIVEN** the user is on the additional details page
- **WHEN** the page loads
- **THEN** the question asking what the animals are certified for is hinted "You can find this information on the ITAHC."
