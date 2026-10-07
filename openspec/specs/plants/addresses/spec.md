# Addresses Specification

## Purpose

How a high-risk plants notification chooses the consignor, place of destination and consignment contact address from the organisation's address book — search, paging and the copy it keeps — and how that copy is edited on the notification without changing the book. When a copy blocks submission is governed by `plants/journey-obligations/review`.

## Requirements

### Requirement: A chosen address is copied onto the notification, and later changes to the address book never reach it
**ID**: REQ-PLANTS-ADDR-001
The system MUST copy the chosen address-book record onto the notification when the user picks it for the consignor, the place of destination or the consignment contact address — name, address lines, town or city, county, postcode, country, telephone and email. A later edit or deletion of that record in the address book MUST NOT change what the notification shows or submits, whatever the notification's status.

#### Scenario: Editing the record in the address book leaves the notification unchanged
**ID**: SCN-PLANTS-ADDR-001-A
- **GIVEN** a role's address has been chosen for a draft notification from the address book
- **WHEN** that address record is edited in the address book
- **THEN** the role's current address on its picker page still shows the name as it was chosen
- **AND** check your answers still shows the name, town or city and postcode as they were chosen, not the edited values

#### Scenario: Deleting the record in the address book leaves the copy on the notification, which can still be submitted
**ID**: SCN-PLANTS-ADDR-001-B
- **GIVEN** a complete draft notification whose place of destination was chosen from the address book
- **WHEN** that address record is deleted from the address book
- **THEN** check your answers still shows the place of destination's name and postcode as they were chosen
- **AND** the notification can be submitted

#### Scenario: Picking an address copies every one of its details onto the notification
**ID**: SCN-PLANTS-ADDR-001-C
- **GIVEN** a role has no address chosen
- **WHEN** the user picks a record from the address book for it
- **THEN** the notification holds that record's name, address lines, town or city, county, postcode, country, telephone and email

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
- **GIVEN** the user has saved a chosen address and has not edited its details since
- **WHEN** they reopen the picker and move through its pages
- **THEN** the record it was chosen from is still named as selected, wherever its own row falls

### Requirement: Choosing a replacement address replaces the one already saved
**ID**: REQ-PLANTS-ADDR-004
The system MUST replace the address a role already holds with a copy of a newly chosen record rather than keeping both.

#### Scenario: Saving a new choice replaces the old one
**ID**: SCN-PLANTS-ADDR-004-A
- **GIVEN** a role already has a saved address chosen from the picker
- **WHEN** the user chooses a different address and saves
- **THEN** the role's saved address is the new one, and the old one is no longer associated with the role

### Requirement: Saving with nothing chosen and no address held, or a value not on the list, is refused and focuses the first row
**ID**: REQ-PLANTS-ADDR-005
The system MUST refuse to save the consignor or place-of-destination picker when nothing has been chosen and the role holds no address yet, and MUST refuse any picker's save of a value that is not an address-book id it offered, a since-deleted record included, preserving the search term. Following the error MUST focus the first row, or the search field when a search left the list empty. A blank contact-address save is governed by `plants/journey-pages/consignment-contact-select`.

#### Scenario: Saving with nothing chosen shows the error and focuses the first row
**ID**: SCN-PLANTS-ADDR-005-A
- **GIVEN** the user is on the picker with nothing chosen, for a role that holds no address yet
- **WHEN** they save and continue
- **THEN** an error is shown
- **WHEN** they follow the error
- **THEN** the first row in the list is focused

#### Scenario: A deleted or missing address-book id is rejected and the search preserved
**ID**: SCN-PLANTS-ADDR-005-B
- **GIVEN** the user submits an address-book id that no longer exists
- **WHEN** the save is attempted
- **THEN** the save is rejected with the same error, and the search term the user had entered is preserved

#### Scenario: Saving after a no-match search focuses the search field
**ID**: SCN-PLANTS-ADDR-005-C
- **GIVEN** the user has searched for a term matching no address, for a role that holds no address yet
- **WHEN** they save and continue and follow the error
- **THEN** the search field is focused

### Requirement: Results are paged, and a choice made on any page is the one saved
**ID**: REQ-PLANTS-ADDR-006
The system MUST page the address book when choosing a role's address, MUST let the user move through the pages to reach a record, and MUST save the record they chose whichever page they found it on. Reopening the list MUST open on its first page while still naming the record the address was chosen from when its own row is not shown.

#### Scenario: A record found on a later page is chosen and saved
**ID**: SCN-PLANTS-ADDR-006-A
- **GIVEN** the address book holds more matching records than fit on one page, and the record the user wants is not on the first
- **WHEN** they move through the pages until they find it, choose it, and save
- **THEN** the role is saved as that record
- **AND** reopening the picker names it as selected even though its own row is not on the first page

### Requirement: A copied address can be edited on the notification without changing the address book
**ID**: REQ-PLANTS-ADDR-009
The system MUST let the user edit a role's copied address on an "Edit address details" page, captioned with the role, filled in with the copy and offering the address book's full country list. An edit MUST change only this notification, never the address book or another notification, under the address book's own field rules and messages. Saving or cancelling MUST return to where the edit was opened; cancelling MUST keep the copy. A role with no address MUST go to its picker instead.

#### Scenario: Editing a copied address changes only this notification
**ID**: SCN-PLANTS-ADDR-009-A
- **GIVEN** two draft notifications hold the same address-book record as their place of destination
- **WHEN** the user edits that address's details on one of them and saves
- **THEN** that notification shows the edited details
- **AND** the address book record and the other notification are unchanged

