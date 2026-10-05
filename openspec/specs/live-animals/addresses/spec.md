# Addresses Specification

## Purpose

The rules holding for every address a notification uses: how a consignment role's address is chosen from the address book and copied onto the notification, how that copy is edited in place without touching the book, and what an address must contain.

## Requirements

### Requirement: The journey reads the address book and never writes to it
**ID**: REQ-ADDR-001
The system MUST NOT let a user create, edit, or remove an address book record from within the notification journey itself — wherever an address is chosen, and by URL as well as by control — and MUST NOT serve its own create-address page. Maintaining the book MUST only be possible in the address book's own service; editing an address copied onto the notification (REQ-ADDR-014) changes the notification's copy, never the record. Outside stub mode, the journey MAY offer a control that hands the user off to the address book's own add-address page, guarded by a single-use handshake token, and MUST return the user to the picker with the newly added address already selected once they save it there, or to the picker unchanged if they cancel.

#### Scenario: Choosing an address for a consignment role offers no way to add one in stub mode
**ID**: SCN-ADDR-001-A
- **GIVEN** the user is choosing an address for one of the consignment roles, and the address book service is not available (stub mode)
- **WHEN** they view the page
- **THEN** no control to add a new address is offered

#### Scenario: Choosing the consignment contact address offers no way to add one in stub mode
**ID**: SCN-ADDR-001-B
- **GIVEN** the user is choosing the consignment contact address, and the address book service is not available (stub mode)
- **WHEN** they view the page
- **THEN** no control to add a new address is offered

#### Scenario: The create-address page is not served from the notification journey
**ID**: SCN-ADDR-001-C
- **GIVEN** a notification journey is in progress
- **WHEN** the user navigates directly to that journey's create-address URL
- **THEN** the page responds with a 404, not a create-address form

#### Scenario: Choosing an address links out to the address book's own service when it is available
**ID**: SCN-ADDR-001-D
- **GIVEN** the user is choosing an address for a consignment role or the consignment contact, and the address book service is available
- **WHEN** they view the page
- **THEN** a link to the address book's own add-address page is offered, and no add-address form is served within the journey itself

#### Scenario: Saving a new address in the address book's own service returns to the picker with it selected
**ID**: SCN-ADDR-001-E
- **GIVEN** the user has followed the link from the picker to the address book's own add-address page
- **WHEN** they save a new address there
- **THEN** they return to the picker with the new address already selected
- **AND** continuing from the picker commits that address to the role

#### Scenario: Cancelling out of the address book's own service returns to the picker with nothing added
**ID**: SCN-ADDR-001-F
- **GIVEN** the user has followed the link from the picker to the address book's own add-address page
- **WHEN** they cancel without saving
- **THEN** they return to the picker, and the role still shows no address chosen

### Requirement: A chosen address is copied onto the notification, and later changes to the address book never reach it
**ID**: REQ-ADDR-002
The system MUST copy the chosen address-book record onto the notification when the user picks it for a consignment role — consignor, consignee, importer, place of destination, place of origin, or the consignment contact — and MUST keep no link back to the record. A later edit or deletion of that record in the address book MUST NOT change what the notification shows or submits, whatever the notification's status.

#### Scenario: Picking an address shows its full details on the notification
**ID**: SCN-ADDR-002-C
- **GIVEN** a consignment role has no address chosen
- **WHEN** the user picks a record from the address book for it
- **THEN** the notification shows that record's name, address lines, town or city, county, postcode, country, telephone and email

#### Scenario: Editing the record in the address book leaves a draft notification unchanged
**ID**: SCN-ADDR-002-A
- **GIVEN** a role's address has been chosen for a draft notification from the address book
- **WHEN** that address record is edited in the address book
- **THEN** the notification's summary row for that role still shows the name as it was chosen
- **AND** the notification's full address details (shown on the check-your-answers view) still show the values that were current when it was chosen

#### Scenario: Deleting the record in the address book leaves a draft notification unchanged, but removes it from the picker
**ID**: SCN-ADDR-002-B
- **GIVEN** a role's address has been chosen for a draft notification from the address book
- **WHEN** that address record is deleted from the address book
- **THEN** that role's row still shows the address as it was chosen, and no error is shown
- **AND** the deleted address no longer appears when searching the picker

### Requirement: A copied address can be edited on the notification without changing the address book
**ID**: REQ-ADDR-014
The system MUST let the user edit the details of an address copied onto the notification, for each consignment role and the consignment contact, wherever that address is shown with its actions — the consignment addresses page, the consignment contact page and the check-your-answers view. Each copied address MUST offer both choosing a different address from the book and editing its details on this notification. An edit MUST change only this notification — never the address book or any other notification — and MUST apply the address book's own field rules and error messages: name, address line 1, town or city, postcode, country, telephone and email required; address line 2 and county optional; the address book's length limits; an email in the correct format; a country from the list.

