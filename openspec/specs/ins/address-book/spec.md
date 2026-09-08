# Address Book Specification

## Purpose

The INS address book itself — adding, editing and deleting records, and how they are shared within an organisation.

## Requirements

### Requirement: An address is shared across every user in the organisation that added it
The system MUST make an address visible to every user in the organisation that added it, not only the user who added it.

#### Scenario: An address added by one user is visible to a colleague in the same organisation
- **GIVEN** one user has added an address to their organisation's address book
- **WHEN** another user in that same organisation opens the address book
- **THEN** the address is listed for them too

### Requirement: Deleting an address tombstones it rather than removing it, and the tombstone is invisible to every user in the organisation
The system MUST remove a deleted address from the list and from search for every user in the organisation, while keeping the record retrievable by its own id, marked deleted, so nothing that already references it is left dangling.

#### Scenario: A deleted address is removed from the list but not destroyed
- **GIVEN** an address exists
- **WHEN** the user deletes it through the address book
- **THEN** it no longer appears in the address book list
- **AND** the record can still be retrieved directly by its own id, marked as deleted, with its details intact

#### Scenario: A deletion by one user removes the address for every user in the organisation
- **GIVEN** an address exists in an organisation's address book
- **WHEN** one user deletes it
- **THEN** it no longer appears in the address book list for any other user in that organisation

### Requirement: Editing an address replaces the whole record, clearing any optional field left blank
The system MUST replace an address's entire record on edit, so an optional field left blank in the edit is cleared, not left holding its previous value, and MUST show the edited address under its new name in the list, in place of the old one.

#### Scenario: Leaving an optional field blank on edit clears it
- **GIVEN** an address has an optional field filled in (for example, a county)
- **WHEN** the user edits the address and leaves that field blank
- **THEN** the stored record no longer holds a value for that field

#### Scenario: A renamed address replaces the old one in the list
- **GIVEN** an address exists under one name
- **WHEN** the user edits it to a new name
- **THEN** the address book list shows the new name, and no longer shows the old one

### Requirement: A newly created address persists its full set of details
The system MUST persist every field entered for a new address, including its optional ones.

#### Scenario: Every field entered when creating an address is persisted
- **GIVEN** the user creates an address, filling in every field including the optional ones (such as address line 2 and county)
- **WHEN** the stored record is checked
- **THEN** it holds every field exactly as entered

### Requirement: The add and edit forms ask for the same Standard Address Block, with two fields optional
The system MUST ask for name, address line 1, town or city, postcode, country, phone number and email address as mandatory, and address line 2 and county as optional, on both the add and the edit form, and MUST hint that an international phone number should include its country code.

#### Scenario: The add form asks for every field, marking address line 2 and county optional
- **GIVEN** the user opens the add address form
- **WHEN** the page is shown
- **THEN** every field is asked for, with address line 2 and county labelled optional
- **AND** the country field offers a populated list of countries
- **AND** a hint explains that an international phone number should include its country code

### Requirement: A mandatory field left blank blocks the save, naming and focusing it
The system MUST block the save when a mandatory field is left blank, MUST show an error naming which field, and MUST focus that field when the error is followed, without discarding anything entered elsewhere on the form.

#### Scenario: Leaving a mandatory field blank on add blocks the save
- **GIVEN** the user is adding an address with every other field validly filled in
- **WHEN** they leave a mandatory field blank and save
- **THEN** the save is blocked, an error names the blank field, and following it focuses that field
- **AND** the values entered for every other field are still shown

#### Scenario: Clearing a mandatory field on edit blocks the save
- **GIVEN** the user is editing an address and has changed a second field at the same time
- **WHEN** they clear a mandatory field and save
- **THEN** the save is blocked, an error names the cleared field
- **AND** the other field's new value is still shown, not the value the record held before editing

### Requirement: Every field has a maximum length, and exceeding it blocks the save without losing the value
The system MUST reject a value exceeding a field's maximum length — 255 characters for name, address line 1 and address line 2; 100 for town or city and county; 12 for postcode; 20 for phone number; 254 for email address — naming the limit in the error, and MUST preserve the over-length value so the user can edit it down rather than retype it.

#### Scenario: A field over its maximum length blocks the save with the value preserved
- **GIVEN** the user enters a value longer than a field's maximum length
- **WHEN** they save
- **THEN** the save is blocked, an error names the field and its character limit
- **AND** the over-length value is still shown in the field

### Requirement: An email address must be in a valid format
The system MUST reject an email address that is not validly formatted, with an error distinct from the one shown for a blank email field, and MUST preserve the entered value.

#### Scenario: A malformed email address is rejected
- **GIVEN** the user enters an email address that is not validly formatted
- **WHEN** they save
- **THEN** the save is blocked, an error explains the email address must be in the correct format
- **AND** the entered value is still shown

