# CPH Number Page Specification

## Purpose

Asks for the County Parish Holding number the consignment's commodities call for, entered as three separate boxes rather than one field. The page is titled "Add the county parish holding number (CPH)". Reached from the addresses page, so it ends with its primary action alone (`live-animals/journey-flow`'s REQ-FLOW-012).

## Requirements

### Requirement: The page asks for the CPH number as three labelled, sized boxes, starting empty
**ID**: REQ-CPH-001
The system MUST ask the user for the CPH number as three separate boxes — county (2 digits), parish (3 digits), holding number (4 digits) — each visibly labelled and sized to its digit count, grouped under one legend and hint describing the whole number, and MUST leave every box empty when the page is first opened.

#### Scenario: The page presents three labelled, sized boxes with nothing entered
**ID**: SCN-CPH-001-A
- **GIVEN** the user has reached the CPH number page without answering it before
- **WHEN** the page loads
- **THEN** it shows a county box, a parish box and a holding number box, each visibly labelled and sized to 2, 3 and 4 digits respectively
- **AND** all three boxes are empty

#### Scenario: The group carries one hint describing the whole number
**ID**: SCN-CPH-001-B
- **GIVEN** the user is on the CPH number page
- **WHEN** they read the group
- **THEN** one hint describes the whole CPH number, not a separate hint per box

### Requirement: A CPH number entered across the three boxes is accepted, saved as nine digits, and split back on return
**ID**: REQ-CPH-002
The system MUST accept a complete, validly formatted CPH number entered across the three boxes, saving it without error as nine plain digits, and MUST show it split back into its three boxes when the user returns to the page.

#### Scenario: Entering a complete CPH number saves without error
**ID**: SCN-CPH-002-A
- **GIVEN** the user is on the CPH number page
- **WHEN** they fill all three boxes with a validly formatted CPH number and save and continue
- **THEN** the answer is saved and no error summary is shown

#### Scenario: Returning to the page splits the saved number back into its three boxes
**ID**: SCN-CPH-002-B
- **GIVEN** the user has saved a complete CPH number
- **WHEN** they return to the CPH number page
- **THEN** the county, parish and holding boxes each show their own part of the saved number

### Requirement: Submitting the page untouched asks the whole question again, at the first box
**ID**: REQ-CPH-003
The system MUST refuse to save the CPH number page when every box is left empty, showing a single error that asks for the CPH number as a whole and focuses the county box, rather than naming all three boxes as separately missing.

#### Scenario: Submitting with every box empty names the whole question once
**ID**: SCN-CPH-003-A
- **GIVEN** the user is on the CPH number page with every box empty
- **WHEN** they save and continue
- **THEN** one error asks for the CPH number
- **AND** following it focuses the county box, still empty

### Requirement: Each box is validated on its own length and digits, and every wrong box is named at once
**ID**: REQ-CPH-004
The system MUST reject a box that is not exactly its required number of digits, and separately reject one containing a non-digit character, each with an error naming that specific box, MUST preserve every box's typed value, and MUST report every box that is wrong at the same time rather than one at a time. The error MUST mark the group as a whole rather than each box individually.

#### Scenario: A box of the wrong length is named, keeping every value typed
**ID**: SCN-CPH-004-A
- **GIVEN** the user has filled all three boxes but one is the wrong length
- **WHEN** they save and continue
- **THEN** an error names that box's length requirement
- **AND** following it focuses that box, still holding what was typed
- **AND** every other box still shows what was typed

#### Scenario: A box left blank while others are filled is named specifically
**ID**: SCN-CPH-004-B
- **GIVEN** the user has filled two of the three boxes and left one blank
- **WHEN** they save and continue
- **THEN** an error names the blank box specifically, not the CPH number as a whole

#### Scenario: A box containing a non-digit character is named, keeping what was typed
**ID**: SCN-CPH-004-C
- **GIVEN** the user has typed a non-digit character into one box
- **WHEN** they save and continue
- **THEN** an error explains that box accepts only digits
- **AND** following it focuses that box, still holding what was typed

#### Scenario: Every wrong box is named at once, not one at a time
**ID**: SCN-CPH-004-D
- **GIVEN** the user has entered a wrong-length value in more than one box
- **WHEN** they save and continue
- **THEN** an error is shown naming each wrong box

#### Scenario: The error marks the group, not the individual boxes
**ID**: SCN-CPH-004-E
- **GIVEN** the user has submitted the page with one or more boxes wrong
- **WHEN** the error is shown
- **THEN** one error message is attached to the group as a whole
- **AND** every box in the group is styled to show it is in error

### Requirement: Help explaining what a CPH number is stays collapsed until opened
**ID**: REQ-CPH-005
The system MUST show a collapsed expander above the CPH boxes offering to explain what a CPH number is, and MUST reveal its explanation, including where to find the number, only once the user opens it.

#### Scenario: The help text stays hidden until the expander is opened
**ID**: SCN-CPH-005-A
- **GIVEN** the user is on the CPH number page
- **WHEN** the page loads
- **THEN** a collapsed expander offers to explain what a CPH number is, above the boxes
- **AND** its explanation is not visible
- **WHEN** the user opens the expander
- **THEN** the explanation, including where to find the number, becomes visible
