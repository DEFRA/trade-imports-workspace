# Contact Address Page Specification

## Purpose

**Maturity**: detailing

**Page**: consignment-contact-select

Asks which address should be used as the consignment's point of contact, offering the organisation's own branch addresses as a plain list, newest added first, rather than the whole book, and outside stub mode says how to add a branch address, as `live-animals/addresses` describes. The page opens with a sentence saying whose address this is, and puts the choice under its own sub-heading. Governed by `live-animals/addresses`. The page is titled "Contact address for consignment".

## Requirements

### Requirement: The page offers the organisation's branch addresses as a plain list, each option showing its address, with none chosen in advance
**ID**: REQ-CONTACT-001
The system MUST show, directly under the page heading, the sentence saying whose address this is, MUST ask the user to choose a contact address under its own sub-heading, offering the organisation's addresses held as branch addresses, newest added first, together with any address held with no role at all, as an option naming the record and showing its address ending at the postcode, with a save-and-continue action, and MUST leave every address unchosen when the page is first opened.

#### Scenario: The page presents its list with no address chosen
**ID**: SCN-CONTACT-001-A
- **GIVEN** the user has reached the contact address page without answering it before
- **WHEN** the page loads
- **THEN** it shows the sentence saying whose address this is directly under the page heading
- **AND** under a sub-heading it asks which contact address to use, offering the organisation's addresses held as branch addresses as options naming the record and showing its address ending at the postcode, with a save-and-continue action
- **AND** the addresses are offered newest added first
- **AND** no address is shown as chosen

#### Scenario: An address held for a consignment role is not offered here
**ID**: SCN-CONTACT-001-B
- **GIVEN** the organisation's address book holds an address for a consignment role, such as consignor, and a separate address held as a branch address
- **WHEN** the user opens the contact address page
- **THEN** the address held for the consignment role is not offered as an option
- **AND** the same address is offered on that role's own address list

### Requirement: A chosen contact address is copied onto the notification and shown chosen on return
**ID**: REQ-CONTACT-002
The system MUST accept a chosen contact address, copying it onto the notification without error, and when the user returns to the page MUST show it as chosen in the list, with no other card or way to edit it from this page. Saving again MUST keep the chosen contact address. The copy is shown on the review.

#### Scenario: Choosing a contact address saves without error and is shown chosen on return
**ID**: SCN-CONTACT-002-A
- **GIVEN** the user is on the contact address page
- **WHEN** they choose an address and save and continue
- **THEN** the answer is saved and no error summary is shown
- **WHEN** they return to the contact address page
- **THEN** the page shows only the options and the save controls under its two headings, with the same address shown chosen in the list
- **WHEN** they save and continue again
- **THEN** the chosen contact address is kept

### Requirement: A contact address must be chosen before either save control moves on
**ID**: REQ-CONTACT-003
The system MUST refuse to save the contact address page with no address chosen, from either save control, showing the error that a contact address must be selected and saving nothing. A contact address already held by the notification MUST be kept unchanged when a save is refused.

#### Scenario: Save and continue with nothing chosen is refused
**ID**: SCN-CONTACT-003-A
- **GIVEN** the user opened the contact address page, with no address chosen
- **WHEN** they save and continue
- **THEN** the save is refused, with the error that a contact address must be selected shown in the error summary and against the options
- **AND** the contact address page is shown again

#### Scenario: Save and return to overview with nothing chosen is refused the same way
**ID**: SCN-CONTACT-003-B
- **GIVEN** the user opened the contact address page, with no address chosen
- **WHEN** they save and return to overview
- **THEN** the save is refused, with the error that a contact address must be selected shown in the error summary and against the options
- **AND** the contact address page is shown again

#### Scenario: A held contact address is kept when a save is refused
**ID**: SCN-CONTACT-003-C
- **GIVEN** the notification already holds a chosen contact address
- **WHEN** the user saves the contact address page again with nothing chosen
- **THEN** the save is refused
- **AND** the notification's contact address is unchanged

### Requirement: An invalid submitted option is refused without preserving it
**ID**: REQ-CONTACT-004
The system MUST refuse to save a submitted value that does not match one of the offered addresses, from either save control, MUST link the resulting error to and focus the option group, and MUST NOT show any option as chosen once refused.

#### Scenario: An invalid selection is rejected and not preserved
**ID**: SCN-CONTACT-004-A
- **GIVEN** the user submits a value that is not one of the addresses offered on the contact address page
- **WHEN** they save and continue
- **THEN** the save is refused, an error links to and focuses the option group
- **AND** no option is shown as chosen

#### Scenario: An invalid selection from the secondary save control is rejected the same way
**ID**: SCN-CONTACT-004-B
- **GIVEN** the user submits a value that is not one of the addresses offered on the contact address page
- **WHEN** they save and return to overview
- **THEN** the save is refused, an error links to and focuses the option group
- **AND** no option is shown as chosen

#### Scenario: An address held for a consignment role is refused the same way
**ID**: SCN-CONTACT-004-C
- **GIVEN** the user submits an address the book holds for a consignment role, not the contact role
- **WHEN** they save and continue
- **THEN** the save is refused, an error links to and focuses the option group
- **AND** no option is shown as chosen
- **AND** nothing is saved

### Requirement: The back link returns to where the user came from
**ID**: REQ-CONTACT-005
The system MUST return the user, when they follow the back link from the contact address page, to the page they saved and continued from, to Overview when they opened it from its Overview task, and to the review when they opened it from a Change link on the review, as `live-animals/journey-flow` describes. That page is Consignment addresses.

#### Scenario: After Save and continue, the back link opens the page before
**ID**: SCN-CONTACT-005-A
- **GIVEN** the user reached the contact address page by saving and continuing from Consignment addresses
- **WHEN** they follow the back link
- **THEN** that page is shown

#### Scenario: The back link opens Overview when the page was opened from Overview
**ID**: SCN-CONTACT-005-B
- **GIVEN** the user opened the contact address page from its task on Overview
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: The back link opens the review when the page was opened from a Change link
**ID**: SCN-CONTACT-005-C
- **GIVEN** the review of a draft notification
- **WHEN** the user follows the Change link that opens the contact address page and then the back link
- **THEN** the review is shown
