# Address Book Specification

## Purpose

The INS address book itself — adding, editing and deleting records, and how they are shared within an organisation.

## Requirements

### Requirement: An address is shared across every user in the organisation that added it
**ID**: REQ-INS-ADDR-001
The system MUST make an address visible to every user in the organisation that added it, not only the user who added it.

#### Scenario: An address added by one user is visible to a colleague in the same organisation
**ID**: SCN-INS-ADDR-001-A
- **GIVEN** one user has added an address to their organisation's address book
- **WHEN** another user in that same organisation opens the address book
- **THEN** the address is listed for them too

### Requirement: Deleting an address tombstones it rather than removing it, and the tombstone is invisible to every user in the organisation
**ID**: REQ-INS-ADDR-002
The system MUST remove a deleted address from the list and from search for every user in the organisation, while keeping the record retrievable by its own id, marked deleted, so nothing that already references it is left dangling.

#### Scenario: A deleted address is removed from the list but not destroyed
**ID**: SCN-INS-ADDR-002-A
- **GIVEN** an address exists
- **WHEN** the user deletes it through the address book
- **THEN** it no longer appears in the address book list
- **AND** the record can still be retrieved directly by its own id, marked as deleted, with its details intact

#### Scenario: A deletion by one user removes the address for every user in the organisation
**ID**: SCN-INS-ADDR-002-B
- **GIVEN** an address exists in an organisation's address book
- **WHEN** one user deletes it
- **THEN** it no longer appears in the address book list for any other user in that organisation

### Requirement: Editing an address replaces the whole record, clearing any optional field left blank
**ID**: REQ-INS-ADDR-003
The system MUST replace an address's entire record on edit, so an optional field left blank in the edit is cleared, not left holding its previous value, and MUST show the edited address under its new name in the list, in place of the old one.

#### Scenario: Leaving an optional field blank on edit clears it
**ID**: SCN-INS-ADDR-003-A
- **GIVEN** an address has an optional field filled in (for example, a county)
- **WHEN** the user edits the address and leaves that field blank
- **THEN** the stored record no longer holds a value for that field

#### Scenario: A renamed address replaces the old one in the list
**ID**: SCN-INS-ADDR-003-B
- **GIVEN** an address exists under one name
- **WHEN** the user edits it to a new name
- **THEN** the address book list shows the address under its new name

### Requirement: A newly created address persists its full set of details
**ID**: REQ-INS-ADDR-004
The system MUST persist every field entered for a new address, including its optional ones.

#### Scenario: Every field entered when creating an address is persisted
**ID**: SCN-INS-ADDR-004-A
- **GIVEN** the user creates an address, filling in every field including the optional ones (such as address line 2 and county)
- **WHEN** the stored record is checked
- **THEN** it holds every field exactly as entered

### Requirement: The add and edit forms ask for the same Standard Address Block, with two fields optional
**ID**: REQ-INS-ADDR-005
The system MUST ask for name, address line 1, town or city, postcode, country, phone number and email address as mandatory, and address line 2 and county as optional, on both the add and the edit form, and MUST hint that an international phone number should include its country code, and MUST offer in the country field, wherever the country is a choice, every country the reference data service serves, by its served name, in alphabetical order, with United Kingdom in its alphabetical place.

#### Scenario: The add form asks for every field, marking address line 2 and county optional
**ID**: SCN-INS-ADDR-005-A
- **GIVEN** the user opens the add address form
- **WHEN** the page is shown
- **THEN** every field is asked for, with address line 2 and county labelled optional
- **AND** the country field offers a populated list of countries
- **AND** a hint explains that an international phone number should include its country code

#### Scenario: The country field lists every country alphabetically, United Kingdom in its place
**ID**: SCN-INS-ADDR-005-B
- **GIVEN** the user opens the address book's add or edit address form, or the add form reached from a notification's place of origin or consignor picker
- **WHEN** the country list is read in full
- **THEN** after any placeholder it offers United Kingdom and every country the reference data service serves, by their served names, in alphabetical order

### Requirement: A mandatory field left blank blocks the save, naming and focusing it
**ID**: REQ-INS-ADDR-006
The system MUST block the save when a mandatory field is left blank, MUST show an error naming which field, and MUST focus that field when the error is followed, without discarding anything entered elsewhere on the form.

#### Scenario: Leaving a mandatory field blank on add blocks the save
**ID**: SCN-INS-ADDR-006-A
- **GIVEN** the user is adding an address with every other field validly filled in
- **WHEN** they leave a mandatory field blank and save
- **THEN** the save is blocked, an error names the blank field, and following it focuses that field
- **AND** the values entered for every other field are still shown

#### Scenario: Clearing a mandatory field on edit blocks the save
**ID**: SCN-INS-ADDR-006-B
- **GIVEN** the user is editing an address and has changed a second field at the same time
- **WHEN** they clear a mandatory field and save
- **THEN** the save is blocked, an error names the cleared field
- **AND** the other field's new value is still shown, not the value the record held before editing

### Requirement: Every field has a maximum length, and exceeding it blocks the save without losing the value
**ID**: REQ-INS-ADDR-007
The system MUST reject a value exceeding a field's maximum length — 255 characters for name, address line 1 and address line 2; 100 for town or city and county; 12 for postcode; 20 for phone number; 254 for email address — naming the limit in the error, and MUST preserve the over-length value so the user can edit it down rather than retype it.

#### Scenario: A field over its maximum length blocks the save with the value preserved
**ID**: SCN-INS-ADDR-007-A
- **GIVEN** the user enters a value longer than a field's maximum length
- **WHEN** they save
- **THEN** the save is blocked, an error names the field and its character limit
- **AND** the over-length value is still shown in the field

### Requirement: An email address must be in a valid format
**ID**: REQ-INS-ADDR-008
The system MUST reject an email address that is not validly formatted, with an error distinct from the one shown for a blank email field, and MUST preserve the entered value.