#### Scenario: The edit form opens with the copied details, including the county
**ID**: SCN-PLANTS-ADDR-009-B
- **GIVEN** a role's address has been chosen for a draft notification
- **WHEN** the user chooses to edit that address's details
- **THEN** the page is titled "Edit address details", captioned with the role
- **AND** the form shows name, both address lines, town or city, county, postcode, country, phone number and email, filled in with the copied values

#### Scenario: An edit that breaks the address book's rules is refused with its messages
**ID**: SCN-PLANTS-ADDR-009-C
- **GIVEN** the user is editing a copied address
- **WHEN** they save with a required field empty, a field too long, an email in the wrong format, or a country not in the list
- **THEN** the save is refused, the address book's message for that rule is shown at the top of the page and against the field, and nothing is saved

#### Scenario: Cancelling an edit leaves the copy unchanged
**ID**: SCN-PLANTS-ADDR-009-D
- **GIVEN** the user is editing a copied address and has changed a field
- **WHEN** they cancel
- **THEN** they return to where they came from and the address is as it was before

#### Scenario: Saving an edit opened from the picker returns to the picker
**ID**: SCN-PLANTS-ADDR-009-E
- **GIVEN** the user has opened the edit from the role's picker
- **WHEN** they change a field and save
- **THEN** they return to the picker, whose current address shows the edited details

#### Scenario: Saving an edit opened from check your answers returns there
**ID**: SCN-PLANTS-ADDR-009-F
- **GIVEN** the user has opened the edit from check your answers
- **WHEN** they change a field and save
- **THEN** they return to check your answers, which shows the edited details

#### Scenario: A country from the address book's list is accepted even outside the origin countries
**ID**: SCN-PLANTS-ADDR-009-G
- **GIVEN** the user is editing a copied address
- **WHEN** they choose a country the address book lists but the country-of-origin question does not offer, and save
- **THEN** the edit is saved with that country

#### Scenario: Editing a role with no address held sends the user to the picker
**ID**: SCN-PLANTS-ADDR-009-H
- **GIVEN** a role holds no address yet
- **WHEN** the user opens that role's edit page
- **THEN** they are taken to the role's picker instead

### Requirement: Each picker shows the address the notification holds, with a way to edit its details
**ID**: REQ-PLANTS-ADDR-010
The system MUST show, on each picker, the address the notification holds for that role, as edited if it has been, in a card titled "Current consignor or exporter", "Current place of destination" or "Current contact address", with an "Edit details" link to its edit page, beside the list for choosing a different record. A role with no address yet MUST show no such card. The same two actions on check your answers are governed by `plants/journey-pages/check-your-answers`.

#### Scenario: The picker shows the address held, with Edit details
**ID**: SCN-PLANTS-ADDR-010-A
- **GIVEN** a role's address has been chosen, and its details since edited on the notification
- **WHEN** the user opens that role's picker
- **THEN** a "Current" card for the role shows the edited name and address, with an "Edit details" link

#### Scenario: A role with no address yet shows no current address card
**ID**: SCN-PLANTS-ADDR-010-B
- **GIVEN** a role has no address chosen
- **WHEN** the user opens that role's picker
- **THEN** no current address card is shown

### Requirement: A submitted notification keeps its copied addresses, through amendment
**ID**: REQ-PLANTS-ADDR-011
Once a notification is submitted, the system MUST show the address details copied onto it — on check your answers and on the dashboard — and amending it MUST NOT replace them with the address book's current record.

#### Scenario: The dashboard names the consignor from the copy, whatever the notification's status
**ID**: SCN-PLANTS-ADDR-011-A
- **GIVEN** a draft, submitted or amending notification with a consignor chosen from the address book
- **WHEN** the user views the dashboard
- **THEN** the notification's card names the consignor as copied onto the notification

#### Scenario: A submitted notification's address is unaffected by a later change to the record
**ID**: SCN-PLANTS-ADDR-011-B
- **GIVEN** a notification has been submitted with a role's address chosen from the address book
- **WHEN** that address record is later edited or deleted in the address book
- **THEN** the read-only check your answers, and an amendment of the notification, still show the details as they were copied

### Requirement: Reopening the picker names the record the address was chosen from, and keeps the address on a blank save
**ID**: REQ-PLANTS-ADDR-012
The system MUST name the address-book record a role's address was chosen from when the user reopens the picker, and MUST keep the address already on the notification when they save with nothing ticked. It MUST name nothing once the address's details have been edited on the notification, or once that record has been deleted from the address book.

#### Scenario: Reopening the picker names the record the address was chosen from
**ID**: SCN-PLANTS-ADDR-012-A
- **GIVEN** the user has chosen an address and saved it
- **WHEN** they reopen the picker
- **THEN** that record is ticked and named as the selected address

#### Scenario: Saving with nothing ticked keeps the address already held
**ID**: SCN-PLANTS-ADDR-012-B
- **GIVEN** a role holds an address whose details have been edited on the notification, so no record is ticked
- **WHEN** the user saves the picker with nothing ticked
- **THEN** the save is accepted with no error, and the role still holds the edited address

#### Scenario: Reopening the picker names nothing once the record is deleted from the book
**ID**: SCN-PLANTS-ADDR-012-C
- **GIVEN** the user has chosen an address and saved it
- **AND** the record has since been deleted from the address book
- **WHEN** they reopen the picker
- **THEN** no address is named as selected, and the current address card still shows the copy

#### Scenario: Reopening the picker names nothing once the address is edited on the notification
**ID**: SCN-PLANTS-ADDR-012-D
- **GIVEN** the user has chosen an address and saved it
- **AND** they have since edited its details on the notification
- **WHEN** they reopen the picker
- **THEN** no address is named as selected
