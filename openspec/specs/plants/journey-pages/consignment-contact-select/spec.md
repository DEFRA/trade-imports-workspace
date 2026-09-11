# Consignment Contact Select Page Specification

## Purpose

Asks which address-book record is the consignment's point of contact, from a plain list that copies the chosen name and address at selection. The page is titled "Contact address for consignment".

## Requirements

### Requirement: The page offers every address as a plain list with name and address hint, none chosen in advance
**ID**: REQ-PLANTS-CONTACT-SELECT-001
The system MUST ask which contact address to use, offering every address in the organisation's book as a radio option naming the address and showing its postal address alongside, with a hint that selecting a contact copies their name and address into the notification, and MUST leave every address unchosen when the page is first opened. The list MUST NOT be searched or paged.

#### Scenario: The page lists every record with name and address, none preselected
**ID**: SCN-PLANTS-CONTACT-SELECT-001-A
- **GIVEN** the user has reached the contact page without answering it before
- **WHEN** the page loads
- **THEN** it offers every address-book record as an option naming it and showing its postal address
- **AND** no address is shown as chosen
- **AND** the copy-on-select hint is shown

### Requirement: A chosen contact is accepted, completes the Overview task, and persists
**ID**: REQ-PLANTS-CONTACT-SELECT-002
The system MUST accept a chosen contact address, return the user to Overview with the contact task Completed, and MUST show that address still chosen when the user returns to the page.

#### Scenario: Choosing a contact saves, completes the task, and persists on return
**ID**: SCN-PLANTS-CONTACT-SELECT-002-A
- **GIVEN** the user is on the contact page
- **WHEN** they choose an address and save and continue
- **THEN** they reach Overview with the contact task Completed
- **AND** returning to the page shows that address still chosen

### Requirement: Saving with nothing chosen is allowed and leaves the task incomplete
**ID**: REQ-PLANTS-CONTACT-SELECT-003
The system MUST allow the page to be saved with no address chosen — on either save-and-continue or save-and-return-to-overview — returning the user to Overview without an error, and MUST leave the contact task not yet started.

#### Scenario: A blank save returns to Overview with the task not yet started
**ID**: SCN-PLANTS-CONTACT-SELECT-003-A
- **GIVEN** the user is on the contact page with no address chosen
- **WHEN** they save and continue or save and return to overview
- **THEN** they reach Overview with no error summary
- **AND** the contact task shows not yet started
- **AND** returning to the page still shows no address chosen

### Requirement: An invalid submitted option is refused without preserving it as chosen
**ID**: REQ-PLANTS-CONTACT-SELECT-004
The system MUST refuse to save a submitted value that is not one of the offered addresses, MUST link the resulting error to and focus the first option, and MUST NOT treat that value as a successful choice.

#### Scenario: An invalid selection is rejected and focuses the first option
**ID**: SCN-PLANTS-CONTACT-SELECT-004-A
- **GIVEN** the user submits a value that is not one of the addresses offered
- **WHEN** they save and continue and follow the error
- **THEN** the first address option is focused

### Requirement: Cancel discards a new choice; the back link returns to Overview
**ID**: REQ-PLANTS-CONTACT-SELECT-005
The system MUST reach Overview without saving a newly checked option when the user selects cancel-and-return-to-overview, and MUST return to Overview when they follow the back link.

#### Scenario: Cancel keeps the previously saved choice
**ID**: SCN-PLANTS-CONTACT-SELECT-005-A
- **GIVEN** a contact address is already saved
- **WHEN** the user checks a different address and selects cancel-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows the previously saved address still chosen

#### Scenario: The back link opens Overview
**ID**: SCN-PLANTS-CONTACT-SELECT-005-B
- **GIVEN** the user is on the contact page
- **WHEN** they follow the back link
- **THEN** Overview is shown
