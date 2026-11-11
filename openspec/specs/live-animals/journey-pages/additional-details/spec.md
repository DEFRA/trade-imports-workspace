# Additional Details Page Specification

## Purpose

**Maturity**: detailing

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
The system MUST refuse to save an invalid answer to either question, on save and continue and on save and return to overview alike, showing "Select a valid option" as the error, link the resulting error to and focus that question, and MUST preserve a valid answer already given to the other question.

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

#### Scenario: Save and return to overview refuses the same invalid certification purpose, keeping a valid unweaned answer
**ID**: SCN-ADDL-DETAILS-003-C
- **GIVEN** the user has validly answered the unweaned question
- **WHEN** they submit an invalid certification purpose and choose save and return to overview
- **THEN** the save is refused, an error links to and focuses the certification question, with nothing shown as chosen there
- **AND** the unweaned question still shows the answer already given

#### Scenario: Save and return to overview refuses the same invalid unweaned answer, keeping a valid certification purpose
**ID**: SCN-ADDL-DETAILS-003-D
- **GIVEN** the user has validly answered the certification question
- **WHEN** they submit an invalid unweaned answer and choose save and return to overview
- **THEN** the save is refused with "Select a valid option" for the unweaned question and nothing is saved
- **AND** the certification question still shows the purpose already chosen

### Requirement: The back link returns to where the user came from
**ID**: REQ-ADDL-DETAILS-004
The system MUST return the user, when they follow the back link from the additional details page, to the page they saved and continued from, to Overview when they opened it from its Overview task, and to the review when they opened it from a Change link on the review, as `live-animals/journey-flow` describes. That page is Identification details, or Commodity details when nothing chosen needs identifiers.

#### Scenario: After Save and continue, the back link opens the page before
**ID**: SCN-ADDL-DETAILS-004-A
- **GIVEN** the user reached the additional details page by saving and continuing from Identification details, or Commodity details when nothing chosen needs identifiers
- **WHEN** they follow the back link
- **THEN** that page is shown

#### Scenario: The back link opens Overview when the page was opened from Overview
**ID**: SCN-ADDL-DETAILS-004-B
- **GIVEN** the user opened the additional details page from its task on Overview
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: The back link opens the review when the page was opened from a Change link
**ID**: SCN-ADDL-DETAILS-004-C
- **GIVEN** the review of a draft notification
- **WHEN** the user follows the Change link that opens the additional details page and then the back link
- **THEN** the review is shown

### Requirement: The unweaned question is asked only when the consignment's commodities call for it
**ID**: REQ-ADDL-DETAILS-005
The system MUST ask whether the consignment contains unweaned animals only when at least one commodity line on the notification is one the service treats as capable of being unweaned, and MUST ask only what the animals are certified for otherwise. A save without an unweaned answer MUST be accepted when the question is not asked.

#### Scenario: A consignment with no unweaned-eligible commodity is not asked about unweaned animals
**ID**: SCN-ADDL-DETAILS-005-A
- **GIVEN** the user has reached the additional details page for a consignment whose commodity lines are not among those the service treats as capable of being unweaned
- **WHEN** the page loads
- **THEN** only the certification question is shown
- **AND** the page can be saved and continued without answering an unweaned question

#### Scenario: A consignment with an unweaned-eligible commodity is asked about unweaned animals
**ID**: SCN-ADDL-DETAILS-005-B
- **GIVEN** the user has reached the additional details page for a consignment at least one of whose commodity lines is among those the service treats as capable of being unweaned
- **WHEN** the page loads
- **THEN** it asks the unweaned question alongside the certification question, with the unweaned question's hint and both of its options
- **AND** an answer given to the unweaned question is saved and still shown as chosen when the page is reopened

### Requirement: The certification question names the ITAHC as where its answer is found
**ID**: REQ-ADDL-DETAILS-006
The system MUST hint the certification question "You can find this information on the ITAHC."

#### Scenario: The certification question carries the ITAHC hint
**ID**: SCN-ADDL-DETAILS-006-A
- **GIVEN** the user is on the additional details page
- **WHEN** the page loads
- **THEN** the question asking what the animals are certified for is hinted "You can find this information on the ITAHC."

### Requirement: Both save actions accept the page with neither question answered
**ID**: REQ-ADDL-DETAILS-007
The system MUST accept the additional details page, on save and continue and on save and return to overview alike, when neither question has been answered, saving the blank answers.

#### Scenario: Save and return to overview accepts the page with both questions left blank
**ID**: SCN-ADDL-DETAILS-007-A
- **GIVEN** the user is on the additional details page with neither question answered
- **WHEN** they choose save and return to overview
- **THEN** the blank answers are saved
- **AND** reopening the page shows neither question answered
