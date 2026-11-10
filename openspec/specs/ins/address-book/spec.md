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
The system MUST replace an address's entire record on edit, so an optional field left blank in the edit is cleared, not left holding its previous value, and MUST show the edited address under its new name in the list, in place of the old one. The edit page MUST offer no address type or roles, and an edit MUST keep every role the address was saved with.

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

#### Scenario: An edit keeps every role
**ID**: SCN-INS-ADDR-003-C
- **GIVEN** an address saved with the roles place of origin and consignor
- **WHEN** the user opens its edit page
- **THEN** the page asks only for the address and contact fields, with no address type and no roles
- **WHEN** they change a field and save
- **THEN** the stored address still has the roles place of origin and consignor

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
The system MUST ask for name, address line 1, town or city, postcode, country, phone number and email address as mandatory, and address line 2 and county as optional, on both the add and the edit form, MUST hint that an international phone number should include its country code, and MUST offer every country the reference data service serves in the country field, by its served name, in alphabetical order, with United Kingdom in its alphabetical place.

#### Scenario: The add form asks for every field, marking address line 2 and county optional
**ID**: SCN-INS-ADDR-005-A
- **GIVEN** the user opens the add address form
- **WHEN** the page is shown
- **THEN** every field is asked for, with address line 2 and county labelled optional
- **AND** the country field offers a populated list of countries
- **AND** a hint explains that an international phone number should include its country code

#### Scenario: The country field lists every country alphabetically, United Kingdom in its place
**ID**: SCN-INS-ADDR-005-B
- **GIVEN** the user opens the address book's add form after choosing 'Origin or Consignor', 'Destination, Consignee or Importer' or 'Branch', the address book's edit form, or the add form reached from any of a notification's role pickers or its consignment contact page
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

#### Scenario: Several mandatory fields left blank are listed in the order the form asks them
**ID**: SCN-INS-ADDR-006-C
- **GIVEN** the user is adding or editing an address
- **WHEN** they leave the address line 1, town or city, postcode, email address and phone number blank and save
- **THEN** the error summary lists 'Enter address line 1', 'Enter a town or city', 'Enter a postcode or Zip code', 'Enter an email address' and 'Enter a phone number', in that order, which is the order the form asks for them

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
The system MUST return the user to the address book list on a successful save from the add form opened from the address book, on the tab of the address's type, or from the edit form, and MUST show a confirmation naming the address as it is stored and stating whether it was added or updated. An add's confirmation reads '<Name> address added to your address book', and the new address MUST be listed first, with a way to view it. An edit's confirmation reads '<Name> address updated'.

#### Scenario: Adding an address confirms it and lists it first
**ID**: SCN-INS-ADDR-009-A
- **GIVEN** the user has filled in a valid new address on the add form opened from the address book after choosing 'Origin or Consignor', and ticked a role
- **WHEN** they save it
- **THEN** they return to the address book on the 'Origin and Consignor' tab, and a 'Success' confirmation reads '<name> address added to your address book'
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
The system MUST head the list 'Address book' with an intro, then a way to add an address, then the filter (REQ-INS-ADDR-028) and the address type tabs (REQ-INS-ADDR-038). It MUST list each address's name, roles, postal address lines and country, newest first, with a way to open it, and be reachable from the service's navigation. When the address book cannot be loaded, it MUST respond with a server error, keep the heading, intro, add action and filter, and show no results line and no table.

#### Scenario: The list renders each address's details, with columns and an add action
**ID**: SCN-INS-ADDR-012-A
- **GIVEN** the user has addresses in their address book
- **WHEN** they view the address book
- **THEN** the intro reads 'Manage your addresses for use across all your import notifications'
- **AND** an action to add a new address is offered directly under the intro
- **AND** each address is listed with its name, type, address and country under the columns Name, Type, Address, Country and Action, the Type naming the address's roles

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
- **AND** the table shows the column headers Name, Type, Address, Country and Action with no rows
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
The system MUST refuse the add-address page when the request carries a journey handshake whose journey type is not one the service knows, and MUST show a page-not-found response rather than the form. A handshake the add page holds from an earlier request that no longer resolves to a journey party MUST be discarded, so the page works as an address book add, and an incomplete handshake MUST be refused. Each is logged once at warn with its journey type, notification and party.

#### Scenario: An unrecognised journey type is refused
**ID**: SCN-INS-ADDR-016-A
- **GIVEN** the user opens the add-address page with a handshake naming a journey type the service does not know
- **WHEN** the page is shown
- **THEN** they see a page-not-found response, not the add form

#### Scenario: A held handshake that no longer resolves is discarded
**ID**: SCN-INS-ADDR-016-B
- **GIVEN** the add page holds a handshake from an earlier request whose journey type is no longer registered, or whose party is not one the journey lists
- **WHEN** the add page is used again
- **THEN** the handshake is discarded and the page works as an address book add
- **AND** the discard is logged once at warn with the journey type, notification and party

#### Scenario: An incomplete handshake is refused
**ID**: SCN-INS-ADDR-016-C
- **GIVEN** the add form is posted with a journey type but no notification or party
- **WHEN** it is saved
- **THEN** the request is refused as a bad request and nothing is saved
- **AND** the refusal is logged once at warn with the journey type, notification and party it carried

### Requirement: A missing name, postcode, country or phone number is named in the words the form uses for it
**ID**: REQ-INS-ADDR-018
The system MUST tell the user 'Enter a name or organisation', 'Enter a postcode or Zip code', 'Select a country' (also when the country is not one offered) or 'Enter a phone number' when that field is missing, in the 'There is a problem' summary and against the field, on the edit form and on every add form. The address book MUST refuse a create or update missing any of them with the same message, keyed by that field.