#### Scenario: A malformed email address is rejected
**ID**: SCN-INS-ADDR-008-A
- **GIVEN** the user enters an email address that is not validly formatted
- **WHEN** they save
- **THEN** the save is blocked, an error explains the email address must be in the correct format
- **AND** the entered value is still shown

### Requirement: Saving a new or edited address shows a confirmation naming it
**ID**: REQ-INS-ADDR-009
The system MUST return the user to the address book list on a successful save, and MUST show a confirmation naming the address as it is stored and stating whether it was added or updated. An add's confirmation reads '<Name> address added to your address book', and the new address MUST be listed first, with a way to view it. An edit's confirmation reads '<Name> address updated'.

#### Scenario: Adding an address confirms it and lists it first
**ID**: SCN-INS-ADDR-009-A
- **GIVEN** the user has filled in a valid new address
- **WHEN** they save it
- **THEN** they return to the address book, and a 'Success' confirmation reads '<name> address added to your address book'
- **AND** the new address is listed first, with a View link that opens its own details page

#### Scenario: Editing an address's name confirms it under its new name
**ID**: SCN-INS-ADDR-009-B
- **GIVEN** the user edits an address, changing its name
- **WHEN** they save it
- **THEN** they return to the address book, and the address book says '<new name> address updated'
- **AND** the address is offered for viewing under its new name

### Requirement: Cancelling the add or edit form discards changes
**ID**: REQ-INS-ADDR-010
The system MUST discard anything entered on the add or edit form when the user cancels, and MUST NOT save it. Cancelling the add form opened from the address book returns the user to the address book list: cancelling is a 'Cancel and return to address book' link below 'Save and continue'. Cancelling the edit form goes to the page the edit was opened from, by default the address's details page (REQ-INS-ADDR-025).

#### Scenario: Cancelling add discards the form without creating an address
**ID**: SCN-INS-ADDR-010-A
- **GIVEN** the user has typed into the add address form without saving
- **WHEN** they follow the 'Cancel and return to address book' link below 'Save and continue'
- **THEN** they return to the address book, and nothing they typed appears anywhere in it

#### Scenario: Cancelling edit discards the changes, leaving the stored address as it was
**ID**: SCN-INS-ADDR-010-B
- **GIVEN** the user has changed a field on an existing address without saving
- **WHEN** they cancel
- **THEN** the address's details open, the change is discarded, and the address keeps its original name

#### Scenario: Cancelling an edit opened with a return lands on that return
**ID**: SCN-INS-ADDR-010-C
- **GIVEN** the user opened the edit form with a return to a page of this service and has typed a new name without saving
- **WHEN** they cancel
- **THEN** that page opens
- **AND** the address keeps its original name

### Requirement: Deleting an address asks for confirmation, summarising the address, before it is removed
**ID**: REQ-INS-ADDR-011
The system MUST ask the user to confirm before deleting an address, on a page headed 'Delete this address?' summarising the address in one 'Address' row, or 'Not applicable' when it has no details. The page warns that the action cannot be undone, offers a red 'Yes, delete' button and a 'No, cancel' link, and MUST leave the address untouched on cancel. A delete landing on the address book (REQ-INS-ADDR-024) says '<Name> address deleted', or 'Address deleted' for a blank name.

#### Scenario: The delete confirmation summarises the address and asks for confirmation
**ID**: SCN-INS-ADDR-011-A
- **GIVEN** the user opens the delete confirmation for an address
- **WHEN** the page is shown
- **THEN** the page is headed 'Delete this address?', shows one 'Address' row holding the name, address lines 1 and 2, town or city, county, postcode and country, one per line, with no email or phone
- **AND** it says 'Confirm that you want to delete this address.' and 'Deletions are permanent and you cannot undo this.', with a way back to its details

#### Scenario: Following No, cancel leaves the address untouched
**ID**: SCN-INS-ADDR-011-B
- **GIVEN** the user is on an address's delete confirmation
- **WHEN** they follow 'No, cancel' instead of confirming
- **THEN** they return to that address's own details, it is still listed in the address book, and no confirmation banner shows

#### Scenario: Confirming deletion removes the address and confirms it
**ID**: SCN-INS-ADDR-011-C
- **GIVEN** the user is on an address's delete confirmation, opened without a return
- **WHEN** they select 'Yes, delete'
- **THEN** they return to the address book, which says '<Name> address deleted' with the name as it is stored, such as 'Green Valley Farm address deleted'
- **AND** it is no longer offered for viewing

#### Scenario: An address with nothing to show is summarised as Not applicable
**ID**: SCN-INS-ADDR-011-E
- **GIVEN** an address with no name, address, postcode or country
- **WHEN** the user opens its delete confirmation
- **THEN** the Address row shows 'Not applicable'

#### Scenario: Deleting an address with a blank name says Address deleted
**ID**: SCN-INS-ADDR-011-F
- **GIVEN** the user is on the delete confirmation for an address whose name is blank
- **WHEN** they select 'Yes, delete'
- **THEN** they return to the address book, which says 'Address deleted'

### Requirement: The address book list shows each address's key details, with a way to view, and a way to add one
**ID**: REQ-INS-ADDR-012
The system MUST head the list 'Address book' with an intro, then offer a way to add a new address, then the filter (REQ-INS-ADDR-028). It MUST list each address's name, stored postal address lines and country, newest first, with a way to open its own details, and be reachable from the service's navigation. When the address book cannot be loaded, the system MUST respond with a server error, keep the heading, intro, add action and filter, and show no results line and no table.

#### Scenario: The list renders each address's details, with columns and an add action
**ID**: SCN-INS-ADDR-012-A
- **GIVEN** the user has addresses in their address book
- **WHEN** they view the address book
- **THEN** the intro reads 'Manage your addresses for use across all your import notifications'
- **AND** an action to add a new address is offered directly under the intro
- **AND** each address is listed with its name, address and country under the columns Name, Address, Country and Action

