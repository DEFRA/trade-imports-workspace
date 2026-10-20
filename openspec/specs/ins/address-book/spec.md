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
- **THEN** the address book list shows the new name, and no longer shows the old one

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
The system MUST ask for name, address line 1, town or city, postcode, country, phone number and email address as mandatory, and address line 2 and county as optional, on both the add and the edit form, and MUST hint that an international phone number should include its country code, and MUST offer in the country field, on both forms, every country the reference data service serves, by its served name, in alphabetical order, with United Kingdom in its alphabetical place.

#### Scenario: The add form asks for every field, marking address line 2 and county optional
**ID**: SCN-INS-ADDR-005-A
- **GIVEN** the user opens the add address form
- **WHEN** the page is shown
- **THEN** every field is asked for, with address line 2 and county labelled optional
- **AND** the country field offers a populated list of countries
- **AND** a hint explains that an international phone number should include its country code

#### Scenario: The country field lists every country alphabetically, United Kingdom in its place
**ID**: SCN-INS-ADDR-005-B
- **GIVEN** the user opens the add or the edit address form
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
The system MUST return the user to the address book list on a successful save, and MUST show a confirmation naming the address and stating whether it was added or updated.

#### Scenario: Adding an address confirms it and lists it
**ID**: SCN-INS-ADDR-009-A
- **GIVEN** the user has filled in a valid new address
- **WHEN** they save it
- **THEN** they return to the address book, a confirmation names the address as added
- **AND** the new address is listed

#### Scenario: Editing an address's name confirms it under its new name
**ID**: SCN-INS-ADDR-009-B
- **GIVEN** the user edits an address, changing its name
- **WHEN** they save it
- **THEN** they return to the address book, a confirmation names the address as updated
- **AND** the address is offered for viewing under its new name, no longer under the old one

### Requirement: Cancelling the add or edit form discards changes and returns to the address book
**ID**: REQ-INS-ADDR-010
The system MUST discard anything entered on the add or edit form when the user cancels, and MUST return them to the address book list without saving. On the add form opened from the address book, cancelling is a 'Cancel and return to address book' link below 'Save and continue'.

#### Scenario: Cancelling add discards the form without creating an address
**ID**: SCN-INS-ADDR-010-A
- **GIVEN** the user has typed into the add address form without saving
- **WHEN** they follow the 'Cancel and return to address book' link below 'Save and continue'
- **THEN** they return to the address book, and nothing they typed appears anywhere in it

#### Scenario: Cancelling edit discards the changes, leaving the stored address as it was
**ID**: SCN-INS-ADDR-010-B
- **GIVEN** the user has changed a field on an existing address without saving
- **WHEN** they cancel
- **THEN** they return to the address book, the change is discarded, and the address is still offered for viewing under its original name

### Requirement: Deleting an address asks for confirmation, summarising the address, before it is removed
**ID**: REQ-INS-ADDR-011
The system MUST ask the user to confirm before deleting an address, on a page headed 'Delete this address?' summarising the address in one 'Address' row, or 'Not applicable' when it has no details. The page warns that the action cannot be undone, offers a red 'Yes, delete' button and a 'No, cancel' link, and MUST leave the address untouched on cancel. A delete landing on the address book (REQ-INS-ADDR-024) says '<Name> address deleted', or 'Address deleted' for a blank name.

#### Scenario: The delete confirmation summarises the address and asks for confirmation
**ID**: SCN-INS-ADDR-011-A
- **GIVEN** the user opens the delete confirmation for an address
- **WHEN** the page is shown
- **THEN** the page is headed 'Delete this address?', shows one 'Address' row holding the name, address lines 1 and 2, town or city, county, postcode and country, one per line, with no email or phone
- **AND** it says 'Confirm that you want to delete this address.' and 'This action cannot be undone.', with a way back to its details

#### Scenario: Following No, cancel leaves the address untouched
**ID**: SCN-INS-ADDR-011-B
- **GIVEN** the user is on an address's delete confirmation
- **WHEN** they follow 'No, cancel' instead of confirming
- **THEN** they return to that address's own details, it is still listed in the address book, and no confirmation banner shows

#### Scenario: Confirming deletion removes the address and confirms it
**ID**: SCN-INS-ADDR-011-C
- **GIVEN** the user is on an address's delete confirmation, opened without a return
- **WHEN** they select 'Yes, delete'
- **THEN** they return to the address book, which says '<Name> address deleted' with the name in sentence case, such as 'Green valley farm address deleted' for 'Green Valley Farm'
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
The system MUST list each address's name, full postal address and country, MUST offer a way to open that address's own details, and MUST offer a way to add a new address, reachable from the service's navigation.

#### Scenario: The list renders each address's details, with columns and an add action
**ID**: SCN-INS-ADDR-012-A
- **GIVEN** the user has addresses in their address book
- **WHEN** they view the address book
- **THEN** each address is listed with its name, full postal address and country
- **AND** an action to add a new address is offered

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

### Requirement: The list is paged once it holds more than one page of addresses
**ID**: REQ-INS-ADDR-013
The system MUST page the address book list once it holds more than twenty-five addresses, showing the range currently displayed against the total.

