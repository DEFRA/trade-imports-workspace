# Contact Address Page Specification

## Purpose

Asks which address should be used as the consignment's point of contact, offering the address book as a plain list rather than the searchable one the consignment roles get. Governed by `live-animals/addresses`. The page is titled "Contact address for consignment".

## Requirements

### Requirement: The page offers the address book as a plain list, with none chosen in advance
The system MUST ask the user to choose a contact address, offering the available addresses as a list to choose one from, with a save-and-continue action, and MUST leave every address unchosen when the page is first opened.

#### Scenario: The page presents its list with no address chosen
- **GIVEN** the user has reached the contact address page without answering it before
- **WHEN** the page loads
- **THEN** it asks which contact address to use, offering the available addresses and a save-and-continue action
- **AND** no address is shown as chosen

### Requirement: A chosen contact address is accepted
The system MUST accept a chosen contact address, saving it without error.

#### Scenario: Choosing a contact address saves without error
- **GIVEN** the user is on the contact address page
- **WHEN** they choose an address and save and continue
- **THEN** the answer is saved and no error summary is shown

### Requirement: The contact address is optional, and saving without one returns to Overview
The system MUST allow the contact address page to be saved with no address chosen, returning the user to Overview without an error.

#### Scenario: Saving with no address chosen is allowed and exits to Overview
- **GIVEN** the user is on the contact address page with no address chosen
- **WHEN** they save and continue
- **THEN** they return to Overview, and no error summary is shown
