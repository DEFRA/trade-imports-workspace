# Identification Numbers Page Specification

## Purpose

Collects the identification numbers a high-risk plants notification owes for its commodity type. The page is titled "Identification numbers".

## Requirements

### Requirement: The page shows only the identification fields in scope for the commodity type
**ID**: REQ-PLANTS-IDENT-NUMBERS-001
The system MUST show only the identification-number fields owed for the notification's commodity type, each with its own label and hint, under the parties section caption, and MUST offer save-and-continue, save-and-return-to-overview and cancel-and-return-to-overview.

#### Scenario: Plants for planting shows supplier and consignment only
**ID**: SCN-PLANTS-IDENT-NUMBERS-001-A
- **GIVEN** a plants-for-planting notification
- **WHEN** the identification numbers page loads
- **THEN** the supplier and consignment number fields are shown
- **AND** the producer and crop fields are not shown

#### Scenario: Potatoes shows producer, crop and consignment only
**ID**: SCN-PLANTS-IDENT-NUMBERS-001-B
- **GIVEN** a potatoes notification
- **WHEN** the identification numbers page loads
- **THEN** the producer, crop and consignment number fields are shown
- **AND** the supplier field is not shown

#### Scenario: Wood and cut trees shows only the optional consignment number
**ID**: SCN-PLANTS-IDENT-NUMBERS-001-C
- **GIVEN** a wood-and-cut-trees notification
- **WHEN** the identification numbers page loads
- **THEN** only the consignment number field is shown

### Requirement: Entered values are saved, trimmed, and shown again on return
**ID**: REQ-PLANTS-IDENT-NUMBERS-002
The system MUST accept valid values for the fields on offer, trimming leading and trailing spaces, continue to the consignment contact page on save-and-continue, mark Overview's identification-numbers task Completed once the mandatory fields for that type are answered, and MUST show the saved values when the user returns.

#### Scenario: Valid values save, complete the Overview task, and persist on return
**ID**: SCN-PLANTS-IDENT-NUMBERS-002-A
- **GIVEN** the user is on identification numbers with the fields owed for their commodity type
- **WHEN** they enter valid values and save and continue
- **THEN** they reach the consignment contact page
- **AND** after leaving contact, Overview's identification-numbers task shows Completed
- **AND** returning to the page shows the entered values with spaces trimmed

#### Scenario: Wood may leave the consignment number blank and Overview labels it Optional
**ID**: SCN-PLANTS-IDENT-NUMBERS-002-B
- **GIVEN** a wood-and-cut-trees notification on identification numbers
- **WHEN** the user saves with the consignment number blank
- **THEN** they continue, and Overview's identification-numbers task shows Optional

### Requirement: Mandatory fields, length and consignment syntax are enforced
**ID**: REQ-PLANTS-IDENT-NUMBERS-003
The system MUST refuse to save when a mandatory field on offer is blank or longer than 58 characters, MUST refuse a consignment number longer than 58 characters or containing characters other than letters, numbers and underscores, and MUST focus the named field when the user follows the resulting error.

#### Scenario: A blank mandatory field is refused and its error focuses the field
**ID**: SCN-PLANTS-IDENT-NUMBERS-003-A
- **GIVEN** the user is on identification numbers with a mandatory field on offer
- **WHEN** they leave that field blank and save and continue, then follow the error
- **THEN** that field is focused

#### Scenario: A value longer than 58 characters is refused
**ID**: SCN-PLANTS-IDENT-NUMBERS-003-B
- **GIVEN** the user enters more than 58 characters in an identification field on offer
- **WHEN** they save and continue and follow the error
- **THEN** that field is focused, still holding the over-long value

#### Scenario: A consignment number with disallowed characters is refused
**ID**: SCN-PLANTS-IDENT-NUMBERS-003-C
- **GIVEN** the user enters a consignment number containing characters other than letters, numbers or underscores
- **WHEN** they save and continue and follow the error
- **THEN** the consignment number field is focused

### Requirement: Save-and-return saves; cancel discards later edits; back returns to Overview
**ID**: REQ-PLANTS-IDENT-NUMBERS-004
The system MUST save the current values and reach Overview on save-and-return-to-overview, MUST reach Overview without saving later edits on cancel-and-return-to-overview, and MUST return to Overview on the back link.

#### Scenario: Save and return to overview keeps the values; cancel discards later edits
**ID**: SCN-PLANTS-IDENT-NUMBERS-004-A
- **GIVEN** the user has saved values via save-and-return-to-overview
- **WHEN** they reopen the page, change the values, and select cancel-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows the previously saved values, not the discarded edits

#### Scenario: The back link opens Overview
**ID**: SCN-PLANTS-IDENT-NUMBERS-004-B
- **GIVEN** the user is on identification numbers
- **WHEN** they follow the back link
- **THEN** Overview is shown