#### Scenario: A name of more than one word shows on two lines
**ID**: SCN-INS-ADDR-012-D
- **GIVEN** the address book holds an address named 'Green valley farm' and another named 'Hollin'
- **WHEN** the user views the address book
- **THEN** the first name shows 'Green' on one line and 'valley farm' on the next
- **AND** the second name shows 'Hollin' on one line

#### Scenario: Each stored address line shows on its own line
**ID**: SCN-INS-ADDR-012-E
- **GIVEN** an address holds address line 1, address line 2, town or city, county and postcode, and another holds only address line 1, town or city and postcode
- **WHEN** the user views the address book
- **THEN** the first address shows its five lines in that order, each on its own line and each but the last ending in a comma
- **AND** the second address shows its three lines, with the blank lines left out

#### Scenario: Selecting an address from the list opens its own details page
**ID**: SCN-INS-ADDR-012-B
- **GIVEN** the user is viewing the address book list
- **WHEN** they choose to view a listed address
- **THEN** that address's own details page opens, headed with its name

#### Scenario: The address book is reached from the service's navigation
**ID**: SCN-INS-ADDR-012-C
- **GIVEN** the user is signed in
- **WHEN** they follow the Address book link in the navigation
- **THEN** the address book list opens

#### Scenario: The list cannot be loaded
**ID**: SCN-INS-ADDR-012-F
- **GIVEN** the address book cannot be reached
- **WHEN** the user views the address book
- **THEN** the page responds with a server error and shows 'Sorry, there is a problem with the service. Try again in a few minutes.'
- **AND** the heading 'Address book', the intro, the action to add a new address and the filter are still shown
- **AND** no results line and no table are shown

#### Scenario: A newer address is listed before an older one
**ID**: SCN-INS-ADDR-012-G
- **GIVEN** an address was added to the address book after another
- **WHEN** the user views the address book
- **THEN** the newer address is listed before the older one

### Requirement: The list is paged once it holds more than one page of addresses
**ID**: REQ-INS-ADDR-013
The system MUST page the address book list once it holds more than eight addresses, showing the range currently displayed against the total.

#### Scenario: More than eight addresses are shown across pages
**ID**: SCN-INS-ADDR-013-A
- **GIVEN** an organisation's address book holds more than eight addresses
- **WHEN** the user views the list
- **THEN** it shows the first eight, reporting the range shown against the total
- **WHEN** they move to the next page
- **THEN** the remaining addresses are shown, with the range and total updated to match

### Requirement: An empty address book shows no rows and invites the user to add the first address
**ID**: REQ-INS-ADDR-014
The system MUST show 'Showing 0 of 0' and the table with its column headers and no rows, and MUST offer a way to add an address, when an organisation has none.

#### Scenario: No addresses shows an empty table and an add action
**ID**: SCN-INS-ADDR-014-A
- **GIVEN** an organisation has no addresses
- **WHEN** the user views the address book
- **THEN** the list reads 'Showing 0 of 0'
- **AND** the table shows the column headers Name, Address, Country and Action with no rows
- **AND** an action to add one is offered

### Requirement: Viewing an address lists its Standard Address Block against its labels, leaving out blank optional fields, and offers to edit or delete it
**ID**: REQ-INS-ADDR-015
The system MUST show each field of an address against its label on its own page. It MUST show address line 2, labelled 'Address line 2 (optional)', after Address line 1, and county, labelled 'County (optional)', after Town or city, only when the address holds a value for them, never as a blank row. It MUST offer to edit or delete that address, and a way back to the list, or to the page it was opened from (REQ-INS-ADDR-024).

#### Scenario: The view page leaves out a blank address line 2 and county
**ID**: SCN-INS-ADDR-015-A
- **GIVEN** the user opens an address with address line 2 and county left blank
- **WHEN** the page is shown
- **THEN** every other field is listed against its label
- **AND** no address line 2 or county row is shown

#### Scenario: The view page offers to edit or delete the address being viewed
**ID**: SCN-INS-ADDR-015-B
- **GIVEN** the user is viewing an address
- **WHEN** the page is shown
- **THEN** an action to edit and an action to delete that same address are both offered

#### Scenario: Back from the view page returns to the address book
**ID**: SCN-INS-ADDR-015-C
- **GIVEN** the user is viewing an address opened without a return
- **WHEN** they select Back
- **THEN** they return to the address book list

#### Scenario: An address with line 2 and county shows them, marked optional
**ID**: SCN-INS-ADDR-015-D
- **GIVEN** the user opens an address with address line 2 and county filled in
- **WHEN** the page is shown
- **THEN** 'Address line 2 (optional)' follows Address line 1 and 'County (optional)' follows Town or city, each with its value

### Requirement: Adding from a journey handshake refuses an unrecognised journey type
**ID**: REQ-INS-ADDR-016
The system MUST refuse the add-address page when the request carries a journey handshake whose journey type is not one the service knows, and MUST show a page-not-found response rather than the form.

#### Scenario: An unrecognised journey type is refused
**ID**: SCN-INS-ADDR-016-A
- **GIVEN** the user opens the add-address page with a handshake naming a journey type the service does not know
- **WHEN** the page is shown
- **THEN** they see a page-not-found response, not the add form

### Requirement: A missing name, postcode, country or phone number is named in the words the form uses for it
**ID**: REQ-INS-ADDR-018
The system MUST tell the user 'Enter a name or organisation', 'Enter a postcode or Zip code', 'Select a country' (also when the country is not one offered) or 'Enter a phone number' when that field is missing, in the 'There is a problem' summary and against the field, on the add and the edit form. 'Select a country' applies where the form offers a choice of country. The address book MUST refuse a create or update missing any of them with the same message, keyed by that field.

#### Scenario: Leaving name, postcode, country and phone blank on add names each in the form's words
**ID**: SCN-INS-ADDR-018-A
- **GIVEN** the user is adding an address on the address book's add form or on the add form reached from a notification's place of origin or consignor picker
- **WHEN** they leave the name, postcode, country and phone number blank and save
- **THEN** the summary and each field show 'Enter a name or organisation', 'Enter a postcode or Zip code', 'Select a country' and 'Enter a phone number'