#### Scenario: More than twenty-five addresses are shown across pages
**ID**: SCN-INS-ADDR-013-A
- **GIVEN** an organisation's address book holds more than twenty-five addresses
- **WHEN** the user views the list
- **THEN** it shows the first twenty-five, reporting the range shown against the total
- **WHEN** they move to the next page
- **THEN** the remaining addresses are shown, with the range and total updated to match

### Requirement: An empty address book invites the user to add the first address
**ID**: REQ-INS-ADDR-014
The system MUST show a message explaining the address book is empty, and MUST offer a way to add an address, when an organisation has none.

#### Scenario: No addresses shows an empty-state message and an add action
**ID**: SCN-INS-ADDR-014-A
- **GIVEN** an organisation has no addresses
- **WHEN** the user views the address book
- **THEN** a message explains there are no addresses yet, and an action to add one is offered

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
The system MUST tell the user 'Enter a name or organisation name', 'Enter a postcode or Zip code', 'Select a country' (also when the country is not one offered) or 'Enter a phone number' when that field is missing, in the 'There is a problem' summary and against the field, on the add and the edit form. The address book MUST refuse a create or update missing any of them with the same message, keyed by that field.

#### Scenario: Leaving name, postcode, country and phone blank on add names each in the form's words
**ID**: SCN-INS-ADDR-018-A
- **GIVEN** the user is adding an address
- **WHEN** they leave the name, postcode, country and phone number blank and save
- **THEN** the summary and each field show 'Enter a name or organisation name', 'Enter a postcode or Zip code', 'Select a country' and 'Enter a phone number'

#### Scenario: Clearing name, postcode, country and phone on edit shows the same messages, and nothing is saved
**ID**: SCN-INS-ADDR-018-B
- **GIVEN** the user is editing an address
- **WHEN** they clear the name, postcode, country and phone number and save
- **THEN** the summary and each field show the same four messages
- **AND** the stored address is unchanged

#### Scenario: A country that is not offered is refused as if none were chosen
**ID**: SCN-INS-ADDR-018-C
- **GIVEN** the user is adding an address
- **WHEN** the form is saved with a country that is not one the list offers
- **THEN** the save is blocked and 'Select a country' is shown

#### Scenario: The address book refuses a missing name, postcode, country or phone with the same messages
**ID**: SCN-INS-ADDR-018-D
- **GIVEN** a service creates an address with the name, postcode, country and phone number blank
- **WHEN** the request is made
- **THEN** it is refused with a validation error giving 'Enter a name or organisation name', 'Enter a postcode or Zip code', 'Select a country' and 'Enter a phone number' against those fields
- **AND** no address is created

### Requirement: The address form groups its fields under 'Address' and 'Contact details'
**ID**: REQ-INS-ADDR-021
The system MUST group the address fields under 'Address' and Email address and Phone number under 'Contact details' on the add and edit forms. It MUST label the add form's name 'Name or organisation' (the edit form keeps 'Name or organisation name') and keep 'County (optional)' on the add form between 'Town or city' and 'Postcode or Zip code'. It MUST open the add form's Country select on its blank first option, reading 'Select one', with no country chosen. 'Add a new address' on the address book MUST open the add form directly, with a 'Back' link to the address book. The add form MUST show the name, both address lines and the email address at full width, 'Town or city' and 'Postcode or Zip code' at half width, and the phone number at two-thirds width.

#### Scenario: The add and edit forms group their fields under Address and Contact details
**ID**: SCN-INS-ADDR-021-A
- **GIVEN** the user opens the add form or the edit form
- **WHEN** the page is shown
- **THEN** the address fields sit under 'Address', and Email address and Phone number under 'Contact details'

#### Scenario: The add form names the name field 'Name or organisation' and keeps County
**ID**: SCN-INS-ADDR-021-B
- **GIVEN** the user opens the add form
- **WHEN** the page is shown
- **THEN** the fields read 'Name or organisation', 'Address line 1', 'Address line 2 (optional)', 'Town or city', 'County (optional)' and 'Postcode or Zip code', in that order
- **AND** the edit form still labels the name 'Name or organisation name'

#### Scenario: The add form opens the Country select on Select one
**ID**: SCN-INS-ADDR-021-C
- **GIVEN** the user opens the add form
- **WHEN** the page is shown
- **THEN** no country is selected
- **AND** the Country select's blank first option reads 'Select one'

#### Scenario: Add a new address opens the add form, with a Back link to the address book
**ID**: SCN-INS-ADDR-021-D
- **GIVEN** the user is on the address book
- **WHEN** they choose 'Add a new address'
- **THEN** the add form opens, headed 'Add address details'
- **WHEN** they select Back
- **THEN** they return to the address book list

#### Scenario: The add form sizes its fields to the answers they take
**ID**: SCN-INS-ADDR-021-E
- **GIVEN** the user opens the add form
- **WHEN** the page is shown
- **THEN** the name, both address lines and the email address are full width
- **AND** 'Town or city' and 'Postcode or Zip code' are half width
- **AND** the phone number is two-thirds width

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
The system MUST honour a return named when the view or delete page is opened, to a page of this service or, outside stub mode, to exactly that environment's animals frontend, and MUST ignore any other. The view page's Back MUST go to it and Edit and Delete MUST carry it on. The delete page's Back and 'No, cancel' MUST go to the view page still carrying it; 'Yes, delete' MUST land on it, or on the list when it is one of the deleted address's own pages. A dead link MUST land on it, or on the list when it is one of that address's own pages.

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
