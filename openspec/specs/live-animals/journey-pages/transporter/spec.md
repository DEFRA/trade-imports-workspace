# Transporter Page Specification

## Purpose

**Maturity**: detailing

**Page**: transporters

Lists the organisation's own transporters, held in the address book, followed by the ones the service ships, letting the user choose one for the consignment or add a new one. The page is titled "Transporter details". Which transporter is required, and what adding one asks, is governed by `live-animals/journey-obligations/transporter`.

## Requirements

### Requirement: The list shows the organisation's own transporters ahead of the ones the service ships, in headed columns, with a status tag
**ID**: REQ-TRANSPORTER-001
The system MUST list the organisation's own transporters, held in the address book, followed by the ones the service ships, each row showing its name, address, approval number ("Not applicable" for a transporter with none), type, and a status tag — green for "Approved", magenta for "New" — under columns headed to match, alongside a radio to choose it.

#### Scenario: The list shows every transporter's key facts under the right column
**ID**: SCN-TRANSPORTER-001-A
- **GIVEN** the user has reached the transporter list
- **WHEN** the page loads
- **THEN** every known transporter is shown as a row under columns headed Name, Address, Approval number, Type and Status
- **AND** a transporter with no approval number reads "Not applicable" in that column

#### Scenario: An approved transporter is tagged green, a newly added one magenta
**ID**: SCN-TRANSPORTER-001-B
- **GIVEN** the transporter list is shown
- **WHEN** a row is for a transporter already approved
- **THEN** it carries a green "Approved" tag
- **WHEN** a row is for a transporter added but not yet approved
- **THEN** it carries a magenta "New" tag

#### Scenario: A transporter the organisation added through the address book is on the list and can be picked
**ID**: SCN-TRANSPORTER-001-C
- **GIVEN** the organisation has added a transporter through the address book
- **WHEN** the user opens the transporter list on their next notification
- **THEN** that transporter is shown as a row, tagged "New"
- **AND** the user can choose it and save

### Requirement: After adding a transporter, the list shows it as the first row, already chosen, under a one-time success banner
**ID**: REQ-TRANSPORTER-007
The system MUST, after the user saves a complete transporter from either add form, return them to the transporter list with the added transporter as its first row and its radio already checked, under a notification banner titled "Success" reading the transporter's name — with only its first letter capitalised — followed by " transporter added". The system MUST show that banner on that one view of the list only: reloading the list, or returning to it later, MUST show the list without it.

#### Scenario: The list returns with the added transporter first, checked, and names it in the banner
**ID**: SCN-TRANSPORTER-007-A
- **GIVEN** the user has saved a complete private or commercial transporter from its add form
- **WHEN** the save lands back on the transporter list
- **THEN** the added transporter is the first row shown, with its radio checked
- **AND** a success notification banner titled "Success" reads the transporter's name, with only its first letter capitalised, followed by " transporter added"

#### Scenario: Reloading the list, or returning to it later, shows it with no banner
**ID**: SCN-TRANSPORTER-007-B
- **GIVEN** the transporter list has just shown the added-transporter banner
- **WHEN** the user reloads the list, or leaves and comes back to it later
- **THEN** the list is shown with no banner

### Requirement: The list can be searched by name, address, approval number, type or status, narrowing as the user types
**ID**: REQ-TRANSPORTER-002
The system MUST offer a labelled search over the transporter list, hinted with what it matches and run from a button named "Search". It MUST narrow the list to transporters matching the term by name, address, approval number, type or status, ignoring case and accents, as the user types when JavaScript is on, and MUST show a message rather than an empty table when nothing matches. A transporter with no approval number MUST be matched by the words its Approval number column shows.

#### Scenario: Searching narrows the list by name, address, approval number, type or status
**ID**: SCN-TRANSPORTER-002-A
- **GIVEN** the user is on the transporter list
- **WHEN** they search by a transporter's name, its address, its approval number, its type or its status
- **THEN** only the matching transporters are shown

