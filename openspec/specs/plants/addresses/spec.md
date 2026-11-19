# Addresses Specification

## Purpose

How a high-risk plants notification chooses the consignor, place of destination and consignment contact address from the organisation's address book — search and the copy it keeps — and how that copy is edited on the notification without changing the book. When a copy blocks submission is governed by `plants/journey-obligations/review`.

## Requirements

### Requirement: The consignor and place of destination pickers list only addresses saved for their own role, and any saved with no role; the contact picker lists every address
**ID**: REQ-PLANTS-ADDR-013
The system MUST list, on the consignor picker, only the organisation's addresses saved for the consignor role, together with any address saved with no role at all; on the place of destination picker, only those saved for the place of destination role, together with any saved with no role. The consignment contact picker MUST list every address the organisation holds, whatever its role.

#### Scenario: The consignor picker lists only consignor-role and role-less addresses
**ID**: SCN-PLANTS-ADDR-013-A
- **GIVEN** the organisation has an address saved for the place of destination role and an address saved with no role at all
- **WHEN** the user opens the consignor picker
- **THEN** the role-less address is listed, and the place-of-destination address is not

#### Scenario: The place of destination picker lists only its own role and role-less addresses
**ID**: SCN-PLANTS-ADDR-013-B
- **GIVEN** the organisation has an address saved for the consignor role and an address saved with no role at all
- **WHEN** the user opens the place of destination picker
- **THEN** the role-less address is listed, and the consignor address is not

#### Scenario: The consignment contact picker lists every address, whatever its role
**ID**: SCN-PLANTS-ADDR-013-C
- **GIVEN** the organisation has addresses saved for the consignor role, the place of destination role and no role at all
- **WHEN** the user opens the consignment contact picker
- **THEN** all of them are listed

### Requirement: Each listed address shows its lines on their own lines and ends with a disclosure of its contact details
**ID**: REQ-PLANTS-ADDR-014
On the consignor, place of destination and consignment contact pickers, the system MUST show each listed address's street lines on their own lines, then its town or city, county and postcode together on one line, joined by commas, with blank parts left out; the country has its own column. Each row MUST end with a "View details" disclosure that opens in place and shows that record's telephone number and email address.

#### Scenario: An address shows its street lines, then its town, county and postcode on one line
**ID**: SCN-PLANTS-ADDR-014-A
- **GIVEN** a listed address has two street lines, a town, a county and a postcode
- **WHEN** the user finds it on a picker
- **THEN** each street line shows on its own line, then the town, county and postcode on one line

#### Scenario: Blank parts are left out
**ID**: SCN-PLANTS-ADDR-014-B
- **GIVEN** a listed address has no second street line and no county
- **WHEN** it is shown on a picker
- **THEN** it shows its street line, then its town and postcode on one line, with no blank line

#### Scenario: A row's disclosure shows only the record's telephone number and email address
**ID**: SCN-PLANTS-ADDR-014-C
- **GIVEN** the user is on a picker
- **WHEN** they open a row's "View details" disclosure
- **THEN** it opens in place, without leaving the page, and shows that record's telephone number then its email address
- **AND** the record's name, address lines and country are read from the row's own columns, not the disclosure

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

### Requirement: The picker offers a search of its own list, reporting how many matched, and shows every match on one page
**ID**: REQ-PLANTS-ADDR-002
The system MUST search the picker's list on the server, from the button named "Search" beside the box or by pressing Enter, narrowing it to matching records. It MUST report under the heading "Select an address" how many are shown out of the total, offer them as one group with that name, and show every one on one page. A search matching nothing MUST say so, not show an empty table; clearing it MUST restore the whole list.

#### Scenario: The picker shows its whole list on one page, with its count
**ID**: SCN-PLANTS-ADDR-002-A
- **GIVEN** the user opens the picker
- **WHEN** the page loads
- **THEN** every address the picker's list holds is shown
- **AND** under the heading "Select an address" the page reads "Showing <total> out of <total> results"

#### Scenario: Searching narrows the list to the matching term
**ID**: SCN-PLANTS-ADDR-002-B
- **GIVEN** the user is on the picker
- **WHEN** they search for a term matching one or more addresses
- **THEN** only those addresses are shown
- **AND** under the heading "Select an address" the page reads "Showing <shown> out of <total> results" for the matches

#### Scenario: A search matching nothing says so, rather than showing an empty table
**ID**: SCN-PLANTS-ADDR-002-C
- **GIVEN** the user searches for a term matching no address
- **WHEN** the results are shown
- **THEN** a message says nothing matched, not an empty table

#### Scenario: Clearing the search restores the whole list
**ID**: SCN-PLANTS-ADDR-002-D
- **GIVEN** the user has searched the picker's list
- **WHEN** they clear the search and search again with nothing entered
- **THEN** the whole list is shown again

