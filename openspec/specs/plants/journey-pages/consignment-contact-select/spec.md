# Consignment Contact Select Page Specification

## Purpose

Asks which address-book record is the consignment's point of contact, from a searchable, paged table of the organisation's address book that copies the chosen name and address at selection. The page is titled "Contact address for consignment".

## Requirements

### Requirement: The page offers the address book as a paged table, none chosen in advance
**ID**: REQ-PLANTS-CONTACT-SELECT-001
The system MUST ask which contact address to use, offering the organisation's address book as a table of rows under Name, Address and Country headings, each row carrying a control to select it and a route to view its details, with a hint that selecting a contact copies their name and address into the notification. The system MUST show one page of results at a time, reporting how many are shown against the total and offering links to the other pages, and MUST leave every address unchosen when the page is first opened.

#### Scenario: The page shows the first page of the address book, none preselected
**ID**: SCN-PLANTS-CONTACT-SELECT-001-A
- **GIVEN** the user has reached the contact page without answering it before
- **WHEN** the page loads
- **THEN** it shows the first page of the organisation's address book, reporting how many addresses are shown against the total
- **AND** a record held on a later page is not among the options
- **AND** a link to the next page of results is offered
- **AND** no address is shown as chosen, and the copy-on-select hint is shown

### Requirement: The list can be searched, and a search matching nothing says so
**ID**: REQ-PLANTS-CONTACT-SELECT-006
The system MUST offer a labelled search over the address book, hinted with what it matches, MUST narrow the table to the addresses matching the term, and MUST say that nothing matched rather than showing an empty table.

#### Scenario: Searching narrows the table to the matching addresses
**ID**: SCN-PLANTS-CONTACT-SELECT-006-A
- **GIVEN** the user is on the contact page
- **WHEN** they search by a term one address matches
- **THEN** only that address is offered, and the others are gone

#### Scenario: A search matching nothing says so rather than showing an empty table
**ID**: SCN-PLANTS-CONTACT-SELECT-006-B
- **GIVEN** the user is on the contact page
- **WHEN** they search for a term no address matches
- **THEN** a message says no addresses match the search

### Requirement: A row ticked on one page of results is carried across searching and paging
**ID**: REQ-PLANTS-CONTACT-SELECT-007
The system MUST keep a row the user has ticked as they move between pages of results or narrow the list by searching, naming the selected address on the page even once its own row is no longer among those shown, and MUST save the ticked row wherever in the results it was ticked.

#### Scenario: A ticked row is named after moving to another page of results
**ID**: SCN-PLANTS-CONTACT-SELECT-007-A
- **GIVEN** the user has ticked an address on the first page of results
- **WHEN** they follow the link to the next page
- **THEN** the selected address is still named on the page, though its own row is no longer among those shown

#### Scenario: A row ticked on a later page is the one that saves
**ID**: SCN-PLANTS-CONTACT-SELECT-007-B
- **GIVEN** the user has moved to a later page of results and ticked an address there
- **WHEN** they save
- **THEN** that address is the one saved, and re-entering the page shows it as the selected address

### Requirement: A chosen contact is accepted, completes the Overview task, and persists
**ID**: REQ-PLANTS-CONTACT-SELECT-002
The system MUST accept a chosen contact address, return the user to Overview with the contact task Completed, and MUST show that address still chosen when the user returns to the page. Choosing a different address MUST replace the previous one. Save-and-return-to-overview MUST save the chosen address without continuing the journey.

#### Scenario: Choosing a contact saves, completes the task, and persists on return
**ID**: SCN-PLANTS-CONTACT-SELECT-002-A
- **GIVEN** the user is on the contact page
- **WHEN** they choose an address and save and continue
- **THEN** they reach Overview with the contact task Completed
- **AND** returning to the page shows that address still chosen

#### Scenario: Save and return to overview saves the address without continuing
**ID**: SCN-PLANTS-CONTACT-SELECT-002-B
- **GIVEN** the user is on the contact page
- **WHEN** they choose an address and select save-and-return-to-overview
- **THEN** they reach Overview with the contact task Completed
- **AND** returning to the page shows that address still chosen

#### Scenario: Choosing a different address replaces the one already saved
**ID**: SCN-PLANTS-CONTACT-SELECT-002-C
- **GIVEN** a contact address is already saved
- **WHEN** the user chooses a different address and saves
- **THEN** only the new address is shown as chosen

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
The system MUST refuse to save a submitted value that is not one of the offered addresses, MUST link the resulting error to and focus the first row, MUST NOT treat that value as a successful choice, and MUST keep any search term the user had entered so the refused page comes back as they left it.

#### Scenario: An invalid selection is rejected, focuses the first row and keeps the search
**ID**: SCN-PLANTS-CONTACT-SELECT-004-A
- **GIVEN** the user has searched the address book and submits a value that is not one of the addresses offered
- **WHEN** they save and continue and follow the error
- **THEN** the first address row is focused
- **AND** the search term they entered is still in the search box

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

### Requirement: The page is reachable from Overview's contact task row
**ID**: REQ-PLANTS-CONTACT-SELECT-008
The system MUST open this page when the user follows Overview's contact task row.

#### Scenario: Overview's contact row opens the page
**ID**: SCN-PLANTS-CONTACT-SELECT-008-A
- **GIVEN** the user is on Overview with a notification that has reached contact
- **WHEN** they open the contact task row
- **THEN** the contact page is shown