#### Scenario: Clearing name, postcode and phone on edit with no country chosen shows the same messages, and nothing is saved
**ID**: SCN-INS-ADDR-018-B
- **GIVEN** the user is editing an address whose stored country is not one the list offers
- **WHEN** they clear the name, postcode and phone number and save with no country chosen
- **THEN** the summary and each field show the same four messages
- **AND** the stored address is unchanged

#### Scenario: A country that is not offered is refused as if none were chosen
**ID**: SCN-INS-ADDR-018-C
- **GIVEN** the user is adding or editing an address on a form that offers a choice of country
- **WHEN** the form is saved with a country that is not one the list offers
- **THEN** the save is blocked and 'Select a country' is shown

#### Scenario: The address book refuses a missing name, postcode, country or phone with the same messages
**ID**: SCN-INS-ADDR-018-D
- **GIVEN** a service creates an address with the name, postcode, country and phone number blank
- **WHEN** the request is made
- **THEN** it is refused with a validation error giving 'Enter a name or organisation', 'Enter a postcode or Zip code', 'Select a country' and 'Enter a phone number' against those fields
- **AND** no address is created

### Requirement: The address form groups its fields under 'Address' and 'Contact details'
**ID**: REQ-INS-ADDR-021
The system MUST group the address fields under 'Address' and Email address and Phone number under 'Contact details' on the add and edit forms, with Email address before Phone number and 'County (optional)' between 'Town or city' and 'Postcode or Zip code' on both, and the edit form MUST ask for nothing else. Both MUST show the name, address lines and email address full width, town, county, postcode and country half width, and the phone number two-thirds width.

#### Scenario: The add and edit forms group their fields under Address and Contact details
**ID**: SCN-INS-ADDR-021-A
- **GIVEN** the user opens the add form or the edit form
- **WHEN** the page is shown
- **THEN** the address fields sit under 'Address', and Email address and Phone number under 'Contact details'

#### Scenario: The add form sizes its fields to the answers they take
**ID**: SCN-INS-ADDR-021-E
- **GIVEN** the user opens the add form
- **WHEN** the page is shown
- **THEN** the name, both address lines and the email address are full width
- **AND** 'Town or city', 'County', 'Postcode or Zip code' and the Country select are half width
- **AND** the phone number is two-thirds width

#### Scenario: The edit form takes the add form's order and widths
**ID**: SCN-INS-ADDR-021-F
- **GIVEN** the user opens the edit form
- **WHEN** the page is shown
- **THEN** the fields read 'Name or organisation', 'Address line 1', 'Address line 2 (optional)', 'Town or city', 'County (optional)', 'Postcode or Zip code', 'Country', 'Email address' and 'Phone number', in that order
- **AND** they sit at the add form's widths
- **AND** nothing else is asked

### Requirement: Opening an address that is not live in the organisation's book returns to the address book
**ID**: REQ-INS-ADDR-022
The system MUST take the user to the address book list, and MUST NOT show a 'Page not found' page, when they open the view page for an id that is not a live address in their organisation's book: an unknown id, a malformed id, another organisation's address or a deleted address, unless the link carries an honoured return, when it lands there (REQ-INS-ADDR-024).

#### Scenario: An unknown address id returns to the address book
**ID**: SCN-INS-ADDR-022-A
- **GIVEN** a signed-in user
- **WHEN** they open the view page for an id that no address has
- **THEN** the address book list is shown and no 'Page not found' page

#### Scenario: A malformed address id returns to the address book
**ID**: SCN-INS-ADDR-022-B
- **GIVEN** a signed-in user
- **WHEN** they open the view page for an id that is not a valid address id
- **THEN** the address book list is shown and no 'Page not found' page

#### Scenario: Another organisation's address returns to the address book
**ID**: SCN-INS-ADDR-022-C
- **GIVEN** a signed-in user
- **WHEN** they open the view page for an address in another organisation's book
- **THEN** the address book list is shown and no 'Page not found' page
- **AND** none of its details are shown

#### Scenario: A deleted address returns to the address book
**ID**: SCN-INS-ADDR-022-D
- **GIVEN** a signed-in user
- **WHEN** they open the view page for an address that has been deleted
- **THEN** the address book list is shown and no 'Page not found' page

### Requirement: Deleting an address that is not live in the organisation's book returns to the address book and changes nothing
**ID**: REQ-INS-ADDR-023
The system MUST take the user to the address book list, with no 'Page not found' page, when they open the delete page for an id that is not a live address in their organisation's book. A delete posted for such an id MUST change nothing, MUST show no confirmation banner and MUST land on the list, unless the link carries an honoured return, when it lands there (REQ-INS-ADDR-024).

#### Scenario: An unknown address id's delete page returns to the address book
**ID**: SCN-INS-ADDR-023-A
- **GIVEN** a signed-in user
- **WHEN** they open the delete page for an id that no address has
- **THEN** the address book list is shown and no 'Page not found' page

#### Scenario: A malformed address id's delete page returns to the address book
**ID**: SCN-INS-ADDR-023-B
- **GIVEN** a signed-in user
- **WHEN** they open the delete page for an id that is not a valid address id
- **THEN** the address book list is shown and no 'Page not found' page

#### Scenario: A deleted address's delete page returns to the address book
**ID**: SCN-INS-ADDR-023-C
- **GIVEN** a signed-in user
- **WHEN** they open the delete page for an address that has been deleted
- **THEN** the address book list is shown and no 'Page not found' page

#### Scenario: A stale delete changes nothing and shows no banner
**ID**: SCN-INS-ADDR-023-D
- **GIVEN** the user has an address's delete confirmation open
- **AND** the address has since been deleted
- **WHEN** they select 'Yes, delete'
- **THEN** they land on the address book with no confirmation banner and no 'Page not found' page