#### Scenario: Editing a copied address changes only this notification
**ID**: SCN-ADDR-014-A
- **GIVEN** a role's address has been chosen for a draft notification from the address book
- **WHEN** the user chooses to edit that address's details, changes them and saves
- **THEN** the notification shows the edited details
- **AND** the address book record and the user's other notifications are unchanged

#### Scenario: The edit form opens with the copied details, including the county
**ID**: SCN-ADDR-014-B
- **GIVEN** a role's address has been chosen for a draft notification
- **WHEN** the user chooses to edit that address's details
- **THEN** the form shows name, both address lines, town or city, county, postcode, country, telephone and email, filled in with the copied values

#### Scenario: An edit that breaks the address book's rules is refused with its messages
**ID**: SCN-ADDR-014-C
- **GIVEN** the user is editing a copied address
- **WHEN** they save with a required field empty, a field too long, an email in the wrong format, or a country not in the list
- **THEN** the save is refused, the address book's message for that rule is shown at the top of the page and against the field, and nothing is saved

#### Scenario: Cancelling an edit leaves the copy unchanged
**ID**: SCN-ADDR-014-D
- **GIVEN** the user is editing a copied address and has changed a field
- **WHEN** they cancel
- **THEN** they return to where they came from and the address is as it was before

#### Scenario: A copied address offers both choosing another address and editing its details
**ID**: SCN-ADDR-014-E
- **GIVEN** a role's address has been chosen for a draft notification
- **WHEN** the user views that role on the consignment addresses page, the consignment contact page or the check-your-answers view
- **THEN** they can choose a different address from the book and they can edit this address's details, as two separate actions
- **AND** a role with no address chosen offers only adding one

### Requirement: A submitted notification keeps its copied addresses, through amendment and cancellation
**ID**: REQ-ADDR-013
Once a notification is SUBMITTED, the system MUST show the address details copied onto it, and amending or cancelling an amendment MUST NOT replace them with the address book's current record.

#### Scenario: A submitted notification's address is unaffected by a later edit to the record
**ID**: SCN-ADDR-013-A
- **GIVEN** a notification has been submitted with a role's address chosen from the address book
- **WHEN** that address record is later edited in the address book
- **THEN** the submitted notification still shows the details as they were copied

#### Scenario: Amending a submitted notification keeps its copied addresses
**ID**: SCN-ADDR-013-B
- **GIVEN** a submitted notification's address record has since been edited in the address book
- **WHEN** the user starts amending that notification
- **THEN** the role's details still show what was copied onto the notification, not the address book's current record
- **WHEN** the user cancels the amendment
- **THEN** the role's details still show what was copied

#### Scenario: Deleting the record behind a submitted notification's role leaves it unaffected
**ID**: SCN-ADDR-013-C
- **GIVEN** a notification has been submitted with a role's address chosen from the address book
- **WHEN** that address record is later deleted from the address book
- **THEN** the submitted notification, and an amendment of it, still show that role's details in full, and no error is shown

### Requirement: The review page blocks submission while a copied address breaks the address book's rules
**ID**: REQ-ADDR-005
The system MUST refuse to continue past the review page, and refuse the submit, while any copied address on the notification breaks the address book's field rules, and MUST guide the user to edit that address.

#### Scenario: An address that breaks the rules is named on the review page and blocks submission until corrected
**ID**: SCN-ADDR-005-A
- **GIVEN** a notification has a copied address that breaks the address book's rules
- **WHEN** the user opens the review page
- **THEN** an error naming that role is shown at the top of the page and against the role's own row, with the address still shown
- **AND** attempting to continue past the review page, or to submit, is refused
- **WHEN** the user follows the error to edit that address and corrects it
- **THEN** the error clears and the notification can then be submitted

### Requirement: Choosing a role's address offers a search of the whole book, reporting how many matched
**ID**: REQ-ADDR-006
The system MUST let the user search the whole address book by name when choosing an address for a consignment role, MUST narrow the list to the matching records, and MUST report how many were found against how many the book holds.

#### Scenario: Searching narrows the list and reports the count
**ID**: SCN-ADDR-006-A
- **GIVEN** the user is choosing an address for a consignment role
- **WHEN** they search for a term matching two records in the book
- **THEN** only the matching records are listed
- **AND** the page reports that it is showing two of two addresses