#### Scenario: Leaving name, postcode, country and phone blank on add names each in the form's words
**ID**: SCN-INS-ADDR-018-A
- **GIVEN** the user is adding an address on the address book's add form after choosing any address type, or on the add form reached from a notification's place of origin or consignor picker or its consignment contact page
- **WHEN** they leave the name, postcode and phone number blank, with no country chosen (clearing the United Kingdom the address book's add form opens with), and save
- **THEN** the summary and each field show 'Enter a name or organisation', 'Enter a postcode or Zip code', 'Select a country' and 'Enter a phone number'

#### Scenario: Clearing name, postcode and phone on edit with no country chosen shows the same messages, and nothing is saved
**ID**: SCN-INS-ADDR-018-B
- **GIVEN** the user is editing an address whose stored country is not one the list offers
- **WHEN** they clear the name, postcode and phone number and save with no country chosen
- **THEN** the summary and each field show the same four messages
- **AND** the stored address is unchanged

#### Scenario: A country that is not offered is refused as if none were chosen
**ID**: SCN-INS-ADDR-018-C
- **GIVEN** the user is adding an address on the address book's add form after choosing 'Origin or Consignor', editing an address on the edit form, or adding one from a notification's place of origin or consignor picker or its consignment contact page
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
The system MUST honour a return given when the view or delete page is opened, if it is a page of this service or, outside stub mode, exactly that environment's animals frontend, and MUST ignore any other. A return that is a path under '/live-animals' MUST be taken as that page on the animals frontend, resolved against that environment's animals frontend URL, never as a page of this service. The view page's Back MUST go to it, and Edit and Delete MUST carry it on. The delete page's Back and 'No, cancel' MUST go to the view page still carrying it. 'Yes, delete' and a dead link MUST land on it, or on the list when it is one of that address's own pages.

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
- **WHEN** an address is opened with a return on the animals frontend, as a URL or as a '/live-animals' path
- **THEN** Back goes to the address book list

#### Scenario: A dead link carrying an honoured return lands on it
**ID**: SCN-INS-ADDR-024-I
- **GIVEN** a view or delete link for an address that is not live in the book carries an honoured return that is not one of that address's own pages
- **WHEN** it is opened
- **THEN** the return page opens, not the address book and not a 'Page not found' page

#### Scenario: A return given as a live-animals path opens that page on the animals frontend
**ID**: SCN-INS-ADDR-024-J
- **GIVEN** an address opened from a live-animals party picker with a return that is the picker's own '/live-animals' path, carrying its search
- **WHEN** they select Back
- **THEN** that picker opens on the animals frontend, with the search kept

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

### Requirement: The add form names its first field 'Name or organisation' and opens its Country select on 'Select a country' first, with United Kingdom selected from the address book and from the consignee, importer and place of destination pickers, and no country chosen from the place of origin and consignor pickers and the consignment contact page
**ID**: REQ-INS-ADDR-027
The system MUST label the add form's name 'Name or organisation', keep 'County (optional)' on it, and open its Country select on a blank first option reading 'Select a country', selecting United Kingdom from the address book whatever type is chosen and from a notification's consignee, importer or place of destination picker, and none from its place of origin or consignor picker or its consignment contact page.

#### Scenario: The add form names the name field 'Name or organisation' and keeps County
**ID**: SCN-INS-ADDR-027-A
- **GIVEN** the user opens the add form
- **WHEN** the page is shown
- **THEN** the fields read 'Name or organisation', 'Address line 1', 'Address line 2 (optional)', 'Town or city', 'County (optional)' and 'Postcode or Zip code', in that order
- **AND** the edit form labels the name 'Name or organisation' too

#### Scenario: The add form opened from the address book selects United Kingdom
**ID**: SCN-INS-ADDR-027-B
- **GIVEN** the user opens the add form from the address book after choosing 'Origin or Consignor', 'Destination, Consignee or Importer' or 'Branch'
- **WHEN** the page is shown
- **THEN** United Kingdom is selected
- **AND** the Country select's blank first option reads 'Select a country'

#### Scenario: The add form opened from the place of origin or consignor picker or the consignment contact page selects no country
**ID**: SCN-INS-ADDR-027-D
- **GIVEN** the user opens the add form from a notification's place of origin or consignor picker or its consignment contact page
- **WHEN** the page is shown
- **THEN** no country is selected
- **AND** the Country select's blank first option reads 'Select a country'

### Requirement: The address book is searched from a collapsed 'Filter addresses' disclosure by a field and button labelled 'Search'
**ID**: REQ-INS-ADDR-028
The system MUST hold the address book search in a 'Filter addresses' disclosure, collapsed on load, with a field labelled 'Search' hinted 'Search by name, address or country', an icon-only button named 'Search' and the 'Type' select (REQ-INS-ADDR-041). The button, or Enter in the field, MUST submit the search and the Type together, with or without JavaScript, and typing alone MUST NOT change the list. While a search is active, the list MUST offer 'Clear search' under the results line.

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
- **AND** the only links below the tabs are 'Clear search' and that address's View link
- **AND** this works with JavaScript switched off

#### Scenario: A search matching nothing shows an empty table
**ID**: SCN-INS-ADDR-028-D
- **GIVEN** no address matches the search term
- **WHEN** the user submits the search
- **THEN** the list reads 'Showing 0 of 0'
- **AND** the table shows the column headers Name, Type, Address, Country and Action with no rows
- **AND** the only link below the tabs is 'Clear search'

#### Scenario: Clear search returns to the selected tab's list with no search
**ID**: SCN-INS-ADDR-028-E
- **GIVEN** the user has searched a tab of the address book
- **WHEN** they follow 'Clear search'
- **THEN** the list of that tab is shown, with no search applied and any Type the user had chosen still applied
- **AND** the Search field is empty

#### Scenario: Text typed and not submitted leaves the list unchanged
**ID**: SCN-INS-ADDR-028-F
- **GIVEN** the user is viewing the address book with the 'Filter addresses' disclosure open
- **WHEN** they type in the Search field and do not submit
- **THEN** the list and its results line stay as they were

#### Scenario: The same search field matches a transporter by its name, address, type, country or approval number
**ID**: SCN-INS-ADDR-028-G
- **GIVEN** the user is on the Transporter tab
- **WHEN** they search by a transporter's name, its address, its type, its country, or its approval number where it has one
- **THEN** only the matching transporters are shown
- **AND** the not-applicable word shown for a transporter with no approval number is never itself matched

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


### Requirement: A search matches an address by its name, address, town, county, postcode, country or the labels of its roles
**ID**: REQ-INS-ADDR-032
The system MUST match the trimmed search text, ignoring case and anywhere inside a word, against an address's name, address line 1, address line 2, town or city, county, postcode and country name, and against the labels of its roles as the Type column and the Type filter show them, and MUST treat a blank search as no search. While a search is active, the results line MUST count the matches, and pagination MUST show only when the matches run past one page of eight.

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

#### Scenario: A role label finds an address holding that role
**ID**: SCN-INS-ADDR-032-E
- **GIVEN** the address book holds an address with the place of origin and consignor roles whose name and address do not contain the word 'consignor'
- **WHEN** the user searches for 'consignor'
- **THEN** the list shows that address, with 'Place of origin, Consignor' as its Type

#### Scenario: An address just added with a role is found by that role's label
**ID**: SCN-INS-ADDR-032-F
- **GIVEN** the user has just added an address with the consignor role ticked, whose name and address do not contain the word 'consignor'
- **WHEN** they search for 'Consignor'
- **THEN** the list shows the added address

#### Scenario: A role label the Type filter shows finds an address whose Type column reads otherwise
**ID**: SCN-INS-ADDR-032-G
- **GIVEN** the address book holds an address with the branch address role whose name and address do not contain the word 'branch'
- **WHEN** the user searches the Branch tab for 'branch address'
- **THEN** the list shows that address, with 'Branch' as its Type

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
- **WHEN** they choose 'Add a new address' and then an address type
- **THEN** the add page is headed 'Add address and contact details' under the caption 'Add new address'
- **AND** no status tag shows

### Requirement: The add and edit forms give each personal-data field its browser autocomplete hint
**ID**: REQ-INS-ADDR-034
The system MUST give the address lines the autocomplete hints 'address-line1' and 'address-line2', the town or city 'address-level2', the postcode 'postal-code', the email address 'email' and the phone number 'tel', on both the add and the edit form. The name field, which holds a person's or an organisation's name, County and Country MUST carry no hint.

#### Scenario: The add form carries the autocomplete hints
**ID**: SCN-INS-ADDR-034-A
- **GIVEN** the user opens the add form
- **WHEN** the page is shown
- **THEN** the address line 1, address line 2, town or city, postcode, email and phone fields carry the hints 'address-line1', 'address-line2', 'address-level2', 'postal-code', 'email' and 'tel'
- **AND** the name, County and Country fields carry none

#### Scenario: The edit form carries the autocomplete hints
**ID**: SCN-INS-ADDR-034-B
- **GIVEN** the user opens the edit form for an address
- **WHEN** the page is shown
- **THEN** the address line 1, address line 2, town or city, postcode, email and phone fields carry the hints 'address-line1', 'address-line2', 'address-level2', 'postal-code', 'email' and 'tel'
- **AND** the name, County and Country fields carry none

### Requirement: The add page reached from a notification's role picker offers every country, opening on 'Select a country' for a place of origin or consignor and on United Kingdom for a consignee, importer or place of destination
**ID**: REQ-INS-ADDR-035
The system MUST show every address and contact field, with no address search, on the add page reached from a notification's role picker, and MUST offer every served country there in a drop-down list, saving the country chosen. From the place of origin or consignor picker it MUST open the Country select on 'Select a country'; from the consignee, importer or place of destination picker it MUST open it on 'United Kingdom'.

#### Scenario: The place of origin and consignor pages offer every country, opening on Select a country
**ID**: SCN-INS-ADDR-035-A
- **GIVEN** a trader on a notification's place of origin or consignor picker
- **WHEN** they choose 'Add a new address'
- **THEN** every address and contact field is shown, with no address search
- **AND** the Country select's first option reads 'Select a country' and no country is selected
- **AND** after 'Select a country' the select offers 'United Kingdom' and every country the reference data service serves, and no other, by their served names, in alphabetical order

#### Scenario: The consignee, importer and place of destination pages offer every country, opening on United Kingdom
**ID**: SCN-INS-ADDR-035-B
- **GIVEN** a trader on a notification's consignee, importer or place of destination picker
- **WHEN** they choose 'Add a new address'
- **THEN** every address and contact field is shown, with no address search
- **AND** the Country select's first option reads 'Select a country' and 'United Kingdom' is selected
- **AND** after 'Select a country' the select offers 'United Kingdom' and every country the reference data service serves, and no other, by their served names, in alphabetical order

#### Scenario: A consignee, importer or place of destination address is saved with the country chosen
**ID**: SCN-INS-ADDR-035-C
- **GIVEN** a trader on the add page reached from a notification's consignee, importer or place of destination picker
- **WHEN** they choose France and save a valid address
- **THEN** the address is stored with the country France

#### Scenario: An address from any role picker with no country, or one the list does not offer, is refused
**ID**: SCN-INS-ADDR-035-D
- **GIVEN** a trader on the add page reached from any of a notification's role pickers
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

#### Scenario: Save and return to address page makes the same checks as Save and select
**ID**: SCN-INS-ADDR-036-F
- **GIVEN** a trader on the add page reached from the consignee picker who has entered a name, ticked 'Importer' and left the address line 1, town or city, postcode, email address and phone number blank
- **WHEN** they choose 'Save and return to address page'
- **THEN** they stay on the add page and the error summary lists 'Enter address line 1', 'Enter a town or city', 'Enter a postcode or Zip code', 'Enter an email address' and 'Enter a phone number', in that order, each also shown on its field
- **AND** the name entered and 'Importer' are still shown, and the address book holds nothing new

### Requirement: The address book service records an address's roles in any country and refuses missing roles, unknown roles and roles from more than one group
**ID**: REQ-INS-ADDR-037
The address book service MUST record an address's roles, in the order given with repeats dropped, and an update MUST replace them with those given. A create or update MUST give at least one of the six roles, and an address holding any of them MAY be in any country. It MUST refuse, naming the roles, saving nothing: missing or unknown roles; or roles spanning more than one group. It MUST record no address type, and its contract MUST mark roles required.

#### Scenario: An address created with roles reads back with the same roles
**ID**: SCN-INS-ADDR-037-A
- **GIVEN** an address in the United Kingdom is created with the roles importer and place of destination
- **WHEN** the address is read by its id
- **THEN** it has the roles importer and place of destination, in that order

#### Scenario: An update with a different set of roles replaces them
**ID**: SCN-INS-ADDR-037-B
- **GIVEN** an address saved with the role consignee
- **WHEN** it is updated with the roles importer and consignee
- **THEN** the update response and a later read both show exactly the roles importer and consignee

#### Scenario: A create or update carrying a role outside the six is refused naming the roles
**ID**: SCN-INS-ADDR-037-C
- **WHEN** an address is created with a role that is not one of the six
- **THEN** the service responds with a 400 validation error that names the roles, and no address is saved
- **WHEN** a saved address is updated with a role that is not one of the six
- **THEN** the service responds with a 400 validation error that names the roles, and the address keeps its original roles

#### Scenario: An update that omits the roles is refused and the address keeps them
**ID**: SCN-INS-ADDR-037-E
- **GIVEN** an address saved with roles
- **WHEN** it is updated with none
- **THEN** the service responds with a 400 validation error that names the roles
- **AND** a later read shows the address with its original roles

#### Scenario: A create without roles or with an empty list of roles is refused naming the roles
**ID**: SCN-INS-ADDR-037-F
- **WHEN** an address is created with no roles, or with an empty list of roles
- **THEN** the service responds with a 400 validation error that names the roles, and no address is saved

#### Scenario: The published contract marks the roles required
**ID**: SCN-INS-ADDR-037-G
- **WHEN** the service's published contract is read
- **THEN** it lists the roles among the properties a create or update requires, with at least one role

#### Scenario: Roles from more than one group are refused naming the roles
**ID**: SCN-INS-ADDR-037-H
- **WHEN** an address is created with the roles place of origin and consignee
- **THEN** the service responds with a 400 validation error that names the roles, and no address is saved
- **WHEN** an address holding the role importer is updated with the roles importer and branch address
- **THEN** the service responds with a 400 validation error that names the roles, and the address keeps the role importer

#### Scenario: An address holding sending, receiving or branch roles is saved outside the United Kingdom
**ID**: SCN-INS-ADDR-037-I
- **WHEN** an address in France is created with the roles place of origin and consignor
- **THEN** it is saved, and reads back in France with those roles
- **WHEN** an address in France is created with the roles consignee, importer and place of destination
- **THEN** it is saved, and reads back in France with those roles
- **WHEN** an address in France is created with the role branch address
- **THEN** it is saved, and reads back in France with that role
- **WHEN** an address holding the role importer is updated to Ireland
- **THEN** the update is saved, and the address reads back in Ireland

#### Scenario: An address type a request carries is not recorded
**ID**: SCN-INS-ADDR-037-J
- **WHEN** an address is created with roles and an address type
- **THEN** it is saved, and reads back with its roles and no address type

### Requirement: The address book list is split into four tabs, each a link that loads the list on that tab
**ID**: REQ-INS-ADDR-038
The system MUST split the address book list into four tabs, 'Origin and Consignor', 'Destination, Consignee and Importer', 'Transporter' and 'Branch', in that order, each a link that loads the list on that tab with or without JavaScript, the selected one marked and its panel headed with its name. No tab, or an unknown one, MUST show Origin and Consignor. A search and its pages MUST stay on the selected tab. A tab link MUST open page 1, keeping the search and dropping the Type.

#### Scenario: The four tabs are shown in order with the selected one marked
**ID**: SCN-INS-ADDR-038-A
- **GIVEN** the user is signed in
- **WHEN** they view the address book
- **THEN** the tabs 'Origin and Consignor', 'Destination, Consignee and Importer', 'Transporter' and 'Branch' are shown in that order
- **AND** the selected tab is marked

#### Scenario: Each tab's panel is headed for its address type
**ID**: SCN-INS-ADDR-038-B
- **GIVEN** the user is viewing the address book
- **WHEN** they open each tab in turn
- **THEN** the panel is headed 'Origin and Consignor addresses', 'Destination, Consignee and Importer addresses', 'Transporter addresses' and 'Branch addresses' respectively

#### Scenario: No tab or an unknown tab shows Origin and Consignor
**ID**: SCN-INS-ADDR-038-C
- **WHEN** the user opens the address book with no tab chosen
- **THEN** the 'Origin and Consignor' tab is selected
- **WHEN** they open it with a tab that is not one of the four
- **THEN** the 'Origin and Consignor' tab is selected

#### Scenario: Following a tab with JavaScript off loads that tab
**ID**: SCN-INS-ADDR-038-D
- **GIVEN** JavaScript is switched off
- **WHEN** the user follows the 'Branch' tab
- **THEN** the 'Branch' tab is loaded and marked as selected, with its addresses listed

#### Scenario: A search on a tab lists only that tab's matches and its pages keep the tab and the search
**ID**: SCN-INS-ADDR-038-E
- **GIVEN** the user is on a tab and the address book holds matches for a search term on that tab and on another
- **WHEN** they submit the search
- **THEN** the same tab stays selected and only that tab's matches are listed
- **AND** the links to the pages of the list keep the tab and the search

#### Scenario: Following a tab after a search and a Type keeps the search and drops the Type
**ID**: SCN-INS-ADDR-038-F
- **GIVEN** the user has searched the 'Destination, Consignee and Importer' tab and chosen 'Importer' as its Type
- **WHEN** they follow the 'Origin and Consignor' tab
- **THEN** page 1 of that tab is shown with the search kept in the Search field and 'Select one' chosen as the Type
- **AND** the list is that tab's matches for the search

### Requirement: Each role-backed tab lists the addresses holding one of its roles, with their roles in the Type column; the Transporter tab lists the organisation's transporters
**ID**: REQ-INS-ADDR-039
The system MUST list on the selected tab the addresses the address book service returns for that tab's roles (REQ-INS-ADDR-040): place of origin and consignor on 'Origin and Consignor', consignee, importer and place of destination on 'Destination, Consignee and Importer', and branch address on 'Branch'. The Type column MUST show an address's roles by their labels, joined by a comma and a space. The Transporter tab instead lists the organisation's transporters, under their own columns.

#### Scenario: Each tab lists the addresses holding its roles
**ID**: SCN-INS-ADDR-039-A
- **GIVEN** the address book holds an address with the roles consignee and place of destination, and another with the role branch address
- **WHEN** the user opens the 'Destination, Consignee and Importer' tab
- **THEN** the first address is listed and the second is not
- **WHEN** they open the 'Branch' tab
- **THEN** the second address is listed and the first is not
- **AND** the 'Origin and Consignor' tab lists neither

#### Scenario: The Type column names the address's roles and the columns are the same on every role-backed tab
**ID**: SCN-INS-ADDR-039-C
- **GIVEN** the address book holds an address with the roles place of origin and consignor
- **WHEN** the user views the tab that lists it
- **THEN** its Type reads 'Place of origin, Consignor'
- **AND** the columns are Name, Type, Address, Country and Action, with the Action heading visually hidden

#### Scenario: Each role has its own label
**ID**: SCN-INS-ADDR-039-D
- **GIVEN** the address book holds an address with each of the six roles alone
- **WHEN** the user views the tabs that list them
- **THEN** the Types read 'Place of origin', 'Consignor', 'Consignee', 'Importer', 'Place of destination' and 'Branch'

#### Scenario: The Transporter tab's columns show a commercial transporter's approval number and the not-applicable word on a private one
**ID**: SCN-INS-ADDR-039-E
- **GIVEN** the organisation has added a commercial transporter with an approval number and a private transporter
- **WHEN** the user views the 'Transporter' tab
- **THEN** the columns are Name, Address, Approval number and Type, with the Action heading visually hidden
- **AND** the commercial transporter's Approval number cell shows its stored number
- **AND** the private transporter's Approval number cell reads 'Not applicable'
- **AND** each transporter's Address cell ends with its country

### Requirement: The address book service lists the addresses holding any of the roles asked for
**ID**: REQ-INS-ADDR-040
The address book service MUST, asked for one or more roles, return only the caller's organisation's live addresses holding any of them, combined with the search and country filters, and page and count over those addresses alone. An address with no roles MUST NOT be returned for any role. With no role it MUST list every live address, and it MUST refuse a role outside the six with a 400 bad request.

#### Scenario: Roles return exactly the addresses holding any of them
**ID**: SCN-INS-ADDR-040-A
- **GIVEN** an organisation holds an address with the roles place of origin and consignor, one with consignor, one with importer, one with branch address and one with no roles
- **WHEN** the list is asked for place of origin and consignor
- **THEN** the first two addresses are returned
- **AND** asked for consignor alone, the same two addresses are returned
- **AND** asked for consignee, importer and place of destination, the importer address alone is returned
- **AND** asked for branch address, the branch address alone is returned
- **AND** the address with no roles is not returned for any of them

#### Scenario: Roles narrow a search
**ID**: SCN-INS-ADDR-040-B
- **GIVEN** an organisation holds addresses with several roles that match a search term
- **WHEN** the list is asked for some of those roles with that term
- **THEN** only the matching addresses holding any of them are returned
- **AND** the total and pages count only those addresses

#### Scenario: An unknown role is refused
**ID**: SCN-INS-ADDR-040-C
- **WHEN** the list is asked for a role that is not one of the six
- **THEN** the service responds with a 400 error

#### Scenario: Every live address is listed when no role is asked for
**ID**: SCN-INS-ADDR-040-D
- **GIVEN** an organisation holds live addresses with several roles
- **WHEN** the list is asked for no role
- **THEN** every live address is returned

### Requirement: The address book list filters the selected tab by a Type chosen in the 'Filter addresses' disclosure, each tab offering its own Type options
**ID**: REQ-INS-ADDR-041
The system MUST hold in the 'Filter addresses' disclosure a 'Type' select offering 'Select one' and then the selected tab's own options: a role-backed tab's roles, or, on the Transporter tab, 'Commercial' and 'Private'. Submitting a Type MUST list only that tab's addresses or transporters holding it, across all pages, with or without JavaScript, and MUST NOT change the list until submitted. The results line and pagination MUST count and page the matches, keeping the tab, the search and the Type.

#### Scenario: Each role-backed tab offers Select one and then its own Types, and the Transporter tab offers Commercial and Private
**ID**: SCN-INS-ADDR-041-A
- **GIVEN** the user is viewing the address book
- **WHEN** they look at the Type select on each tab in turn
- **THEN** 'Origin and Consignor' offers 'Select one', 'Place of Origin' and 'Consignor'
- **AND** 'Destination, Consignee and Importer' offers 'Select one', 'Consignee', 'Importer' and 'Place of Destination'
- **AND** 'Branch' offers 'Select one' and 'Branch Address'
- **AND** the 'Transporter' tab offers 'Select one', 'Commercial' and 'Private', in that order

#### Scenario: A submitted Type lists only the tab's addresses holding it
**ID**: SCN-INS-ADDR-041-B
- **GIVEN** the 'Origin and Consignor' tab holds one address with the consignor role and one without it
- **WHEN** the user chooses 'Consignor' and presses the Search button, or presses Enter in the Search field
- **THEN** only the address with the consignor role is listed and the list reads 'Showing 1-1 of 1'
- **AND** no pagination is shown
- **AND** the 'Origin and Consignor' tab is still selected and 'Consignor' is chosen as the Type

#### Scenario: Matches past one page are counted and paged, and the pages keep the tab, the search and the Type
**ID**: SCN-INS-ADDR-041-C
- **GIVEN** nine addresses on the 'Origin and Consignor' tab match a search and hold the consignor role
- **WHEN** the user submits the search with 'Consignor' chosen
- **THEN** the list reads 'Showing 1-8 of 9' and pagination is shown
- **AND** the link to the next page keeps the tab, the search and the Type
- **WHEN** they move to the next page
- **THEN** the list reads 'Showing 9-9 of 9' and 'Consignor' is still chosen as the Type

#### Scenario: Choosing a Type without submitting leaves the list as it was
**ID**: SCN-INS-ADDR-041-D
- **GIVEN** the user is viewing a tab with the 'Filter addresses' disclosure open
- **WHEN** they choose a Type and do not submit
- **THEN** the list and its results line stay as they were

#### Scenario: A Type works with JavaScript off
**ID**: SCN-INS-ADDR-041-E
- **GIVEN** JavaScript is switched off
- **WHEN** the user chooses a Type and presses the Search button
- **THEN** the list shows the same addresses and results line as with JavaScript on

#### Scenario: A Type finds the addresses holding it beyond the first page of the tab
**ID**: SCN-INS-ADDR-041-F
- **GIVEN** the 'Origin and Consignor' tab runs past one page, and two of its addresses with the consignor role lie beyond the first page
- **WHEN** the user submits a search that matches them with 'Consignor' chosen
- **THEN** both addresses are listed and the list reads 'Showing 1-2 of 2'
- **AND** no pagination is shown

#### Scenario: A Type on the Transporter tab lists only that type's transporters, counted across the whole category
**ID**: SCN-INS-ADDR-041-G
- **GIVEN** the 'Transporter' tab runs past one page, and two commercial transporters matching a search lie beyond the first page among private ones that also match
- **WHEN** the user submits the search with 'Commercial' chosen
- **THEN** only the two commercial transporters are listed and the list reads 'Showing 1-2 of 2'
- **AND** no pagination is shown

### Requirement: The address book service matches a search against search roles
**ID**: REQ-INS-ADDR-042
The address book service MUST, given search roles, return the caller's organisation's live addresses holding any of them as well as the addresses the search text and country codes match, kept within any roles asked for (REQ-INS-ADDR-040). It MUST refuse a search role outside the six with a 400 bad request.

#### Scenario: A search role widens the search
**ID**: SCN-INS-ADDR-042-A
- **GIVEN** an organisation holds one address matching a search term by its name and another holding the consignor role
- **WHEN** the list is asked for the term with the consignor search role
- **THEN** both addresses are returned
- **AND** with roles to keep, only the addresses holding one of them are returned

#### Scenario: An unknown search role is refused
**ID**: SCN-INS-ADDR-042-B
- **WHEN** the list is asked for a search role that is not one of the six
- **THEN** the service responds with a 400 error

### Requirement: Adding an address from the address book starts by choosing its address type
**ID**: REQ-INS-ADDR-043
The system MUST open 'Choose an address type' when the user chooses 'Add a new address', and MUST send a continued choice to the add form for a type that groups roles, to the add-a-transporter pages for 'Transporter', or back with 'Select an address type' for none. The chosen type MUST persist while the add is in progress, clearing on a new add or a save. The add form MUST reopen 'Choose an address type' and save nothing when reached or saved with no stored type it serves.

#### Scenario: The address type page offers the four types with their hints
**ID**: SCN-INS-ADDR-043-A
- **GIVEN** the user is on the address book
- **WHEN** they choose 'Add a new address'
- **THEN** 'Choose an address type' opens under the caption 'Add a new address', with a 'Continue' button and a 'Back' link to the address book
- **AND** the options are 'Origin or Consignor' with the hint 'Place of origin, Consignor', 'Destination, Consignee or Importer' with the hint 'Place of destination, Consignee, Importer', 'Transporter' with the hint 'Private, Commercial' and 'Branch' with the hint 'Branch address', in that order and with none chosen
- **AND** the options sit in a group whose legend repeats the heading for screen readers

#### Scenario: Continuing with no type chosen shows the problem on the options
**ID**: SCN-INS-ADDR-043-B
- **GIVEN** the user is on 'Choose an address type' with no type chosen
- **WHEN** they select 'Continue'
- **THEN** 'Select an address type' shows against the options and in a 'There is a problem' summary
- **AND** the summary link goes to the first option

#### Scenario: Choosing a type opens the add form
**ID**: SCN-INS-ADDR-043-C
- **GIVEN** the user is on 'Choose an address type'
- **WHEN** they choose 'Origin or Consignor', 'Destination, Consignee or Importer' or 'Branch' and select 'Continue'
- **THEN** the add form opens under the caption 'Add new address', headed 'Add address and contact details', with no status tag
- **AND** its 'Back' link goes to 'Choose an address type'

#### Scenario: Choosing Transporter opens the add-a-transporter pages instead of the add form
**ID**: SCN-INS-ADDR-043-I
- **GIVEN** the user is on 'Choose an address type'
- **WHEN** they choose 'Transporter' and select 'Continue'
- **THEN** the add-a-transporter pages open, not the address add form

#### Scenario: Opening or saving the add form with Transporter chosen opens the address type question and saves nothing
**ID**: SCN-INS-ADDR-043-J
- **GIVEN** 'Transporter' is the address type stored from an earlier visit to 'Choose an address type'
- **WHEN** the user opens the address add form directly, or posts a save to it
- **THEN** 'Choose an address type' opens instead
- **AND** nothing is saved

#### Scenario: The chosen type is remembered until a new add starts or the address is saved
**ID**: SCN-INS-ADDR-043-D
- **GIVEN** the user has chosen a type and opened the add form
- **WHEN** they select 'Back'
- **THEN** 'Choose an address type' shows the chosen type selected
- **WHEN** they go to the address book and choose 'Add a new address' again
- **THEN** no type is selected
- **WHEN** they save an address and choose 'Add a new address' again
- **THEN** no type is selected, and once one is chosen the add form's text fields are empty

#### Scenario: Opening the add form from the address book with no type chosen asks for the type first
**ID**: SCN-INS-ADDR-043-E
- **GIVEN** the user is signed in and has chosen no address type
- **WHEN** they open the add form outside a notification journey
- **THEN** 'Choose an address type' opens instead

#### Scenario: A notification journey's handshake opens the add form directly
**ID**: SCN-INS-ADDR-043-F
- **GIVEN** a trader on a notification's role picker
- **WHEN** they choose 'Add a new address'
- **THEN** the add form opens without 'Choose an address type'
- **AND** saving it hands the new address back to the notification

#### Scenario: Saving the add form from the address book with no type chosen asks for the type first
**ID**: SCN-INS-ADDR-043-G
- **GIVEN** the user is signed in, has chosen no address type, and has filled in a valid address and ticked a role on the add form
- **WHEN** they save it outside a notification journey
- **THEN** 'Choose an address type' opens instead
- **AND** no address is saved

#### Scenario: Going back after a refused save and choosing the type again shows what was entered
**ID**: SCN-INS-ADDR-043-H
- **GIVEN** the user has chosen 'Origin or Consignor', 'Destination, Consignee or Importer' or 'Branch', filled in the address and contact details with a malformed email address, ticked a role and saved the add form, which refuses the save
- **WHEN** they select 'Back', then choose the same type and select 'Continue'
- **THEN** the add form shows the address and contact details entered
- **AND** the role ticked is still ticked

### Requirement: Adding an address from the address book saves it with the roles ticked
**ID**: REQ-INS-ADDR-044
The system MUST, on the add form opened from the address book, follow the contact fields with a checkbox for each role of the chosen type, MUST require a role, checking it only once the address and contact fields are valid, and MUST offer every country for every type. A successful save MUST store the country chosen and the ticked roles the type offers, and return the user to the address book list on that type's tab with the new address first.

#### Scenario: Origin or Consignor offers Place of origin and Consignor after the contact fields
**ID**: SCN-INS-ADDR-044-A
- **GIVEN** the user has chosen 'Origin or Consignor' and opened the add form
- **THEN** the address and contact fields show straight away, with no address search
- **AND** after the contact fields come a section break and the question 'What can this address be used for?' with the hint 'Select where this address can be used'
- **AND** the question offers the checkboxes 'Place of origin' and 'Consignor', in that order, none ticked and neither with a hint

#### Scenario: Valid fields and no role ticked show the roles error linked to the first option
**ID**: SCN-INS-ADDR-044-B
- **GIVEN** the user has chosen any address type and filled in valid address and contact fields and ticked no role
- **WHEN** they save the form
- **THEN** 'Select what this address can be used for' shows against the question and in the 'There is a problem' summary
- **AND** the summary link goes to the first option

#### Scenario: An invalid field and no role ticked show both errors together
**ID**: SCN-INS-ADDR-044-C
- **GIVEN** the user has chosen any address type and left a mandatory field blank and ticked no role
- **WHEN** they save the form
- **THEN** the blank field's error and the roles error both show, against their questions and in the summary, in the order the page asks them

#### Scenario: Saving stores every ticked role, and a role the type does not offer is not stored
**ID**: SCN-INS-ADDR-044-D
- **GIVEN** the user has chosen 'Origin or Consignor' and filled in a valid address
- **WHEN** they tick 'Place of origin' and 'Consignor' and save
- **THEN** the address is stored with the roles place of origin and consignor, in that order
- **WHEN** a save also carries a role that 'Origin or Consignor' does not offer
- **THEN** that role is not stored

#### Scenario: Saving an address lands on its type's tab with the address first
**ID**: SCN-INS-ADDR-044-E
- **GIVEN** the user has chosen 'Origin or Consignor', 'Destination, Consignee or Importer' or 'Branch' and filled in a valid address with a role ticked
- **WHEN** they save the form
- **THEN** the address book list opens on the tab for that type, 'Origin and Consignor', 'Destination, Consignee and Importer' or 'Branch'
- **AND** the new address is listed first, with the labels of its roles as its Type

#### Scenario: Destination, Consignee or Importer offers its three roles and every country, opening on United Kingdom
**ID**: SCN-INS-ADDR-044-F
- **GIVEN** the user has chosen 'Destination, Consignee or Importer' and opened the add form
- **THEN** the address and contact fields show straight away, with no address search
- **AND** after the contact fields come a section break and the question 'Address type' with the hint 'Select where this address can be used'
- **AND** the question offers the checkboxes 'Place of destination', 'Consignee' and 'Importer', in that order, none ticked and none with a hint
- **AND** the Country select lists 'Select a country', then 'United Kingdom' and every country the reference data service serves, in alphabetical order, with 'United Kingdom' selected

#### Scenario: Branch offers the one role and every country, opening on United Kingdom
**ID**: SCN-INS-ADDR-044-G
- **GIVEN** the user has chosen 'Branch' and opened the add form
- **THEN** the address and contact fields show straight away, with no address search
- **AND** after the contact fields come a section break and the question 'Address type' with the hint 'Select where this address can be used'
- **AND** the question offers the checkbox 'Branch address' alone, not ticked and without a hint
- **AND** the Country select lists 'Select a country', then 'United Kingdom' and every country the reference data service serves, in alphabetical order, with 'United Kingdom' selected

#### Scenario: A Destination or Branch address is saved with the country chosen
**ID**: SCN-INS-ADDR-044-H
- **GIVEN** the user has chosen 'Destination, Consignee or Importer' or 'Branch', filled in a valid address and ticked a role
- **WHEN** they choose France and save the form
- **THEN** the address is stored with the country France

#### Scenario: A Destination or Branch address names only the missing name, postcode and phone number and keeps the country chosen
**ID**: SCN-INS-ADDR-044-I
- **GIVEN** the user has chosen 'Destination, Consignee or Importer' or 'Branch', opened the add form and chosen France
- **WHEN** they leave the name, postcode and phone number blank and save
- **THEN** the summary and each field show 'Enter a name or organisation', 'Enter a postcode or Zip code' and 'Enter a phone number'
- **AND** the Country select still has 'France' selected

### Requirement: An address added from a notification journey is saved with the role of the party it is for
**ID**: REQ-INS-ADDR-045
The system MUST save an address added from a role's picker with that role and every other role on the role's side that the trader ticked, and an address added from the consignment contact page with the branch address role.

#### Scenario: An address added from a role's picker or the consignment contact page is saved with that party's role
**ID**: SCN-INS-ADDR-045-A
- **GIVEN** a trader on the add page reached from the place of origin, consignor, consignee, importer or place of destination picker
- **WHEN** they save a valid address with nothing ticked
- **THEN** the address is saved with exactly that role
- **WHEN** a trader saves a valid address from the consignment contact page
- **THEN** the address is saved with the branch address role

#### Scenario: A role's save carries the other roles on its side that were ticked
**ID**: SCN-INS-ADDR-045-B
- **GIVEN** a trader on the add page reached from the consignee picker
- **WHEN** they tick 'Importer' and save a valid address
- **THEN** the address book's read of the saved address gives exactly the roles consignee and importer

#### Scenario: A posted role the role's page does not offer is not saved
**ID**: SCN-INS-ADDR-045-C
- **GIVEN** a trader on the add page reached from the consignee picker
- **WHEN** a role from outside the consignee's side is posted with a valid address
- **THEN** the address is saved with exactly the consignee role

### Requirement: The add page reached from a role picker asks what else the address should be used for, offering the other roles on its side
**ID**: REQ-INS-ADDR-046
The system MUST, on the add page reached from a role's picker, ask 'What else should this address be used for?' as a group of checkboxes after a visible section break, with a hint naming the role and offering only the other roles on the same side, none ticked. Ticking none MUST raise no error, and the ticked roles MUST stay ticked when the page is shown again with errors. The consignment contact page MUST NOT ask the question.

#### Scenario: The place of origin side offers the other role on its side
**ID**: SCN-INS-ADDR-046-A
- **GIVEN** a trader on a notification's place of origin picker
- **WHEN** they choose 'Add a new address'
- **THEN** the add page asks 'What else should this address be used for?' after a visible section break, with the hint 'This address is being added as a Place of origin address. Select any other roles or addresses this address should be used for.'
- **AND** it offers only 'Consignor', unticked
- **WHEN** they choose 'Add a new address' from the consignor picker
- **THEN** the hint reads 'This address is being added as a Consignor address. Select any other roles or addresses this address should be used for.' and it offers only 'Place of origin', unticked

#### Scenario: The destination side offers the other two roles on its side
**ID**: SCN-INS-ADDR-046-B
- **GIVEN** a trader on a notification's consignee, importer or place of destination picker
- **WHEN** they choose 'Add a new address'
- **THEN** the add page asks 'What else should this address be used for?' with a hint naming the role, 'a Consignee', 'an Importer' or 'a Place of destination'
- **AND** the consignee page offers 'Importer' then 'Place of destination', the importer page 'Consignee' then 'Place of destination', and the place of destination page 'Consignee' then 'Importer', all unticked

#### Scenario: Saving with nothing ticked raises no error
**ID**: SCN-INS-ADDR-046-C
- **GIVEN** a trader on the add page reached from a role's picker
- **WHEN** they save a valid address with none of the other roles ticked
- **THEN** no error is shown and the address is saved for the role it was added from alone

#### Scenario: The ticked roles stay ticked when the page is shown again with errors
**ID**: SCN-INS-ADDR-046-D
- **GIVEN** a trader on the add page reached from the consignee picker
- **WHEN** they tick 'Importer', leave the postcode blank and save
- **THEN** the page is shown again with the postcode error and 'Importer' still ticked

#### Scenario: The consignment contact page asks no such question
**ID**: SCN-INS-ADDR-046-E
- **GIVEN** a trader on the consignment contact page
- **WHEN** they choose to add a new address
- **THEN** the add page shows the address fields and no roles question

### Requirement: The address book's pagination links the first, current, neighbouring and last pages, with an ellipsis for each gap
**ID**: REQ-INS-ADDR-047
The system MUST show, under a list running past one page, a link to page 1, the current page and the page either side of it, and the last page, with an ellipsis wherever page numbers are skipped, and no other page links. It MUST offer 'Previous' except on the first page and 'Next' except on the last page. A list of three pages or fewer MUST show every page number with no ellipsis.

#### Scenario: A middle page shows its neighbours between the first and last pages
**ID**: SCN-INS-ADDR-047-A
- **GIVEN** the address book runs to 20 pages
- **WHEN** the user views page 10
- **THEN** the pagination shows 'Previous', page 1, an ellipsis, pages 9, 10 and 11, an ellipsis, page 20 and 'Next', with page 10 marked as the current page

#### Scenario: The first and last pages show their one neighbour and the far end
**ID**: SCN-INS-ADDR-047-B
- **GIVEN** a search matches five pages of addresses
- **WHEN** the user submits it
- **THEN** the pagination shows pages 1 and 2, an ellipsis, page 5 and 'Next', with no 'Previous', and page 1 marked as the current page
- **WHEN** they follow page 5
- **THEN** the pagination shows 'Previous', page 1, an ellipsis and pages 4 and 5, with no 'Next', and page 5 marked as the current page

#### Scenario: A list of three pages shows every page number
**ID**: SCN-INS-ADDR-047-C
- **GIVEN** the address book runs to three pages
- **WHEN** the user views any of them
- **THEN** the pagination shows pages 1, 2 and 3 with no ellipsis

#### Scenario: A page next to the last shows its neighbours and the last page with no ellipsis between them
**ID**: SCN-INS-ADDR-047-D
- **GIVEN** a search matches five pages of addresses
- **WHEN** the user views page 4 of the matches
- **THEN** the pagination shows page 1, an ellipsis and pages 3, 4 and 5, with page 4 marked as the current page, and the list reads 'Showing 25-32' against the number of matches