#### Scenario: A search matching nothing says so, rather than showing an empty table
**ID**: SCN-TRANSPORTER-002-B
- **GIVEN** the user searches the transporter list for a term matching no transporter
- **WHEN** the results are shown
- **THEN** a message says nothing matched, not an empty table

#### Scenario: Typing narrows the list in place with bold matches and an announced count
**ID**: SCN-TRANSPORTER-002-C
- **GIVEN** the user is on the transporter list with JavaScript on
- **WHEN** they type the plain letters "garcia" into the search box
- **THEN** only the transporter named "García Livestock Transport SL" is shown, with the letters "García" in bold
- **AND** the page does not reload and the search box keeps focus
- **AND** the number of transporters shown is announced
- **WHEN** they press the "Search" button or Enter and then type a term matching another transporter
- **THEN** that transporter is shown

#### Scenario: A transporter chosen before filtering stays chosen when filtered out of view
**ID**: SCN-TRANSPORTER-002-D
- **GIVEN** the user has chosen a transporter on the list with JavaScript on
- **WHEN** they type a term that filters that transporter out of view and save
- **THEN** the transporter they chose is the one saved

#### Scenario: Without JavaScript the button or Enter narrows the list on the server
**ID**: SCN-TRANSPORTER-002-E
- **GIVEN** the user is on the transporter list with JavaScript off
- **WHEN** they enter a term and press the "Search" button or Enter
- **THEN** the list comes back narrowed to the matching transporters
- **AND** the search box still holds the term

#### Scenario: Searching for the words shown where a transporter has no approval number leaves exactly those transporters
**ID**: SCN-TRANSPORTER-002-F
- **GIVEN** the user is on the transporter list
- **WHEN** they search for the words the Approval number column shows for a transporter without one
- **THEN** only the transporters with no approval number are shown
- **WHEN** they search for a real approval number instead
- **THEN** only the transporter it belongs to is shown

### Requirement: The page explains that only a DAERA-authorised transporter is valid, not an EU-authorised one
**ID**: REQ-TRANSPORTER-003
The system MUST tell the user that a transporter authorisation issued by DAERA or APHA is required for transporting live vertebrate animals in, to, from or through Great Britain on journeys over 65 km as part of an economic activity, MUST tell them that documents issued by DAERA are valid for use in GB and that documents issued by any EU member state are not, and MUST offer a link to further guidance.

#### Scenario: The list carries the full authorisation guidance and a link to more detail
**ID**: SCN-TRANSPORTER-003-A
- **GIVEN** the user is on the transporter list
- **WHEN** they read the guidance
- **THEN** it states when a transporter authorisation is required, that DAERA authorisation is valid and EU authorisation is not
- **AND** a link is offered to further guidance

### Requirement: The list offers Add a transporter beside the search, above the transporter choices
**ID**: REQ-TRANSPORTER-004
The system MUST offer "Add a transporter" on the same row as the search, above the list and before the transporter choices in page order, and it MUST open "Choose a transporter type".

#### Scenario: Add a transporter sits beside the search and opens the transporter type question
**ID**: SCN-TRANSPORTER-004-A
- **GIVEN** the user is on the transporter list
- **WHEN** the page loads
- **THEN** "Add a transporter" is shown on the search row, above the list of transporters
- **AND** pressing Tab from the search box reaches the "Search" button, then "Add a transporter", then the transporter choices
- **WHEN** they choose "Add a transporter"
- **THEN** the "Choose a transporter type" page opens

### Requirement: The page names the choice once, above the search and the list
**ID**: REQ-TRANSPORTER-005
The system MUST show a heading "Select a transporter" above the search box and the transporter choices, and MUST offer the choices as one group with that same name for screen readers.

#### Scenario: The heading and the group share the one name
**ID**: SCN-TRANSPORTER-005-A
- **GIVEN** the user is on the transporter list
- **WHEN** the page loads
- **THEN** "Select a transporter" is shown once as a heading above the search box and the table
- **AND** the transporter choices are offered as one group named "Select a transporter"