### Requirement: The view and delete pages return the user to the page they opened the address from
**ID**: REQ-INS-ADDR-024
The system MUST honour a return given when the view or delete page is opened, if it is a page of this service or, outside stub mode, exactly that environment's animals frontend, and MUST ignore any other. The view page's Back MUST go to it, and Edit and Delete MUST carry it on. The delete page's Back and 'No, cancel' MUST go to the view page still carrying it. 'Yes, delete' and a dead link MUST land on it, or on the list when it is one of that address's own pages.

#### Scenario: Back from the view page follows a return to a page of this service
**ID**: SCN-INS-ADDR-024-A
- **GIVEN** the user opens an address with a return to a page of this service
- **WHEN** they select Back
- **THEN** that page opens
- **AND** Edit and Delete carry the same return on

#### Scenario: The delete page reached with a return goes back to the view page still carrying it
**ID**: SCN-INS-ADDR-024-B
- **GIVEN** the user opens an address's delete confirmation with a return
- **WHEN** they select Back or 'No, cancel'
- **THEN** the address's details open, still carrying the return

#### Scenario: Confirming deletion lands on the return
**ID**: SCN-INS-ADDR-024-C
- **GIVEN** the delete confirmation was opened with a return that is not one of that address's own pages
- **WHEN** they select 'Yes, delete'
- **THEN** the address is deleted and the return page opens

#### Scenario: Confirming deletion with a return to one of the deleted address's own pages lands on the address book
**ID**: SCN-INS-ADDR-024-D
- **GIVEN** the return is one of the deleted address's own pages, such as its details, edit or delete page
- **WHEN** they select 'Yes, delete'
- **THEN** the address book list opens, saying '<Name> address deleted'

#### Scenario: A return to a live-animals journey page is honoured
**ID**: SCN-INS-ADDR-024-E
- **GIVEN** an address opened with a return to a live-animals journey page on that environment's animals frontend
- **WHEN** they select Back
- **THEN** that journey page opens
- **AND** after 'Yes, delete' they land on it too

#### Scenario: A return to a germinal products page on the animals frontend is honoured
**ID**: SCN-INS-ADDR-024-F
- **GIVEN** an address opened with a return to a germinal products page on that same animals frontend
- **WHEN** they select Back
- **THEN** they land on that page

#### Scenario: Any other return is ignored
**ID**: SCN-INS-ADDR-024-G
- **GIVEN** an address opened with a return on another site (including the plants frontend), one starting with //, or any other value that is neither a path of this service nor a URL on that environment's animals frontend
- **WHEN** they select Back
- **THEN** the address book list opens
- **AND** on its delete confirmation Back and 'No, cancel' go to the address's details

#### Scenario: In stub mode only a return to a page of this service is honoured
**ID**: SCN-INS-ADDR-024-H
- **GIVEN** the service runs in stub mode
- **WHEN** an address is opened with a return on the animals frontend
- **THEN** Back goes to the address book list

#### Scenario: A dead link carrying an honoured return lands on it
**ID**: SCN-INS-ADDR-024-I
- **GIVEN** a view or delete link for an address that is not live in the book carries an honoured return that is not one of that address's own pages
- **WHEN** it is opened
- **THEN** the return page opens, not the address book and not a 'Page not found' page

### Requirement: The edit page is headed 'Edit address and contact details' and returns the user to where they opened it
**ID**: REQ-INS-ADDR-025
The system MUST head the edit page 'Edit address and contact details', with no caption. Its 'Back' link MUST go to the page named by an honoured return (REQ-INS-ADDR-024), otherwise to the address's details page. Opening or saving the edit page for an address that is not live in the user's book MUST save nothing and land on the honoured return, or on the address book list, and MUST NOT show a 'Page not found' page.

#### Scenario: The edit page is headed Edit address and contact details
**ID**: SCN-INS-ADDR-025-A
- **GIVEN** a live address
- **WHEN** its edit page opens
- **THEN** it is headed 'Edit address and contact details' with no caption

#### Scenario: Back goes to the address's details by default
**ID**: SCN-INS-ADDR-025-B
- **GIVEN** the edit page opened without a return
- **WHEN** the user selects Back
- **THEN** the address's details open

#### Scenario: Back follows an honoured return
**ID**: SCN-INS-ADDR-025-C
- **GIVEN** the edit page opened with a return to a page of this service
- **WHEN** the user selects Back
- **THEN** that page opens

#### Scenario: An edit link for an address not in the book goes back
**ID**: SCN-INS-ADDR-025-D
- **GIVEN** an edit link for an unknown, malformed, another organisation's or deleted address
- **WHEN** it is opened
- **THEN** the address book list opens, or the honoured return when the link carries one that is not one of that address's own pages
- **AND** no 'Page not found' page is shown

#### Scenario: Saving an address deleted meanwhile changes nothing
**ID**: SCN-INS-ADDR-025-E
- **GIVEN** the edit page is open and the address has since been deleted
- **WHEN** the user saves
- **THEN** they land on the address book list
- **AND** the address stays deleted, unchanged

### Requirement: The edit form's Country select shows the stored country without a blank option when it is offered
**ID**: REQ-INS-ADDR-026
The system MUST show the edit form's Country select with no blank option and the stored country selected when that country is one the list offers, and MUST open it on a blank option with no country selected when the stored country is not one the list offers.

#### Scenario: The edit form's Country select shows the stored country with no blank option
**ID**: SCN-INS-ADDR-026-A
- **GIVEN** an address whose country is one the list offers
- **WHEN** the user opens the edit form
- **THEN** the Country select has no blank option
- **AND** that country is selected

#### Scenario: An unoffered stored country opens with no country selected
**ID**: SCN-INS-ADDR-026-B
- **GIVEN** an address whose stored country is not one the list offers
- **WHEN** the user opens the edit form
- **THEN** the Country select opens on a blank option
- **AND** no country is selected