#### Scenario: Clearing the search restores the whole book
**ID**: SCN-ADDR-006-B
- **GIVEN** the user has searched the address book
- **WHEN** they clear the search and search again with nothing entered
- **THEN** the whole book is listed again, paginated as before

### Requirement: Choosing a role's address without selecting one is refused, focusing the first address in the list
**ID**: REQ-ADDR-007
The system MUST refuse to save a role's address page when nothing has been chosen and the role holds no address yet, and MUST focus the first address in the list when the user follows the resulting error, rather than showing a generic error.

#### Scenario: Saving with nothing selected links to and focuses the first address
**ID**: SCN-ADDR-007-A
- **GIVEN** the user is choosing an address for a consignment role that holds no address yet
- **WHEN** they save without selecting an address
- **THEN** an error is shown naming that role
- **WHEN** they follow the error
- **THEN** the first address in the list is focused, with none checked

### Requirement: A search with no matches shows its own empty state, and its validation focuses the search field
**ID**: REQ-ADDR-008
The system MUST show an empty-state message when a search matches nothing, and MUST focus the search field — preserving the search term — when the user saves with no address chosen after such a search, rather than focusing an address list that has nothing in it.

#### Scenario: A search with no matches shows an empty state and preserves the term
**ID**: SCN-ADDR-008-A
- **GIVEN** the user is choosing an address for a consignment role
- **WHEN** they search for a term that matches nothing
- **THEN** an empty-state message is shown, and the search field still holds the term they searched for

#### Scenario: Saving after a no-match search focuses the search field, not an address
**ID**: SCN-ADDR-008-B
- **GIVEN** the user has searched for a term that matched nothing
- **WHEN** they save without selecting an address and follow the resulting error
- **THEN** the search field is focused, still holding the term they searched for

### Requirement: An address's full details can be read without leaving the list
**ID**: REQ-ADDR-009
The system MUST let the user expand a listed address to read the rest of its details in place, without navigating away, so nothing already entered or selected is lost.

#### Scenario: Expanding an address shows its details in place
**ID**: SCN-ADDR-009-A
- **GIVEN** the user is choosing an address for a consignment role
- **WHEN** they expand a listed address's details
- **THEN** the rest of that record, including its town, is shown in place
- **AND** the user remains on the list

### Requirement: Choosing a role's address is paged, and a choice made on any page is the one saved
**ID**: REQ-ADDR-010
The system MUST page the address book when choosing a role's address, MUST let the user move through the pages to reach a record, and MUST save the record they chose whichever page they found it on.

#### Scenario: A record found on a later page is chosen and saved
**ID**: SCN-ADDR-010-A
- **GIVEN** the address book holds more records than fit on one page, and the record the user wants is not on the first
- **WHEN** they move through the pages until they find it, choose it, and save
- **THEN** they return to the consignment addresses page, and the role's row shows the record they chose

### Requirement: Reopening the list to change an address starts with nothing chosen, and keeps the copied address unless another is chosen
**ID**: REQ-ADDR-011
The system MUST open a role's address list with nothing chosen when the user reopens it to change the address — the copy on the notification keeps no link to a record — and MUST keep the address already copied onto the notification when they save without choosing another. This MUST hold without relying on client-side JavaScript.

#### Scenario: Reopening the list starts afresh and keeps the copied address on save
**ID**: SCN-ADDR-011-A
- **GIVEN** the user has chosen an address for a role and saved it
- **WHEN** they reopen the list to change it
- **THEN** the list opens with no address chosen
- **WHEN** they save without choosing another
- **THEN** the role's row still shows the address they originally chose

### Requirement: An address keyed in by hand must be completed once any part of it is filled
**ID**: REQ-ADDR-012
The system MUST require every mandatory field of an address entered by hand once any one field in that group has been filled in, and MUST block the save with an error naming what is missing until the address is complete.

#### Scenario: A partially filled private-transporter address blocks the save
**ID**: SCN-ADDR-012-A
- **GIVEN** the user is entering private transporter details and has filled in only the name
- **WHEN** they try to save
- **THEN** the save is blocked with an error naming the missing address field
- **WHEN** they complete every mandatory field in the group
- **THEN** the save succeeds and the group is stored together

#### Scenario: A partially filled permanent address for an animal identifier blocks the save
**ID**: SCN-ADDR-012-B
- **GIVEN** the user is entering identifier details for an animal whose commodity requires a permanent address, and has filled in only the passport number and the owner's name
- **WHEN** they try to save
- **THEN** the save is blocked with an error naming the missing address field
- **WHEN** they complete every mandatory field in the address
- **THEN** the save succeeds and the record is added
