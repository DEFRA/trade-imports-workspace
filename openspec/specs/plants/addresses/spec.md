# Addresses Specification

## Purpose

The searchable address-book picker used when a high-risk plants notification chooses a live-resolved role address — search, pagination and resolution on every read. Consignor and place of destination use it; the consignment contact page does not.

## Requirements

### Requirement: The chosen address resolves live from the address book on every read
**ID**: REQ-PLANTS-ADDR-001
The system MUST store only the address-book id for a role using this picker, and MUST resolve that record from the address book each time it is shown, so a later correction to the record reaches the notification and a later deletion stops the role from resolving rather than leaving a stale copy.

#### Scenario: Editing the address book record changes what the notification shows
**ID**: SCN-PLANTS-ADDR-001-A
- **GIVEN** a role has been chosen for a notification from the address book using this picker
- **WHEN** that address record is edited in the address book
- **THEN** the notification's summary and full details for that role show the edited record, not the values current when it was chosen

### Requirement: The picker offers a search of the whole organisation address book, reporting how many matched
**ID**: REQ-PLANTS-ADDR-002
The system MUST let the user search the whole organisation address book, MUST narrow the list to matching records, and MUST report how many addresses are shown against how many the book holds. A search matching nothing MUST say so rather than showing an empty table. Clearing the search MUST restore the whole book.

#### Scenario: The picker shows the first page with its count
**ID**: SCN-PLANTS-ADDR-002-A
- **GIVEN** the user opens the picker
- **WHEN** the page loads
- **THEN** the first page of the organisation's address book is shown, captioned with how many are shown against the total

#### Scenario: Searching narrows the list to the matching term
**ID**: SCN-PLANTS-ADDR-002-B
- **GIVEN** the user is on the picker
- **WHEN** they search for a term matching one or more addresses
- **THEN** only those addresses are shown, with a caption of how many matched

#### Scenario: A search matching nothing says so, rather than showing an empty table
**ID**: SCN-PLANTS-ADDR-002-C
- **GIVEN** the user searches for a term matching no address
- **WHEN** the results are shown
- **THEN** a message says nothing matched, not an empty table

#### Scenario: Clearing the search restores the whole book
**ID**: SCN-PLANTS-ADDR-002-D
- **GIVEN** the user has searched the address book
- **WHEN** they clear the search and search again with nothing entered
- **THEN** the whole book is listed again, paginated as before

### Requirement: A row checked before searching or paging stays checked
**ID**: REQ-PLANTS-ADDR-003
The system MUST keep a row the user has checked selected across a further search or a page change, showing it as the current selection even when its own row is not on the page being shown.

#### Scenario: A checked row survives a further search
**ID**: SCN-PLANTS-ADDR-003-A
- **GIVEN** the user has checked a row
- **WHEN** they search again with a term that would not list that row
- **THEN** the checked address is still shown as the current selection

#### Scenario: A saved choice is carried through the paging links
**ID**: SCN-PLANTS-ADDR-003-B
- **GIVEN** the user has saved a chosen address
- **WHEN** they reopen the picker and move through its pages
- **THEN** the saved choice is still named as selected, wherever its own row falls

### Requirement: Choosing a replacement address replaces the one already saved
**ID**: REQ-PLANTS-ADDR-004
The system MUST replace a previously saved address with a newly chosen one rather than keeping both.

#### Scenario: Saving a new choice replaces the old one
**ID**: SCN-PLANTS-ADDR-004-A
- **GIVEN** a role already has a saved address chosen from the picker
- **WHEN** the user chooses a different address and saves
- **THEN** the role's saved address is the new one, and the old one is no longer associated with the role

### Requirement: Saving with nothing chosen, or a value not on the list, is refused and focuses the first row
**ID**: REQ-PLANTS-ADDR-005
The system MUST refuse to save the picker when nothing has been chosen or the submitted value is not an address-book id the picker offered, and MUST focus the first row in the list when the user follows the resulting error. A record that has since been deleted MUST be treated the same as a value not on the list, and the search term MUST be preserved.

#### Scenario: Saving with nothing chosen shows the error and focuses the first row
**ID**: SCN-PLANTS-ADDR-005-A
- **GIVEN** the user is on the picker with nothing chosen
- **WHEN** they save and continue
- **THEN** an error is shown
- **WHEN** they follow the error
- **THEN** the first row in the list is focused

#### Scenario: A deleted or missing address-book id is rejected and the search preserved
**ID**: SCN-PLANTS-ADDR-005-B
- **GIVEN** the user submits an address-book id that no longer exists
- **WHEN** the save is attempted
- **THEN** the save is rejected with the same error, and the search term the user had entered is preserved

### Requirement: Results are paged, and a choice made on any page is the one saved
**ID**: REQ-PLANTS-ADDR-006
The system MUST page the address book when choosing a role's address, MUST let the user move through the pages to reach a record, and MUST save the record they chose whichever page they found it on. Reopening the list MUST open on its first page while still naming a choice whose own row is not shown.

#### Scenario: A record found on a later page is chosen and saved
**ID**: SCN-PLANTS-ADDR-006-A
- **GIVEN** the address book holds more matching records than fit on one page, and the record the user wants is not on the first
- **WHEN** they move through the pages until they find it, choose it, and save
- **THEN** the role is saved as that record
- **AND** reopening the picker names it as selected even though its own row is not on the first page

### Requirement: Deleting a linked address clears it while the notification still resolves live
**ID**: REQ-PLANTS-ADDR-007
While a notification still resolves a role live from the address book, the system MUST treat a deleted address-book record as if no address had been selected for that role, clearing it from Overview fulfilment and from the picker's selected inset.

#### Scenario: Deleting a linked address clears it from the notification
**ID**: SCN-PLANTS-ADDR-007-A
- **GIVEN** a role's address has been selected for a notification from the address book using this picker
- **WHEN** that address record is deleted from the address book
- **THEN** that role's Overview task returns to not yet started
- **AND** reopening the picker no longer shows the deleted address as selected

### Requirement: An address book that cannot be reached is not treated as a deletion
**ID**: REQ-PLANTS-ADDR-008
The system MUST distinguish an address book that cannot be reached from a record that has been deleted, and MUST NOT clear a role as unanswered because the address book was unavailable.

#### Scenario: An address book outage is not mistaken for a deletion
**ID**: SCN-PLANTS-ADDR-008-A
- **GIVEN** a notification with a linked address whose record still exists
- **WHEN** the address book cannot be reached while answers are being read
- **THEN** the failure is surfaced rather than the role being treated as though its address had been deleted