### Requirement: The add form names its first field 'Name or organisation', opens its Country select on 'Select a country' from the address book and the place of origin and consignor pickers, and is opened directly from the address book
**ID**: REQ-INS-ADDR-027
The system MUST label the add form's name 'Name or organisation', as the edit form does, keep 'County (optional)' on it between 'Town or city' and 'Postcode or Zip code', and, opened from the address book or from a notification's place of origin or consignor picker, open its Country select on a blank first option reading 'Select a country', with no country chosen. 'Add a new address' on the address book MUST open the add form directly, with a 'Back' link to the address book.

#### Scenario: The add form names the name field 'Name or organisation' and keeps County
**ID**: SCN-INS-ADDR-027-A
- **GIVEN** the user opens the add form
- **WHEN** the page is shown
- **THEN** the fields read 'Name or organisation', 'Address line 1', 'Address line 2 (optional)', 'Town or city', 'County (optional)' and 'Postcode or Zip code', in that order
- **AND** the edit form labels the name 'Name or organisation' too

#### Scenario: The add form opens the Country select on Select a country
**ID**: SCN-INS-ADDR-027-B
- **GIVEN** the user opens the add form from the address book or from a notification's place of origin or consignor picker
- **WHEN** the page is shown
- **THEN** no country is selected
- **AND** the Country select's blank first option reads 'Select a country'

#### Scenario: Add a new address opens the add form, with a Back link to the address book
**ID**: SCN-INS-ADDR-027-C
- **GIVEN** the user is on the address book
- **WHEN** they choose 'Add a new address'
- **THEN** the add form opens, headed 'Add address and contact details' under the caption 'Add new address'
- **WHEN** they select Back
- **THEN** they return to the address book list

### Requirement: The address book is searched from a collapsed 'Filter addresses' disclosure by a field and button labelled 'Search'
**ID**: REQ-INS-ADDR-028
The system MUST hold the address book search in a 'Filter addresses' disclosure, collapsed on load, with a field labelled 'Search' and hinted 'Search by name, address or country', and an icon-only button named 'Search'. The button, or Enter in the field, MUST submit the search and list the matches, with or without JavaScript, and typing alone MUST NOT change the list. While a search is active, the list MUST offer 'Clear search' under the results line, which returns to the whole address book.

#### Scenario: The filter disclosure is collapsed on load and opens and closes
**ID**: SCN-INS-ADDR-028-A
- **GIVEN** the user is viewing the address book
- **WHEN** the page loads
- **THEN** the 'Filter addresses' disclosure is collapsed and the Search field is hidden
- **WHEN** the user opens the disclosure
- **THEN** the Search field is shown
- **WHEN** the user closes the disclosure
- **THEN** the Search field is hidden again
- **AND** this works with JavaScript switched off

#### Scenario: The search field is labelled Search, with a hint and an icon-only button
**ID**: SCN-INS-ADDR-028-B
- **GIVEN** the user has opened the 'Filter addresses' disclosure
- **WHEN** they look at the search controls
- **THEN** the field is labelled 'Search' and described by the hint 'Search by name, address or country'
- **AND** the only button is named 'Search' and shows an icon with no visible text

#### Scenario: Submitting a search lists the matches
**ID**: SCN-INS-ADDR-028-C
- **GIVEN** the address book holds one address that matches the search term
- **WHEN** the user enters the term and presses the Search button, or presses Enter in the field
- **THEN** the list reads 'Showing 1-1 of 1' and shows that address
- **AND** the only links below the filter are 'Clear search' and that address's View link
- **AND** this works with JavaScript switched off

#### Scenario: A search matching nothing shows an empty table
**ID**: SCN-INS-ADDR-028-D
- **GIVEN** no address matches the search term
- **WHEN** the user submits the search
- **THEN** the list reads 'Showing 0 of 0'
- **AND** the table shows the column headers Name, Address, Country and Action with no rows
- **AND** the only link below the filter is 'Clear search'

#### Scenario: Clear search returns to the whole address book
**ID**: SCN-INS-ADDR-028-E
- **GIVEN** the user has searched the address book
- **WHEN** they follow 'Clear search'
- **THEN** the whole address book is listed, with no search applied
- **AND** the Search field is empty

#### Scenario: Text typed and not submitted leaves the list unchanged
**ID**: SCN-INS-ADDR-028-F
- **GIVEN** the user is viewing the address book with the 'Filter addresses' disclosure open
- **WHEN** they type in the Search field and do not submit
- **THEN** the list and its results line stay as they were

### Requirement: The success banner after an add, edit or delete stays until the user leaves or reloads the page
**ID**: REQ-INS-ADDR-029
The system MUST keep the 'Success' banner shown on the address book after an add, edit or delete until the user leaves the page or reloads it, and MUST NOT hide it after a delay.

#### Scenario: The banner is still shown ten seconds later
**ID**: SCN-INS-ADDR-029-A
- **GIVEN** the user has just saved an address and landed on the address book
- **WHEN** ten seconds pass
- **THEN** the 'Success' banner is still shown

#### Scenario: Reloading the list shows no banner
**ID**: SCN-INS-ADDR-029-B
- **GIVEN** the address book is showing the 'Success' banner after a save
- **WHEN** the user reloads the page
- **THEN** no 'Success' banner is shown

### Requirement: A page number out of range shows a real page of addresses
**ID**: REQ-INS-ADDR-030
The system MUST show the first page of the address book when the page number is below 1 or not a number, and MUST show the last page's addresses, not an empty table, when the page number is beyond the last page.

#### Scenario: A page number below 1 or not a number shows the first page
**ID**: SCN-INS-ADDR-030-A
- **GIVEN** an organisation's address book holds more than eight addresses
- **WHEN** the user opens the list with a page number of 0 or 'abc'
- **THEN** the list shows the first page of eight, reading 'Showing 1-8' against the total