#### Scenario: Without JavaScript, Enter in the search box narrows the list
**ID**: SCN-PLANTS-ADDR-002-E
- **GIVEN** the user is on the picker with JavaScript off
- **WHEN** they enter a term in the search box and press Enter
- **THEN** only the matching addresses are shown
- **AND** the search box still holds the term

#### Scenario: The listed addresses are one group named "Select an address"
**ID**: SCN-PLANTS-ADDR-002-F
- **GIVEN** the user opens the picker
- **WHEN** the page loads
- **THEN** every listed address belongs to one group named "Select an address"

### Requirement: A row checked before searching stays checked
**ID**: REQ-PLANTS-ADDR-003
The system MUST keep a row the user has checked checked across a further search, even when its own row is not on the list the search shows.

#### Scenario: A checked row survives a further search
**ID**: SCN-PLANTS-ADDR-003-A
- **GIVEN** the user has checked a row
- **WHEN** they search again with a term that would not list that row
- **THEN** the checked address is still checked

### Requirement: Choosing a replacement address replaces the one already saved
**ID**: REQ-PLANTS-ADDR-004
The system MUST replace the address a role already holds with a copy of a newly chosen record rather than keeping both.

#### Scenario: Saving a new choice replaces the old one
**ID**: SCN-PLANTS-ADDR-004-A
- **GIVEN** a role already has a saved address chosen from the picker
- **WHEN** the user chooses a different address and saves
- **THEN** the role's saved address is the new one, and the old one is no longer associated with the role

### Requirement: Saving with nothing chosen is not refused, and a value not on the list is refused and focuses the first row
**ID**: REQ-PLANTS-ADDR-005
Every save control on a picker MUST make the same checks. The system MUST NOT refuse a picker's save when nothing has been chosen: it MUST move on without an error, committing nothing, so the role stays empty or keeps the address it held. It MUST refuse any picker's save of a value that is not an address-book id it offered, a since-deleted record included, preserving the search term. Following the error MUST focus the first row, or the search field when a search left the list empty.

#### Scenario: A deleted or missing address-book id is rejected and the search preserved
**ID**: SCN-PLANTS-ADDR-005-B
- **GIVEN** the user submits an address-book id that no longer exists
- **WHEN** the save is attempted
- **THEN** the save is rejected with the same error, and the search term the user had entered is preserved
- **WHEN** they follow the error
- **THEN** the first row in the list is focused

#### Scenario: Saving the consignor or place of destination picker with nothing chosen moves on
**ID**: SCN-PLANTS-ADDR-005-D
- **GIVEN** the user is on the consignor or place of destination picker with nothing chosen, for a role that holds no address yet
- **WHEN** they save and continue
- **THEN** they reach the page that picker's save leads to, with no error
- **AND** the role still holds no address

#### Scenario: An address-book id the book no longer holds is refused after a search that left the list empty
**ID**: SCN-PLANTS-ADDR-005-E
- **GIVEN** the user is on a picker where a search left the list empty
- **WHEN** they save an id the book no longer holds
- **THEN** the party error is shown
- **AND** following the error focuses the search field, which still holds the term

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
The system MUST show, on each picker, the address the notification holds for that role, as edited if it has been, in a card titled "Current consignor", "Current place of destination" or "Current contact address", with an "Edit details" link to its edit page, beside the list for choosing a different record. A role with no address yet MUST show no such card. The same two actions on check your answers are governed by `plants/journey-pages/check-your-answers`.

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

### Requirement: Reopening the picker shows the address already chosen checked, and keeps it on a blank save
**ID**: REQ-PLANTS-ADDR-012
The system MUST show the record a role's address was chosen from as the checked row when the user reopens the picker, with nothing restating the choice above the list, and MUST keep the address already on the notification when they save with nothing ticked. It MUST show no row checked once the address's details have been edited on the notification, or once that record has been deleted from the address book.

#### Scenario: Reopening the picker shows the record the address was chosen from ticked
**ID**: SCN-PLANTS-ADDR-012-A
- **GIVEN** the user has chosen an address and saved it
- **WHEN** they reopen the picker
- **THEN** that record is ticked, with nothing restating it above the list

#### Scenario: Saving with nothing ticked keeps the address already held
**ID**: SCN-PLANTS-ADDR-012-B
- **GIVEN** a role holds an address whose details have been edited on the notification, so no record is ticked
- **WHEN** the user saves the picker with nothing ticked
- **THEN** the save is accepted with no error, and the role still holds the edited address

#### Scenario: Reopening the picker shows no row checked once the record is deleted from the book
**ID**: SCN-PLANTS-ADDR-012-C
- **GIVEN** the user has chosen an address and saved it
- **AND** the record has since been deleted from the address book
- **WHEN** they reopen the picker
- **THEN** no row is checked, and the current address card still shows the copy

#### Scenario: Reopening the picker shows no row checked once the address is edited on the notification
**ID**: SCN-PLANTS-ADDR-012-D
- **GIVEN** the user has chosen an address and saved it
- **AND** they have since edited its details on the notification
- **WHEN** they reopen the picker
- **THEN** no row is checked