### Requirement: Saving a new or edited address shows a confirmation naming it
The system MUST return the user to the address book list on a successful save, and MUST show a confirmation naming the address and stating whether it was added or updated.

#### Scenario: Adding an address confirms it and lists it
- **GIVEN** the user has filled in a valid new address
- **WHEN** they save it
- **THEN** they return to the address book, a confirmation names the address as added
- **AND** the new address is listed

#### Scenario: Editing an address's name confirms it under its new name
- **GIVEN** the user edits an address, changing its name
- **WHEN** they save it
- **THEN** they return to the address book, a confirmation names the address as updated
- **AND** the address is offered for viewing under its new name, no longer under the old one

### Requirement: Cancelling the add or edit form discards changes and returns to the address book
The system MUST discard anything entered on the add or edit form when the user cancels, and MUST return them to the address book list without saving.

#### Scenario: Cancelling add discards the form without creating an address
- **GIVEN** the user has typed into the add address form without saving
- **WHEN** they cancel
- **THEN** they return to the address book, and nothing they typed appears anywhere in it

#### Scenario: Cancelling edit discards the changes, leaving the stored address as it was
- **GIVEN** the user has changed a field on an existing address without saving
- **WHEN** they cancel
- **THEN** they return to the address book, the change is discarded, and the address is still offered for viewing under its original name

### Requirement: Deleting an address asks for confirmation, naming the address, before it is removed
The system MUST ask the user to confirm before deleting an address, naming the address in the question, and MUST leave the address untouched if the user cancels instead of confirming.

#### Scenario: Delete confirmation names the address and can be backed out of
- **GIVEN** the user opens the delete confirmation for an address
- **WHEN** the page is shown
- **THEN** it asks the user to confirm deleting that named address, with a way back to its details

#### Scenario: Cancelling the delete confirmation leaves the address untouched
- **GIVEN** the user is on an address's delete confirmation
- **WHEN** they cancel instead of confirming
- **THEN** they return to that address's own details, and it is still listed in the address book

#### Scenario: Confirming deletion removes the address and confirms it
- **GIVEN** the user is on an address's delete confirmation
- **WHEN** they confirm the deletion
- **THEN** they return to the address book, a confirmation names the address as deleted
- **AND** it is no longer offered for viewing

### Requirement: The address book list shows each address's key details, with a way to view, and a way to add one
The system MUST list each address's name, full postal address and country, MUST offer a way to open that address's own details, and MUST offer a way to add a new address, reachable from the service's navigation.

#### Scenario: The list renders each address's details, with columns and an add action
- **GIVEN** the user has addresses in their address book
- **WHEN** they view the address book
- **THEN** each address is listed with its name, full postal address and country
- **AND** an action to add a new address is offered

#### Scenario: Selecting an address from the list opens its own details page
- **GIVEN** the user is viewing the address book list
- **WHEN** they choose to view a listed address
- **THEN** that address's own details page opens, headed with its name

#### Scenario: The address book is reached from the service's navigation
- **GIVEN** the user is signed in
- **WHEN** they follow the Address book link in the navigation
- **THEN** the address book list opens

### Requirement: The list is paged once it holds more than one page of addresses
The system MUST page the address book list once it holds more than twenty-five addresses, showing the range currently displayed against the total.

#### Scenario: More than twenty-five addresses are shown across pages
- **GIVEN** an organisation's address book holds more than twenty-five addresses
- **WHEN** the user views the list
- **THEN** it shows the first twenty-five, reporting the range shown against the total
- **WHEN** they move to the next page
- **THEN** the remaining addresses are shown, with the range and total updated to match

### Requirement: An empty address book invites the user to add the first address
The system MUST show a message explaining the address book is empty, and MUST offer a way to add an address, when an organisation has none.

#### Scenario: No addresses shows an empty-state message and an add action
- **GIVEN** an organisation has no addresses
- **WHEN** the user views the address book
- **THEN** a message explains there are no addresses yet, and an action to add one is offered

### Requirement: Viewing an address lists the full Standard Address Block against its labels, and offers to edit or delete it
The system MUST show every field of an address against its label when viewed on its own page, including fields left blank, and MUST offer to edit or delete that address, and a way back to the list.

#### Scenario: The view page lists every field against its label, blank fields included
- **GIVEN** the user opens an address that has some optional fields left blank
- **WHEN** the page is shown
- **THEN** every field of the Standard Address Block is listed against its label, including the blank optional ones

#### Scenario: The view page offers to edit or delete the address being viewed
- **GIVEN** the user is viewing an address
- **WHEN** the page is shown
- **THEN** an action to edit and an action to delete that same address are both offered

#### Scenario: Back from the view page returns to the address book
- **GIVEN** the user is viewing an address
- **WHEN** they select Back
- **THEN** they return to the address book list
