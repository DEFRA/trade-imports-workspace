# Additional Details Page Specification

## Purpose

Asks the further questions a consignment's commodities call for — what the animals are certified for, and whether any are unweaned. The page is titled "Additional details".

## Requirements

### Requirement: The page asks what the animals are certified for and whether any are unweaned, with nothing chosen in advance
The system MUST ask the user what the consignment's animals are certified for, offering the certification purposes the service currently holds, and whether it contains unweaned animals, offering a save-and-continue action, and MUST leave both questions unanswered when the page is first opened.

#### Scenario: The page presents its questions with nothing preselected
- **GIVEN** the user has reached the additional details page without answering it before
- **WHEN** the page loads
- **THEN** it asks what the animals are certified for, offering the certification purposes the service currently holds, and whether the consignment contains unweaned animals, offering a save-and-continue action
- **AND** neither question shows an answer as chosen

### Requirement: A complete set of additional details is accepted, and persists
The system MUST accept the additional details once both questions are answered, saving them without error, and MUST show the same answers when the page is reopened.

#### Scenario: Answering both questions saves without error
- **GIVEN** the user is on the additional details page
- **WHEN** they answer what the animals are certified for and that the consignment contains no unweaned animals, then save and continue
- **THEN** the answers are saved and no error summary is shown

#### Scenario: Saved answers are shown again on reopening
- **GIVEN** the user has saved both answers on the additional details page
- **WHEN** they reopen the page
- **THEN** both answers are still shown as chosen

### Requirement: An invalid answer to one question is refused without discarding a valid answer to the other
The system MUST refuse to save an invalid answer to either question, link the resulting error to and focus that question, and MUST preserve a valid answer already given to the other question.

#### Scenario: An invalid certification purpose is refused, keeping a valid unweaned answer
- **GIVEN** the user has validly answered the unweaned question
- **WHEN** they submit an invalid certification purpose and save
- **THEN** the save is refused, an error links to and focuses the certification question, with nothing shown as chosen there
- **AND** the unweaned question still shows the answer already given

#### Scenario: An invalid unweaned answer is refused, keeping a valid certification purpose
- **GIVEN** the user has validly answered the certification question
- **WHEN** they submit an invalid unweaned answer and save
- **THEN** the save is refused, an error links to and focuses the unweaned question, with nothing shown as chosen there
- **AND** the certification question still shows the purpose already chosen

### Requirement: The back link returns to Overview
The system MUST return the user to Overview when they follow the back link from the additional details page.

#### Scenario: The back link opens Overview
- **GIVEN** the user is on the additional details page
- **WHEN** they follow the back link
- **THEN** Overview is shown