### Requirement: The page has no serious or critical accessibility violations, in its plain state and with a refused pick
**ID**: REQ-TRANSPORTER-006
The system MUST show the transporter list with no serious or critical accessibility violations against the WCAG 2.0, 2.1 and 2.2 A and AA rules, both with nothing chosen and with a submitted pick that is not on the list refused.

#### Scenario: The list has no serious or critical accessibility violations, plain or with a refused pick
**ID**: SCN-TRANSPORTER-006-A
- **GIVEN** the user is on the transporter list with nothing chosen
- **WHEN** the page loads
- **THEN** the page has no serious or critical accessibility violations
- **WHEN** the user submits a transporter that is not on the list
- **THEN** the page, now showing the error summary and the in-fieldset error message, has no serious or critical accessibility violations

### Requirement: Each row ends with a "View details" link to that transporter's record, whose Back returns to this list
**ID**: REQ-TRANSPORTER-008
The system MUST end every row of the transporter list with a "View details" link whose visually hidden text names that transporter. For a transporter the organisation added through the address book, following that link MUST open that transporter's record, whose Back link MUST return to this same transporter list. For a transporter the service ships, which has no address book record, following that link MUST return the user to this same transporter list.

#### Scenario: Every row carries a named "View details" link
**ID**: SCN-TRANSPORTER-008-A
- **GIVEN** the user is on the transporter list
- **WHEN** the page loads
- **THEN** every row ends with a "View details" link whose visually hidden text names that row's own transporter

#### Scenario: Following it shows the record; Back returns to this list
**ID**: SCN-TRANSPORTER-008-B
- **GIVEN** the user has added a transporter through the address book
- **WHEN** they follow its "View details" link
- **THEN** a page headed with that transporter's name shows its record
- **AND** following its Back link returns to this same transporter list

### Requirement: A transporter must be chosen
**ID**: REQ-TRANSPORTER-009
The system MUST refuse either save control when no transporter is chosen, keeping the user on the list with the message "Select a transporter from the list" in a "There is a problem" summary linking to the first transporter option and shown inline above the table, and MUST leave the notification's transporter unchanged.

#### Scenario: Continuing with nothing chosen is refused
**ID**: SCN-TRANSPORTER-009-A
- **GIVEN** the user is on the transporter list
- **WHEN** they press "Save and continue" with nothing chosen
- **THEN** they stay on the list with "Select a transporter from the list" in a "There is a problem" summary linking to the first transporter option and shown inline above the table

#### Scenario: Returning to overview with nothing chosen is refused the same way
**ID**: SCN-TRANSPORTER-009-B
- **GIVEN** the user is on the transporter list
- **WHEN** they press "Save and return to overview" with nothing chosen
- **THEN** they stay on the list with the same summary and the same inline error
- **AND** the notification's transporter is left as it was

### Requirement: The back link returns to where the user came from, and an Add a transporter round trip keeps it
**ID**: REQ-TRANSPORTER-010
The system MUST return the user, when they follow the back link from the transporter list, to the page they saved and continued from, to Overview when they opened the list from its Overview task, and to the review when they opened it from a Change link on the review, as `live-animals/journey-flow` describes. Choosing "Add a transporter" and coming back to the list MUST leave that back link as it was.

#### Scenario: The back link opens the page before after Save and continue there
**ID**: SCN-TRANSPORTER-010-A
- **GIVEN** the user reached the transporter list by saving and continuing from the page before it
- **WHEN** they follow the back link
- **THEN** that page is shown

#### Scenario: The back link opens Overview when the list was opened from Overview
**ID**: SCN-TRANSPORTER-010-B
- **GIVEN** the user opened the transporter list from its task on Overview
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: The back link opens the review when the list was opened from a Change link
**ID**: SCN-TRANSPORTER-010-C
- **GIVEN** the review of a draft notification
- **WHEN** the user follows the Change link that opens the transporter list and then the back link
- **THEN** the review is shown

#### Scenario: Adding a transporter keeps the list's back link
**ID**: SCN-TRANSPORTER-010-D
- **GIVEN** the user opened the transporter list from a Change link on the review and chose "Add a transporter"
- **WHEN** they follow the back link on the type question and then the back link on the list
- **THEN** the review is shown