#### Scenario: A page number beyond the last page shows the last page
**ID**: SCN-INS-ADDR-030-B
- **GIVEN** an organisation's address book holds 30 addresses
- **WHEN** the user opens the list with a page number of 99
- **THEN** the list reads 'Showing 25-30 of 30' and shows those six addresses
- **AND** the last page is marked as the current page

### Requirement: The address book service serves a requested page size from 1 to 100
**ID**: REQ-INS-ADDR-031
The address book service MUST serve the page size a list request gives when it is from 1 to 100, MUST refuse any other with a 400, and MUST serve 25 addresses a page when the request gives none.

#### Scenario: A requested page size is served
**ID**: SCN-INS-ADDR-031-A
- **GIVEN** an organisation holds 30 addresses
- **WHEN** a list is requested with a page size of 8
- **THEN** the first 8 addresses are returned, with a page size of 8 and 4 pages

#### Scenario: A page size outside 1 to 100 is refused
**ID**: SCN-INS-ADDR-031-B
- **WHEN** a list is requested with a page size of 0, 101 or 'abc'
- **THEN** the service responds with a 400

#### Scenario: No page size gives 25 addresses a page
**ID**: SCN-INS-ADDR-031-C
- **GIVEN** an organisation holds 30 addresses
- **WHEN** a list is requested with no page size
- **THEN** the first 25 addresses are returned, with a page size of 25


### Requirement: A search matches an address by its name, address, town, county, postcode or country
**ID**: REQ-INS-ADDR-032
The system MUST match the trimmed search text, ignoring case and anywhere inside a word, against an address's name, address line 1, address line 2, town or city, county, postcode and country name, and MUST treat a blank search as no search. While a search is active, the results line MUST count the matches, and pagination MUST show only when the matches run past one page of eight.

#### Scenario: A term inside an address line finds that address
**ID**: SCN-INS-ADDR-032-A
- **GIVEN** the address book holds one address whose address line 2 is 'Ballymore Road' and others that do not contain 'Ballymore'
- **WHEN** the user searches for 'ballymore'
- **THEN** the list shows that address and reads 'Showing 1-1 of 1'

#### Scenario: A country name finds the addresses in that country
**ID**: SCN-INS-ADDR-032-B
- **GIVEN** the address book holds an address in France and an address in another country
- **WHEN** the user searches for 'france'
- **THEN** the list shows the address in France and not the other
- **AND** the list reads 'Showing 1-1 of 1'

#### Scenario: A search counts its matches and pages them past eight
**ID**: SCN-INS-ADDR-032-C
- **GIVEN** a search matches two addresses
- **WHEN** the user submits it
- **THEN** the list reads 'Showing 1-2 of 2' and shows no pagination
- **GIVEN** a search matches more than eight addresses
- **WHEN** the user submits it
- **THEN** the list reads 'Showing 1-8' against the number of matches, and pagination is shown
- **WHEN** they move to the next page
- **THEN** the remaining matches are shown, with the search kept

#### Scenario: An address just added is found by its name, its address and its country
**ID**: SCN-INS-ADDR-032-D
- **GIVEN** the user has just added an address in France
- **WHEN** they search for its name, for part of its address line 1, and for 'fran'
- **THEN** each search lists the added address

### Requirement: The add page is headed 'Add address and contact details' under the caption 'Add new address', and shows the notification's status block when reached from a journey
**ID**: REQ-INS-ADDR-033
The system MUST head the add page 'Add address and contact details' under the caption 'Add new address', from the address book or from a notification journey. Reached from a journey's 'Add a new address', it MUST also show the notification's status block above the caption, and keep it when a refused save shows the page again.

#### Scenario: Reached from a journey's role picker, the page is headed with its caption and title
**ID**: SCN-INS-ADDR-033-A
- **GIVEN** a trader on a notification's role picker
- **WHEN** they choose 'Add a new address'
- **THEN** the add page opens, headed 'Add address and contact details' under the caption 'Add new address'

#### Scenario: Reached from a journey, the page shows a Draft tag and the notification's reference
**ID**: SCN-INS-ADDR-033-B
- **GIVEN** a trader on a notification's role picker
- **WHEN** they choose 'Add a new address'
- **THEN** a 'Draft' tag and the notification's reference show above the caption

#### Scenario: A refused save from a journey still shows the status block
**ID**: SCN-INS-ADDR-033-C
- **GIVEN** a trader on the add page reached from a notification journey
- **WHEN** the address book refuses the address they save
- **THEN** the add page shows again with the refusal
- **AND** the 'Draft' tag and the notification's reference still show

#### Scenario: Opened from the address book, the page shows its heading and caption with no status block
**ID**: SCN-INS-ADDR-033-D
- **GIVEN** the user is on the address book
- **WHEN** they choose 'Add a new address'
- **THEN** the add page is headed 'Add address and contact details' under the caption 'Add new address'
- **AND** no status tag shows

### Requirement: The add and edit forms give each personal-data field its browser autocomplete hint
**ID**: REQ-INS-ADDR-034
The system MUST give the name field the autocomplete hint 'organization', the address lines 'address-line1' and 'address-line2', the town or city 'address-level2', the postcode 'postal-code', the email address 'email' and the phone number 'tel', on both the add and the edit form. County and Country MUST carry no hint.

#### Scenario: The add form carries the autocomplete hints
**ID**: SCN-INS-ADDR-034-A
- **GIVEN** the user opens the add form
- **WHEN** the page is shown
- **THEN** the name, address line 1, address line 2, town or city, postcode, email and phone fields carry the hints 'organization', 'address-line1', 'address-line2', 'address-level2', 'postal-code', 'email' and 'tel'
- **AND** County and Country carry none

#### Scenario: The edit form carries the autocomplete hints
**ID**: SCN-INS-ADDR-034-B
- **GIVEN** the user opens the edit form for an address
- **WHEN** the page is shown
- **THEN** the name, address line 1, address line 2, town or city, postcode, email and phone fields carry the hints 'organization', 'address-line1', 'address-line2', 'address-level2', 'postal-code', 'email' and 'tel'

