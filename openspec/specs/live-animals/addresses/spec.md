# Addresses Specification

## Purpose

The rules holding for every address a notification uses: how a consignment role's address is chosen from the address book, whether it stays linked to that book or is frozen, and what a hand-keyed address must contain.

## Requirements

### Requirement: The journey reads the address book and never writes to it
**ID**: REQ-ADDR-001
The system MUST NOT let a user add, edit, or remove an address book record from anywhere within the notification journey — wherever an address is chosen, and by URL as well as by control. Maintaining the book MUST only be possible in the address book's own service.

#### Scenario: Choosing an address for a consignment role offers no way to add one
**ID**: SCN-ADDR-001-A
- **GIVEN** the user is choosing an address for one of the consignment roles
- **WHEN** they view the page
- **THEN** no control to add a new address is offered

#### Scenario: Choosing the consignment contact address offers no way to add one
**ID**: SCN-ADDR-001-B
- **GIVEN** the user is choosing the consignment contact address
- **WHEN** they view the page
- **THEN** no control to add a new address is offered

#### Scenario: The create-address page is not served from the notification journey
**ID**: SCN-ADDR-001-C
- **GIVEN** a notification journey is in progress
- **WHEN** the user navigates directly to that journey's create-address URL
- **THEN** the page responds with a 404, not a create-address form

### Requirement: Every role resolves live from the address book while a notification is not yet submitted
**ID**: REQ-ADDR-002
The system MUST resolve every consignment role — consignor, consignee, importer, place of destination, place of origin, and the consignment contact — from the address book each time it is shown, for as long as the notification is DRAFT or being amended, so a later edit to that record reaches the notification without it being re-selected.

#### Scenario: Editing a linked address changes what a draft notification shows
**ID**: SCN-ADDR-002-A
- **GIVEN** a role's address has been selected for a draft notification from the address book
- **WHEN** that address record is edited in the address book
- **THEN** the notification's summary row for that role shows the updated name
- **AND** the notification's full address details (shown on the check-your-answers view) show the updated town, postcode and other fields, not the values that were current when it was selected

### Requirement: A submitted notification freezes its addresses, and resumes live resolution once amended
**ID**: REQ-ADDR-013
Once a notification is SUBMITTED, the system MUST show the address details stored on the notification at submit time instead of the address book's current record, and MUST stop following the address book for every role until the notification is amended again, at which point it MUST resume live resolution.

#### Scenario: A submitted notification's address is unaffected by a later edit to the record
**ID**: SCN-ADDR-013-A
- **GIVEN** a notification has been submitted with a role's address chosen from the address book
- **WHEN** that address record is later edited in the address book
- **THEN** the submitted notification still shows the details as they were at the moment of submission

#### Scenario: Amending a submitted notification returns its addresses to live resolution
**ID**: SCN-ADDR-013-B
- **GIVEN** a submitted notification's address record has since been edited in the address book
- **WHEN** the user starts amending that notification
- **THEN** the role's details update to match the address book's current record
- **WHEN** the user cancels the amendment
- **THEN** the role's details revert to what was frozen at the original submission

### Requirement: Deleting an address behind a role clears it while the notification is not yet submitted, but leaves a submitted notification unaffected
**ID**: REQ-ADDR-003
While a notification is DRAFT or being amended, the system MUST show a role whose address has been deleted as if no address had been selected for it, and MUST exclude that deleted address from the picker. Once a notification is SUBMITTED, the system MUST leave every role's stored address details unaffected by a later deletion of the address book record behind it, and MUST NOT show an error.

#### Scenario: Deleting a linked address clears it from a draft notification and hides it from the picker
**ID**: SCN-ADDR-003-A
- **GIVEN** a role's address has been selected for a draft notification from the address book
- **WHEN** that address record is deleted from the address book
- **THEN** that role's row shows "Not added yet" and an option to add an address, instead of the deleted address's name
- **AND** the deleted address no longer appears when searching the picker

#### Scenario: Deleting the record behind a submitted notification's role leaves it unaffected
**ID**: SCN-ADDR-003-B
- **GIVEN** a notification has been submitted with a role's address chosen from the address book
- **WHEN** that address record is later deleted from the address book
- **THEN** the submitted notification still shows that role's details in full, and no error is shown

### Requirement: An address book record that is unavailable is not treated as deleted
**ID**: REQ-ADDR-004
The system MUST distinguish an address book that cannot be reached from a record that has been deleted, and MUST NOT render a role as unanswered because the address book was unavailable.

#### Scenario: An address book outage is not mistaken for a deletion
**ID**: SCN-ADDR-004-A
- **GIVEN** a notification with a linked address whose record still exists
- **WHEN** the address book cannot be reached while the notification is being shown
- **THEN** the failure is surfaced rather than the role being shown as though its address had been deleted

### Requirement: The review page blocks submission while a linked address has been deleted
**ID**: REQ-ADDR-005
The system MUST refuse to submit a notification while any linked party's address has been deleted, and MUST guide the user to a replacement.

#### Scenario: A deleted address is named on the review page and blocks submission until replaced
**ID**: SCN-ADDR-005-A
- **GIVEN** a notification's review page shows a linked party whose address has since been deleted
- **WHEN** the user opens the review page
- **THEN** an error naming that party is shown at the top of the page and against the party's own row
- **AND** attempting to continue past the review page is refused with the same error
- **WHEN** the user follows the error to select a replacement address for that party
- **THEN** the error clears, the party's row shows the new address, and the notification can then be submitted

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
The system MUST refuse to save a role's address page when nothing has been chosen, and MUST focus the first address in the list when the user follows the resulting error, rather than showing a generic error.

#### Scenario: Saving with nothing selected links to and focuses the first address
**ID**: SCN-ADDR-007-A
- **GIVEN** the user is choosing an address for a consignment role
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

### Requirement: A saved choice is carried and named when the list is reopened, even where its row is not shown
**ID**: REQ-ADDR-011
The system MUST name the address already chosen for a role when the user reopens the list, and MUST keep that choice when they save again, even though the list reopens on its first page where the chosen record may not appear. This MUST hold without relying on client-side JavaScript.

#### Scenario: Reopening the list names the saved choice and keeps it on save
**ID**: SCN-ADDR-011-A
- **GIVEN** the user has chosen an address found on a later page and saved it
- **WHEN** they reopen the list to change it
- **THEN** the list opens on its first page, naming the address already selected, although that record's own row is not shown
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
