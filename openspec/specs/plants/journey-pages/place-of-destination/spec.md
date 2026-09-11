# Place of Destination Page Specification

## Purpose

Asks where the consignment is going, or where it is being kept now, chosen from the organisation's address book. The page is titled "Place of destination".

## Requirements

### Requirement: The page asks its destination question under the heading and description the notification's state chooses
**ID**: REQ-PLANTS-PLACE-OF-DESTINATION-001
The system MUST ask the destination question under one of three headings with a matching description: "Intended destination" for potatoes and for plants or wood that have not yet arrived; or "Where is the consignment now?" once a plants or wood consignment has already arrived. The state MUST be read from the arrival answer on each render rather than stored with the destination.

#### Scenario: A not-yet-arrived plants or wood notification is asked for the intended destination
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-001-A
- **GIVEN** a plants or wood notification has answered that the consignment has not yet arrived
- **WHEN** the place of destination page loads
- **THEN** the heading is "Intended destination"
- **AND** the description explains where the goods will be kept after arrival for a plant health spot check

#### Scenario: An already-arrived plants or wood notification is asked where the consignment is now
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-001-B
- **GIVEN** a plants or wood notification has answered that the consignment has already arrived
- **WHEN** the place of destination page loads
- **THEN** the heading is "Where is the consignment now?"
- **AND** the description asks for the address where the consignment is being kept

#### Scenario: Changing the arrival answer re-asks the destination under the new sentence
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-001-C
- **GIVEN** a plants or wood notification is on the destination page under the intended-destination sentence
- **WHEN** the user changes the arrival answer to say the consignment has already arrived and reopens the destination page
- **THEN** the heading and description are the post-arrival ones

#### Scenario: A potatoes notification is asked for the intended destination
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-001-D
- **GIVEN** a potatoes notification has reached the place of destination
- **WHEN** the page loads
- **THEN** the heading is "Intended destination"
- **AND** the description explains where the goods will be kept after arrival for a plant health spot check

### Requirement: The page offers search of the organisation address book with a count of results
**ID**: REQ-PLANTS-PLACE-OF-DESTINATION-002
The system MUST offer a search of the organisation address book by name, address or country, MUST open on the first page of the whole book captioned with how many are shown against the total, and MUST say so rather than showing an empty table when nothing matches. Clearing the search MUST restore the whole book.

#### Scenario: The picker opens on the first page of the whole book with its count
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-002-A
- **GIVEN** the user opens the place of destination page
- **WHEN** the page loads
- **THEN** the first page of the organisation's address book is shown, captioned with how many are shown against the total

#### Scenario: Searching narrows the list to matching addresses
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-002-B
- **GIVEN** the user is on the place of destination page
- **WHEN** they search for a term matching some addresses
- **THEN** only those addresses are shown, captioned with the matching count

#### Scenario: A search matching nothing says so, and clearing restores the book
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-002-C
- **GIVEN** the user searches for a term matching no address
- **WHEN** the results are shown
- **THEN** a message says nothing matched, not an empty table
- **WHEN** they clear the search
- **THEN** the first page of the whole book is shown again

### Requirement: Results are paged five at a time, and a selection survives paging and search
**ID**: REQ-PLANTS-PLACE-OF-DESTINATION-003
The system MUST page the address results five at a time, MUST keep a checked row selected across a further search or a page change even when its own row is not on the page being shown, and MUST save the address chosen on a later page.

#### Scenario: A checked row survives a further search
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-003-A
- **GIVEN** the user has checked a row
- **WHEN** they search again with a term that would not list that row
- **THEN** the checked address is still shown as the current selection

#### Scenario: A row ticked on a later page is the one that saves
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-003-B
- **GIVEN** a search returns more than five matching addresses
- **WHEN** the user opens a later page, checks an address there and saves
- **THEN** that address is what the notification keeps
- **AND** reopening the page names it as selected even when its row is not on the first page of the whole book