### Requirement: The add page reached from a notification's role picker offers any country for a place of origin or consignor and the United Kingdom alone for a consignee, importer or place of destination
**ID**: REQ-INS-ADDR-035
The system MUST show every address and contact field, with no address search, on the add page reached from a notification's role picker. From the place of origin or consignor picker it MUST offer every served country, opening the Country select on 'Select a country'; the Country field there is a drop-down list. From the consignee, importer or place of destination picker it MUST offer only 'United Kingdom', selected, and MUST save that country whatever country is posted.

#### Scenario: The place of origin and consignor pages offer every country, opening on Select a country
**ID**: SCN-INS-ADDR-035-A
- **GIVEN** a trader on a notification's place of origin or consignor picker
- **WHEN** they choose 'Add a new address'
- **THEN** every address and contact field is shown, with no address search
- **AND** the Country select's first option reads 'Select a country' and no country is selected
- **AND** after 'Select a country' the select offers 'United Kingdom' and every country the reference data service serves, and no other, by their served names, in alphabetical order

#### Scenario: The consignee, importer and place of destination pages offer the United Kingdom alone
**ID**: SCN-INS-ADDR-035-B
- **GIVEN** a trader on a notification's consignee, importer or place of destination picker
- **WHEN** they choose 'Add a new address'
- **THEN** every address and contact field is shown, with no address search
- **AND** the Country select offers only 'United Kingdom'
- **AND** 'United Kingdom' is selected

#### Scenario: A consignee, importer or place of destination address is saved as United Kingdom whatever country is posted
**ID**: SCN-INS-ADDR-035-C
- **GIVEN** a trader on the add page reached from a notification's consignee, importer or place of destination picker
- **WHEN** a save is posted with a country other than the United Kingdom
- **THEN** the address is stored with the country United Kingdom

#### Scenario: A place of origin or consignor address with no country, or one the list does not offer, is refused
**ID**: SCN-INS-ADDR-035-D
- **GIVEN** a trader on the add page reached from a notification's place of origin or consignor picker
- **WHEN** they save with no country chosen, or with a country the list does not offer
- **THEN** 'Select a country' is shown in the summary and against the Country select
- **AND** nothing is saved

#### Scenario: A consignee, importer or place of destination address with the name, postcode and phone blank is refused naming each
**ID**: SCN-INS-ADDR-035-E
- **GIVEN** a trader on the add page reached from a notification's consignee, importer or place of destination picker
- **WHEN** they leave the name, postcode and phone number blank and save
- **THEN** the summary and each field show 'Enter a name or organisation', 'Enter a postcode or Zip code' and 'Enter a phone number'
- **AND** each summary link reaches its field
- **AND** nothing is saved

#### Scenario: A place of origin or consignor address with an over-long postcode or a badly formed email address is refused
**ID**: SCN-INS-ADDR-035-F
- **GIVEN** a trader on the add page reached from a notification's place of origin or consignor picker
- **WHEN** they save with a postcode of more than 12 characters and an email address that is not in the correct format
- **THEN** the summary and the fields show 'Postcode must be 12 characters or fewer' and 'Enter an email address in the correct format'
- **AND** nothing is saved

#### Scenario: The place of origin and consignor pages offer the Country field as a drop-down list
**ID**: SCN-INS-ADDR-035-G
- **GIVEN** a trader on a notification's place of origin or consignor picker
- **WHEN** they choose 'Add a new address'
- **THEN** the Country field is a drop-down list holding its countries as options
- **AND** it is not a type-ahead search

### Requirement: The add page reached from a notification journey returns through the journey to the page each control names
**ID**: REQ-INS-ADDR-036
The system MUST, on the add page reached from a notification's role picker, offer 'Back' to that picker, a primary 'Save and select', a secondary 'Save and return to address page' and a 'Cancel and return to hub' link. From the consignment contact page it MUST offer 'Back', 'Save and continue' and a secondary 'Cancel and return to address page'. Each MUST return the user to the journey, and the address book's own success banner MUST NOT show.

#### Scenario: A role's add page offers Back, Save and select, Save and return to address page and Cancel and return to hub
**ID**: SCN-INS-ADDR-036-A
- **GIVEN** a trader on a notification's role picker
- **WHEN** they choose 'Add a new address'
- **THEN** the add page offers a 'Back' link, a primary 'Save and select' button, a secondary 'Save and return to address page' button after it, and a 'Cancel and return to hub' link

#### Scenario: Save and select hands the new address back to the journey for selection
**ID**: SCN-INS-ADDR-036-B
- **GIVEN** a trader on the add page reached from a notification's role picker
- **WHEN** they save a valid address with 'Save and select'
- **THEN** the journey is handed the new address to select for the role
- **AND** the address book list shows no success banner

#### Scenario: Save and return to address page hands the new address back without selecting it
**ID**: SCN-INS-ADDR-036-C
- **GIVEN** a trader on the add page reached from a notification's role picker
- **WHEN** they save a valid address with 'Save and return to address page'
- **THEN** the journey is handed the new address to list on the role's picker, not to select

#### Scenario: Cancel and return to hub saves nothing
**ID**: SCN-INS-ADDR-036-D
- **GIVEN** a trader on the add page reached from a notification's role picker who has typed an address
- **WHEN** they follow 'Cancel and return to hub'
- **THEN** the journey is handed back to the notification's hub, and the address book holds nothing new

#### Scenario: The consignment contact's add page offers Back, Save and continue and Cancel and return to address page
**ID**: SCN-INS-ADDR-036-E
- **GIVEN** a trader on the consignment contact page
- **WHEN** they choose to add a new address
- **THEN** the add page offers a 'Back' link, a primary 'Save and continue' button and a secondary 'Cancel and return to address page' button
- **WHEN** they save a valid address with 'Save and continue'
- **THEN** the journey is handed the new address to select as the contact address
- **WHEN** they choose 'Cancel and return to address page' instead
- **THEN** the journey is handed back with no address
