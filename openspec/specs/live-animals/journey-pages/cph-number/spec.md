# CPH Number Page Specification

## Purpose

Asks for the County Parish Holding number the consignment's commodities call for. The page is titled "County Parish Holding (CPH)".

## Requirements

### Requirement: The page asks for the CPH number, starting empty
The system MUST ask the user for the County Parish Holding number, offering a save-and-continue action, and MUST leave the field empty when the page is first opened.

#### Scenario: The page presents its question with the field empty
- **GIVEN** the user has reached the CPH number page without answering it before
- **WHEN** the page loads
- **THEN** it asks for the County Parish Holding number, offering a save-and-continue action
- **AND** the field is empty

### Requirement: A valid CPH number is accepted with its separators stripped
The system MUST accept a validly formatted CPH number, saving it without error, and MUST strip any slashes the user typed so it is held as nine plain digits.

#### Scenario: Entering a valid CPH number saves without error
- **GIVEN** the user is on the CPH number page
- **WHEN** they enter a validly formatted CPH number and save and continue
- **THEN** the answer is saved and no error summary is shown

#### Scenario: Slashes typed in the CPH number are stripped before it is held
- **GIVEN** the user is on the CPH number page
- **WHEN** they enter a CPH number with slashes between its digits and save and continue
- **THEN** the notification holds it as nine digits with no slashes

### Requirement: Saving without a CPH number is rejected
The system MUST refuse to save the CPH number page when the field is empty, showing an error summary.

#### Scenario: Saving with the field empty shows an error summary
- **GIVEN** the user is on the CPH number page with the field empty
- **WHEN** they save and continue
- **THEN** an error summary headed "There is a problem" is shown

### Requirement: An incorrectly formatted CPH number is rejected with its own error, preserving what was typed
The system MUST reject a CPH number that is not nine digits with an error naming the wrong length, and MUST reject one containing anything other than digits with a separate error naming that, in each case preserving the raw value typed so the user can correct it.

#### Scenario: A CPH number of the wrong length is rejected, keeping what was typed
- **GIVEN** the user types a CPH number that is not nine digits long
- **WHEN** they save and continue
- **THEN** an error names the length requirement
- **AND** the field is focused, still holding exactly what was typed

#### Scenario: A CPH number containing non-digit characters is rejected, keeping what was typed
- **GIVEN** the user types a CPH number containing a non-digit character
- **WHEN** they save and continue
- **THEN** an error explains that only digits are allowed
- **AND** the field is focused, still holding exactly what was typed
