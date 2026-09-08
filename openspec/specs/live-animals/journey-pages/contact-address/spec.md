# Contact Address Page Specification

## Purpose

Asks which address should be used as the consignment's point of contact, offering the address book as a plain list rather than the searchable one the consignment roles get. Governed by `live-animals/addresses`. The page is titled "Contact address for consignment".

## Requirements

### Requirement: The page offers the address book as a plain list, each option showing its address, with none chosen in advance
**ID**: REQ-CONTACT-001
The system MUST ask the user to choose a contact address, offering every address in the book as an option naming the address and showing its postal address alongside, with a save-and-continue action, and MUST leave every address unchosen when the page is first opened.

#### Scenario: The page presents its list with no address chosen
**ID**: SCN-CONTACT-001-A
- **GIVEN** the user has reached the contact address page without answering it before
- **WHEN** the page loads
- **THEN** it asks which contact address to use, offering every address in the book as an option naming it and showing its postal address, with a save-and-continue action
- **AND** no address is shown as chosen

### Requirement: A chosen contact address is accepted and persists
**ID**: REQ-CONTACT-002
The system MUST accept a chosen contact address, saving it without error, and MUST show it still chosen when the user returns to the page.

#### Scenario: Choosing a contact address saves without error and persists on return
**ID**: SCN-CONTACT-002-A
- **GIVEN** the user is on the contact address page
- **WHEN** they choose an address and save and continue
- **THEN** the answer is saved and no error summary is shown
- **WHEN** they return to the contact address page
- **THEN** the same address is still shown chosen

### Requirement: The contact address is optional, and saving without one returns to Overview
**ID**: REQ-CONTACT-003
The system MUST allow the contact address page to be saved with no address chosen, returning the user to Overview without an error.

#### Scenario: Saving with no address chosen is allowed and exits to Overview
**ID**: SCN-CONTACT-003-A
- **GIVEN** the user is on the contact address page with no address chosen
- **WHEN** they save and continue
- **THEN** they return to Overview, and no error summary is shown

### Requirement: An invalid submitted option is refused without preserving it
**ID**: REQ-CONTACT-004
The system MUST refuse to save a submitted value that does not match one of the offered addresses, MUST link the resulting error to and focus the option group, and MUST NOT show any option as chosen once refused.

#### Scenario: An invalid selection is rejected and not preserved
**ID**: SCN-CONTACT-004-A
- **GIVEN** the user submits a value that is not one of the addresses offered on the contact address page
- **WHEN** they save and continue
- **THEN** the save is refused, an error links to and focuses the option group
- **AND** no option is shown as chosen

### Requirement: The back link returns to Overview
**ID**: REQ-CONTACT-005
The system MUST return the user to Overview when they follow the back link from the contact address page.

#### Scenario: The back link opens Overview
**ID**: SCN-CONTACT-005-A
- **GIVEN** the user is on the contact address page
- **WHEN** they follow the back link
- **THEN** Overview is shown