### Requirement: A chosen address is accepted and replaces any previously saved one
**ID**: REQ-PLANTS-PLACE-OF-DESTINATION-004
The system MUST accept a chosen place of destination, saving it without error, MUST show it still chosen when the user returns, and MUST replace a previously saved address rather than keeping both.

#### Scenario: Choosing an address saves without error and is shown again on return
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-004-A
- **GIVEN** the user is on the place of destination page
- **WHEN** they choose an address and save and continue
- **THEN** the answer is saved and no error summary is shown
- **AND** returning to the page shows that address still chosen

#### Scenario: Saving a new choice replaces the old one
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-004-B
- **GIVEN** a place of destination is already saved
- **WHEN** the user chooses a different address and saves
- **THEN** the saved destination is the new one, and the old one is no longer associated

### Requirement: Saving with nothing chosen is refused
**ID**: REQ-PLANTS-PLACE-OF-DESTINATION-005
The system MUST refuse to save the page when nothing has been chosen, showing an error that names the missing place of destination, MUST focus the first row when results are shown, and MUST focus the search box when nothing matched.

#### Scenario: Saving with nothing chosen focuses the first row
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-005-A
- **GIVEN** the user is on the place of destination page with nothing chosen and results showing
- **WHEN** they save and continue
- **THEN** an error summary is shown
- **WHEN** they follow the error
- **THEN** the first row in the list is focused

#### Scenario: Saving with nothing found focuses the search box
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-005-B
- **GIVEN** the user has searched for a term matching no address
- **WHEN** they save and continue
- **THEN** an error summary is shown
- **WHEN** they follow the error
- **THEN** the search box is focused

### Requirement: Deleting the chosen address takes the answer off the notification
**ID**: REQ-PLANTS-PLACE-OF-DESTINATION-006
The system MUST treat a place of destination whose address-book record has since been deleted as never entered: the Overview task row MUST read not yet started, and the page MUST show no selected address. Live resolution of the record itself is governed by `plants/addresses`.

#### Scenario: Deleting the chosen record clears the destination on Overview and the page
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-006-A
- **GIVEN** a place of destination has been saved from the address book
- **WHEN** that address record is deleted from the organisation's address book
- **THEN** the Overview destination task row reads not yet started
- **AND** reopening the page shows no selected address

### Requirement: The page offers a full set of save controls and is reachable from Overview
**ID**: REQ-PLANTS-PLACE-OF-DESTINATION-007
The system MUST offer save-and-continue, save-and-return-to-overview and cancel-and-return-to-overview on this page, MUST return the user to Overview when they follow the back link, and MUST reach the page from the Overview destination task row.

#### Scenario: The page is reachable from the Overview destination row
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-007-A
- **GIVEN** the user is on Overview with a notification that has reached destination
- **WHEN** they open the destination task row
- **THEN** the place of destination page is shown

#### Scenario: Save and return to overview saves the address without continuing the journey
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-007-B
- **GIVEN** the user is on the place of destination page
- **WHEN** they choose an address and select save-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows that address still chosen

#### Scenario: Cancel and return to overview reaches Overview without saving
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-007-C
- **GIVEN** the user is on the place of destination page
- **WHEN** they choose an address and select cancel-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows no address chosen

#### Scenario: The back link opens Overview
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-007-D
- **GIVEN** the user is on the place of destination page
- **WHEN** they follow the back link
- **THEN** Overview is shown

### Requirement: Completing the destination completes the destination task row
**ID**: REQ-PLANTS-PLACE-OF-DESTINATION-008
The system MUST show the Overview destination task row as completed once a place of destination has been saved.

#### Scenario: Saving an address completes the destination row
**ID**: SCN-PLANTS-PLACE-OF-DESTINATION-008-A
- **GIVEN** the user has chosen a place of destination and saved
- **WHEN** they open Overview
- **THEN** the destination task row reads completed
